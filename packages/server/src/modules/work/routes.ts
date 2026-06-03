import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { optionalAuth, requireAuth } from '../../common/middleware/auth.js'
import { requireRole } from '../../common/middleware/rbac.js'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@sao/shared'
import { createWorkSchema, createCommentSchema, createReportSchema } from '@sao/shared'
import { z } from 'zod'
import { sanitizeRichContent } from '../../common/utils/content-sanitize.js'
import {
  calculatePublicHotScore,
  extractHotTagsFromWorks,
  getPublicRecommendationScore,
  isEligibleForPublicDiscovery,
} from '../../common/utils/public-work-discovery.js'
import {
  applyInteractionDelta,
  createInteractionNotification,
  recalculateUserInteractionStats,
} from '../engagement/service.js'
import { autoApproveExpiredPendingWorks } from './auto-approve.js'

// --- Additional validation schemas ---

const updateWorkSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  summary: z.string().max(500).optional(),
  content: z.string().optional(),
  tags: z.array(z.string().max(20)).max(10).optional(),
  images: z.array(z.string().min(1)).max(20).optional(),
  coverImage: z.string().optional(),
  visibility: z.enum(['VISIBLE']).optional(),
  draftSizeBytes: z.number().int().min(0).max(500 * 1024 * 1024).optional(),
})

const creatorStatusSchema = z.enum(['DRAFT', 'PENDING', 'REJECTED', 'PUBLISHED'])
const batchDeleteWorksSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
})
const draftSaveSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.enum(['ILLUSTRATION', 'NOVEL', 'OTHER']),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  summary: z.string().max(500).optional(),
  content: z.string().optional(),
  tags: z.array(z.string().max(20)).max(10).optional(),
  coverImage: z.string().optional(),
  images: z.array(z.string().min(1)).max(20).optional(),
  draftSizeBytes: z.number().int().min(0).max(500 * 1024 * 1024),
})

const MAX_DRAFT_COUNT = 20

function hasClientProvidedStatus(body: unknown): boolean {
  return typeof body === 'object' && body !== null && 'status' in body
}

function buildKeywordTerms(keyword: string): string[] {
  const normalized = keyword.trim().replace(/\s+/g, ' ')
  if (!normalized) return []

  const termSet = new Set<string>()
  termSet.add(normalized)

  for (const part of normalized.split(' ')) {
    const clean = part.trim()
    if (clean) termSet.add(clean)
  }

  const compact = normalized.replace(/\s+/g, '')
  if (compact) termSet.add(compact)

  return Array.from(termSet).filter((term) => term.length > 0)
}

function buildKeywordWhere(keywordTerms: string[]): Prisma.WorkWhereInput | null {
  if (keywordTerms.length === 0) return null

  return {
    OR: [
      ...keywordTerms.flatMap((term) => ([
        { title: { contains: term, mode: 'insensitive' as const } },
        { description: { contains: term, mode: 'insensitive' as const } },
        { author: { nickname: { contains: term, mode: 'insensitive' as const } } },
      ])),
      { tags: { hasSome: keywordTerms } },
    ],
  }
}

function containsTerm(value: string | null | undefined, term: string): boolean {
  if (!value) return false
  return value.toLowerCase().includes(term.toLowerCase())
}

function matchesWorkKeyword(
  work: {
    title: string
    description: string | null
    tags: string[]
    author: { nickname: string }
  },
  keywordTerms: string[],
): boolean {
  if (keywordTerms.length === 0) return true

  return keywordTerms.some((term) => (
    containsTerm(work.title, term)
    || containsTerm(work.description, term)
    || containsTerm(work.author.nickname, term)
    || work.tags.some((tag) => containsTerm(tag, term))
  ))
}

function scoreWorkKeyword(
  work: {
    title: string
    description: string | null
    tags: string[]
    author: { nickname: string }
  },
  keywordTerms: string[],
): number {
  return keywordTerms.reduce((score, term) => {
    let next = score

    if (containsTerm(work.title, term)) next += 12
    if (containsTerm(work.tags.join(' '), term)) next += 8
    if (containsTerm(work.author.nickname, term)) next += 6
    if (containsTerm(work.description, term)) next += 3

    return next
  }, 0)
}

const SENSITIVE_WORDS = ['傻逼', '操你', '去死', '法轮功', '台独', '港独']

function sanitizeCommentContent(input: string): string {
  let output = input
  for (const word of SENSITIVE_WORDS) {
    const pattern = new RegExp(word, 'gi')
    output = output.replace(pattern, '*'.repeat(word.length))
  }
  return output
}

async function assertDraftLimit(authorId: string, excludeWorkId?: string): Promise<void> {
  const count = await prisma.work.count({
    where: {
      authorId,
      status: 'DRAFT',
      deletedAt: null,
      ...(excludeWorkId ? { id: { not: excludeWorkId } } : {}),
    },
  })
  if (count >= MAX_DRAFT_COUNT) {
    const error = new Error(`Draft limit exceeded: max ${MAX_DRAFT_COUNT}`)
    Object.assign(error, { code: 'DRAFT_LIMIT_EXCEEDED' })
    throw error
  }
}

// --- Route handler ---

export async function workRoutes(fastify: FastifyInstance): Promise<void> {
  // ===================== Public routes =====================

  /**
   * GET /api/works
   * List PUBLISHED + VISIBLE works, filter by type/tag/search/sort(hot/new/recommended)
   */
  fastify.get('/api/works', async (request, reply) => {
    await autoApproveExpiredPendingWorks()

    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(query.pageSize || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    )
    const sort = query.sort || 'new'
    const type = query.type?.toUpperCase()
    const tag = query.tag?.trim()
    const keyword = (query.q || query.search || query.keyword || '').trim()
    const curatedOnly = query.curated !== 'false' && query.curated !== '0'
    const keywordTerms = buildKeywordTerms(keyword)

    const VALID_TYPES = ['ILLUSTRATION', 'NOVEL', 'OTHER'] as const

    const where: Prisma.WorkWhereInput = {
      status: 'PUBLISHED',
      visibility: 'VISIBLE',
      deletedAt: null,
    }
    if (type && VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      where.type = type as (typeof VALID_TYPES)[number]
    }
    if (tag) {
      where.tags = { has: tag }
    }

    const shouldFilterByKeyword = keywordTerms.length > 0
    const keywordWhere = buildKeywordWhere(keywordTerms)

    const findManyBase = {
      where,
      include: {
        author: {
          select: { id: true, nickname: true, avatar: true },
        },
        _count: { select: { comments: true } },
      },
    } satisfies Pick<Prisma.WorkFindManyArgs, 'where' | 'include'>

    if (shouldFilterByKeyword) {
      const candidateWorks = keywordWhere
        ? await prisma.work.findMany({
            where: {
              ...where,
              AND: [keywordWhere],
            },
            include: {
              author: {
                select: { id: true, nickname: true, avatar: true },
              },
              _count: { select: { comments: true } },
            },
          })
        : []

      const sourceWorks = candidateWorks.length > 0
        ? candidateWorks
        : await prisma.work.findMany(findManyBase)

      const filteredWorks = sourceWorks
        .filter((work) => matchesWorkKeyword(work, keywordTerms))
        .map((work) => ({
          ...work,
          _keywordScore: scoreWorkKeyword(work, keywordTerms),
          _recommendationScore: getPublicRecommendationScore(work),
        }))

      const visibleWorks = curatedOnly && (sort === 'recommended' || sort === 'hot')
        ? filteredWorks.filter((work) => isEligibleForPublicDiscovery(work))
        : filteredWorks

      const sortedWorks = visibleWorks.sort((left, right) => {
        if (sort === 'hot') {
          return calculatePublicHotScore(right) - calculatePublicHotScore(left)
        }

        if (sort === 'recommended') {
          if (right._keywordScore !== left._keywordScore) {
            return right._keywordScore - left._keywordScore
          }
          return right._recommendationScore - left._recommendationScore
        }

        if (right._keywordScore !== left._keywordScore) {
          return right._keywordScore - left._keywordScore
        }
        return right.createdAt.getTime() - left.createdAt.getTime()
      })

      const total = sortedWorks.length
      const data = sortedWorks
        .slice((page - 1) * pageSize, page * pageSize)
        .map(({ _keywordScore, _recommendationScore, ...work }) => work)

      return reply.send({ data, total, page, pageSize })
    }

    if (sort === 'hot') {
      const works = await prisma.work.findMany(findManyBase)

      const worksWithScore = works
        .filter((work) => !curatedOnly || isEligibleForPublicDiscovery(work))
        .map((work) => ({ ...work, _hotScore: calculatePublicHotScore(work) }))
        .sort((left, right) => right._hotScore - left._hotScore)

      const total = worksWithScore.length
      const data = worksWithScore
        .slice((page - 1) * pageSize, page * pageSize)
        .map(({ _hotScore, ...work }) => work)
      return reply.send({ data, total, page, pageSize })
    }

    if (sort === 'recommended') {
      const works = await prisma.work.findMany(findManyBase)

      const rankedWorks = works
        .filter((work) => !curatedOnly || isEligibleForPublicDiscovery(work))
        .map((work) => ({
          ...work,
          _recommendationScore: getPublicRecommendationScore(work),
        }))
        .sort((left, right) => right._recommendationScore - left._recommendationScore)

      const total = rankedWorks.length
      const data = rankedWorks
        .slice((page - 1) * pageSize, page * pageSize)
        .map(({ _recommendationScore, ...work }) => work)

      return reply.send({ data, total, page, pageSize })
    }

    const [works, total] = await Promise.all([
      prisma.work.findMany({
        ...findManyBase,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.work.count({ where }),
    ])

    return reply.send({
      data: works,
      total,
      page,
      pageSize,
    })
  })

  fastify.get('/api/works/tags/hot', async (_request, reply) => {
    await autoApproveExpiredPendingWorks()

    const works = await prisma.work.findMany({
      where: {
        status: 'PUBLISHED',
        visibility: 'VISIBLE',
        deletedAt: null,
      },
      select: {
        title: true,
        description: true,
        content: true,
        coverImage: true,
        tags: true,
        likeCount: true,
        favoriteCount: true,
        viewCount: true,
        createdAt: true,
        _count: { select: { comments: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 120,
    })

    const tags = extractHotTagsFromWorks(
      works.filter((item) => isEligibleForPublicDiscovery(item)),
      12,
    )

    return reply.send({ data: tags })
  })

  fastify.get('/api/works/:id/related', async (request, reply) => {
    await autoApproveExpiredPendingWorks()

    const { id } = request.params as { id: string }
    const limit = Math.min(8, Math.max(1, Number((request.query as Record<string, string>).limit || 4)))

    const currentWork = await prisma.work.findFirst({
      where: {
        id,
        status: 'PUBLISHED',
        visibility: 'VISIBLE',
        deletedAt: null,
      },
      select: {
        id: true,
        type: true,
        tags: true,
      },
    })

    if (!currentWork) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Work not found',
      })
    }

    const candidateWorks = await prisma.work.findMany({
      where: {
        id: { not: id },
        status: 'PUBLISHED',
        visibility: 'VISIBLE',
        deletedAt: null,
        OR: [
          ...(currentWork.tags.length > 0 ? [{ tags: { hasSome: currentWork.tags } }] : []),
          { type: currentWork.type },
        ],
      },
      include: {
        author: {
          select: { id: true, nickname: true, avatar: true },
        },
        _count: { select: { comments: true } },
      },
      take: 30,
    })

    const data = candidateWorks
      .filter((item) => isEligibleForPublicDiscovery(item))
      .map((item) => {
        const sharedTagCount = item.tags.filter((tag) => currentWork.tags.includes(tag)).length
        return {
          ...item,
          _relatedScore: getPublicRecommendationScore(item) + sharedTagCount * 14 + (item.type === currentWork.type ? 8 : 0),
        }
      })
      .sort((left, right) => right._relatedScore - left._relatedScore)
      .slice(0, limit)
      .map(({ _relatedScore, ...item }) => item)

    return reply.send({ data })
  })

  /**
   * GET /api/works/:id
   * Work detail (increment view count)
   */
  fastify.get('/api/works/:id', { preHandler: [optionalAuth.preHandler] }, async (request, reply) => {
    await autoApproveExpiredPendingWorks()

    const { id } = request.params as { id: string }

    const work = await prisma.work.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: request.user
          ? [
              { status: 'PUBLISHED', visibility: 'VISIBLE' },
              { authorId: request.user.id },
            ]
          : [{ status: 'PUBLISHED', visibility: 'VISIBLE' }],
      },
      include: {
        author: {
          select: { id: true, nickname: true, avatar: true, bio: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { likes: true, favorites: true, comments: true } },
      },
    })

    if (!work) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Work not found',
      })
    }

    // Increment view count (fire-and-forget)
    prisma.work.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {})

    // Check if current user has liked/favorited
    let isLiked = false
    let isFavorited = false
    if (request.user) {
      const [likeRecord, favoriteRecord] = await Promise.all([
        prisma.like.findUnique({
          where: { userId_workId: { userId: request.user.id, workId: id } },
        }),
        prisma.favorite.findUnique({
          where: { userId_workId: { userId: request.user.id, workId: id } },
        }),
      ])
      isLiked = !!likeRecord
      isFavorited = !!favoriteRecord
    }

    return reply.send({
      data: { ...work, isLiked, isFavorited },
    })
  })

  // ===================== Auth-required routes =====================

  /**
   * POST /api/works
   * Create work (auth required, status is always PENDING)
   */
  fastify.post('/api/works', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    if (hasClientProvidedStatus(request.body)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Status cannot be set from client when creating a work',
      })
    }

    const parsed = createWorkSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const {
      characterTags: _characterTags,
      images = [],
      summary,
      coverImage,
      draftSizeBytes,
      ...workInput
    } = parsed.data

    const work = await prisma.$transaction(async (tx) => {
      const created = await tx.work.create({
        data: {
          authorId: request.user!.id,
          type: workInput.type,
          title: workInput.title,
          description: workInput.description ?? summary ?? null,
          content: workInput.content ? sanitizeRichContent(workInput.content) : null,
          coverImage: coverImage ?? images[0] ?? null,
          tags: workInput.tags ?? [],
          status: 'PENDING',
          draftSizeBytes: draftSizeBytes ?? 0,
        },
      })

      if (images.length > 0) {
        await tx.workImage.createMany({
        data: images.map((imageUrl: string, index: number) => ({
            workId: created.id,
            imageUrl,
            sortOrder: index,
          })),
        })
      }

      return created
    })

    return reply.code(201).send({ data: work })
  })

  /**
   * PUT /api/works/:id
   * Update work (auth required, only author, only DRAFT/PENDING)
   */
  fastify.put('/api/works/:id', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    if (hasClientProvidedStatus(request.body)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Status cannot be set from client when updating a work',
      })
    }

    const { id } = request.params as { id: string }

    const work = await prisma.work.findUnique({
      where: { id },
      select: { authorId: true, status: true, deletedAt: true },
    })

    if (!work || work.deletedAt) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Work not found',
      })
    }

    if (work.authorId !== request.user!.id && request.user!.role !== 'ADMIN') {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only the author can update this work',
      })
    }

    if (work.status !== 'DRAFT' && work.status !== 'PENDING' && work.status !== 'REJECTED' && work.status !== 'PUBLISHED') {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Only DRAFT, PENDING, REJECTED, or PUBLISHED works can be updated',
      })
    }

    const parsed = updateWorkSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const {
      images,
      ...restUpdateData
    } = parsed.data

    const updateData: Prisma.WorkUpdateInput = {
      ...(restUpdateData.title !== undefined ? { title: restUpdateData.title } : {}),
      ...(restUpdateData.description !== undefined ? { description: restUpdateData.description } : {}),
      ...(restUpdateData.summary !== undefined ? { description: restUpdateData.summary } : {}),
      ...(restUpdateData.content !== undefined ? { content: sanitizeRichContent(restUpdateData.content) } : {}),
      ...(restUpdateData.tags !== undefined ? { tags: { set: restUpdateData.tags } } : {}),
      ...(restUpdateData.coverImage !== undefined ? { coverImage: restUpdateData.coverImage } : {}),
      ...(restUpdateData.visibility !== undefined ? { visibility: restUpdateData.visibility } : {}),
      ...(restUpdateData.draftSizeBytes !== undefined ? { draftSizeBytes: restUpdateData.draftSizeBytes } : {}),
      editCount: { increment: 1 },
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (images !== undefined) {
        await tx.workImage.deleteMany({ where: { workId: id } })
        if (images.length > 0) {
          await tx.workImage.createMany({
            data: images.map((imageUrl, index) => ({
              workId: id,
              imageUrl,
              sortOrder: index,
            })),
          })
        }
      }

      return tx.work.update({
        where: { id },
        data: {
          ...updateData,
          ...(images !== undefined && restUpdateData.coverImage === undefined
            ? { coverImage: images[0] ?? null }
            : {}),
        },
        include: {
          author: {
            select: { id: true, nickname: true, avatar: true },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          _count: { select: { comments: true } },
        },
      })
    })

    return reply.send({ data: updated })
  })

  /**
   * GET /api/creator/works
   * Creator center works list
   */
  fastify.get('/api/creator/works', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    await autoApproveExpiredPendingWorks()

    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(query.pageSize || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    )
    const statusRaw = query.status?.toUpperCase()
    const statusParsed = statusRaw ? creatorStatusSchema.safeParse(statusRaw) : null
    if (statusRaw && !statusParsed?.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid creator work status',
      })
    }

    const where: Prisma.WorkWhereInput = {
      authorId: request.user!.id,
      deletedAt: null,
      ...(statusParsed?.success ? { status: statusParsed.data } : {}),
    }

    const [works, total] = await Promise.all([
      prisma.work.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: {
            select: { id: true, nickname: true, avatar: true },
          },
          _count: { select: { comments: true } },
        },
      }),
      prisma.work.count({ where }),
    ])

    return reply.send({
      data: works,
      total,
      page,
      pageSize,
    })
  })

  /**
   * POST /api/creator/drafts/save
   * Auto/manual save creator draft
   */
  fastify.post('/api/creator/drafts/save', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    const parsed = draftSaveSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const {
      id,
      images = [],
      summary,
      draftSizeBytes,
      ...input
    } = parsed.data

    if (!id) {
      try {
        await assertDraftLimit(request.user!.id)
      } catch (error: unknown) {
        const maybeError = error as { code?: string }
        if (maybeError.code === 'DRAFT_LIMIT_EXCEEDED') {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: `最多可保存 ${MAX_DRAFT_COUNT} 条草稿`,
          })
        }
        throw error
      }
    }

    const saved = await prisma.$transaction(async (tx) => {
      if (id) {
        const existing = await tx.work.findFirst({
          where: { id, authorId: request.user!.id, deletedAt: null },
          select: { id: true, status: true },
        })
        if (!existing) {
          throw new Error('DRAFT_NOT_FOUND')
        }
        if (existing.status !== 'DRAFT') {
          throw new Error('NOT_DRAFT_WORK')
        }

        await tx.workImage.deleteMany({ where: { workId: id } })
        if (images.length > 0) {
          await tx.workImage.createMany({
            data: images.map((imageUrl, index) => ({
              workId: id,
              imageUrl,
              sortOrder: index,
            })),
          })
        }

        return tx.work.update({
          where: { id },
          data: {
            type: input.type,
            title: input.title,
            description: input.description ?? summary ?? null,
            content: input.content ? sanitizeRichContent(input.content) : null,
            tags: { set: input.tags ?? [] },
            coverImage: input.coverImage ?? images[0] ?? null,
            status: 'DRAFT',
            draftSizeBytes,
          },
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            author: { select: { id: true, nickname: true, avatar: true } },
            _count: { select: { comments: true } },
          },
        })
      }

      const created = await tx.work.create({
        data: {
          authorId: request.user!.id,
          type: input.type,
          title: input.title,
          description: input.description ?? summary ?? null,
          content: input.content ? sanitizeRichContent(input.content) : null,
          tags: input.tags ?? [],
          coverImage: input.coverImage ?? images[0] ?? null,
          status: 'DRAFT',
          draftSizeBytes,
        },
      })

      if (images.length > 0) {
        await tx.workImage.createMany({
          data: images.map((imageUrl, index) => ({
            workId: created.id,
            imageUrl,
            sortOrder: index,
          })),
        })
      }

      return tx.work.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          author: { select: { id: true, nickname: true, avatar: true } },
          _count: { select: { comments: true } },
        },
      })
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : ''
      if (message === 'DRAFT_NOT_FOUND') {
        return null
      }
      if (message === 'NOT_DRAFT_WORK') {
        return 'NOT_DRAFT_WORK' as const
      }
      throw error
    })

    if (saved === 'NOT_DRAFT_WORK') {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Only DRAFT work can be saved in draft box',
      })
    }

    if (!saved) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Draft not found',
      })
    }

    return reply.send({ data: saved })
  })

  /**
   * GET /api/creator/dashboard
   * Creator center dashboard stats
   */
  fastify.get('/api/creator/dashboard', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    await autoApproveExpiredPendingWorks()

    const authorId = request.user!.id
    const [
      draftCount,
      pendingCount,
      rejectedCount,
      publishedCount,
      totals,
    ] = await Promise.all([
      prisma.work.count({ where: { authorId, status: 'DRAFT', deletedAt: null } }),
      prisma.work.count({ where: { authorId, status: 'PENDING', deletedAt: null } }),
      prisma.work.count({ where: { authorId, status: 'REJECTED', deletedAt: null } }),
      prisma.work.count({ where: { authorId, status: 'PUBLISHED', deletedAt: null } }),
      prisma.work.aggregate({
        where: { authorId, deletedAt: null },
        _sum: { viewCount: true, likeCount: true, favoriteCount: true },
      }),
    ])

    const commentCount = await prisma.comment.count({
      where: {
        deletedAt: null,
        work: {
          authorId,
          deletedAt: null,
        },
      },
    })

    return reply.send({
      data: {
        draftCount,
        pendingCount,
        rejectedCount,
        publishedCount,
        totalViews: totals._sum.viewCount || 0,
        totalLikes: totals._sum.likeCount || 0,
        totalFavorites: totals._sum.favoriteCount || 0,
        totalComments: commentCount,
      },
    })
  })

  /**
   * POST /api/creator/works/batch-delete
   * Soft delete multiple works owned by current user
   */
  fastify.post('/api/creator/works/batch-delete', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    const parsed = batchDeleteWorksSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const ids = Array.from(new Set(parsed.data.ids))
    const works = await prisma.work.findMany({
      where: {
        id: { in: ids },
        authorId: request.user!.id,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (works.length !== ids.length) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Some works were not found or cannot be deleted',
      })
    }

    const deletedAt = new Date()
    const result = await prisma.work.updateMany({
      where: {
        id: { in: ids },
        authorId: request.user!.id,
        deletedAt: null,
      },
      data: { deletedAt },
    })

    return reply.send({
      message: 'Works deleted',
      deletedCount: result.count,
    })
  })

  /**
   * DELETE /api/works/:id
   * Soft delete work (auth required, only author/admin)
   */
  fastify.delete('/api/works/:id', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const work = await prisma.work.findUnique({
      where: { id },
      select: { authorId: true, deletedAt: true },
    })

    if (!work || work.deletedAt) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Work not found',
      })
    }

    if (work.authorId !== request.user!.id && request.user!.role !== 'ADMIN') {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only the author or admin can delete this work',
      })
    }

    await prisma.work.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return reply.send({ message: 'Work deleted' })
  })

  /**
   * POST /api/works/:id/revoke
   * Revoke pending submission (auth required, only author)
   */
  fastify.post('/api/works/:id/revoke', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const work = await prisma.work.findUnique({
      where: { id },
      select: { id: true, authorId: true, status: true, deletedAt: true },
    })
    if (!work || work.deletedAt) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Work not found',
      })
    }
    if (work.authorId !== request.user!.id) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only the author can revoke this work',
      })
    }
    if (work.status !== 'PENDING') {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Only pending works can be revoked',
      })
    }

    const updated = await prisma.work.update({
      where: { id },
      data: { status: 'DRAFT' },
    })
    return reply.send({ data: updated, message: 'Submission revoked' })
  })

  /**
   * POST /api/creator/works/:id/submit
   * Submit draft to review
   */
  fastify.post('/api/creator/works/:id/submit', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const work = await prisma.work.findUnique({
      where: { id },
      select: { id: true, authorId: true, status: true, deletedAt: true },
    })
    if (!work || work.deletedAt) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Work not found',
      })
    }
    if (work.authorId !== request.user!.id) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only the author can submit this work',
      })
    }
    if (work.status !== 'DRAFT') {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Only draft works can be submitted',
      })
    }

    const updated = await prisma.work.update({
      where: { id },
      data: { status: 'PENDING', rejectReason: null },
    })
    return reply.send({ data: updated, message: 'Submitted for review' })
  })

  /**
   * POST /api/creator/works/:id/resubmit
   * Resubmit rejected work
   */
  fastify.post('/api/creator/works/:id/resubmit', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const work = await prisma.work.findUnique({
      where: { id },
      select: { id: true, authorId: true, status: true, deletedAt: true },
    })
    if (!work || work.deletedAt) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Work not found',
      })
    }
    if (work.authorId !== request.user!.id) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only the author can resubmit this work',
      })
    }
    if (work.status !== 'REJECTED') {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Only rejected works can be resubmitted',
      })
    }

    const updated = await prisma.work.update({
      where: { id },
      data: { status: 'PENDING' },
    })
    return reply.send({ data: updated, message: 'Resubmitted for review' })
  })

  /**
   * POST /api/works/:id/like
   * Toggle like (auth required)
   */
  fastify.post('/api/works/:id/like', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user!.id

    const work = await prisma.work.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, authorId: true },
    })

    if (!work) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Work not found',
      })
    }

    const existing = await prisma.like.findUnique({
      where: { userId_workId: { userId, workId: id } },
    })

    if (existing) {
      // Unlike
      await prisma.$transaction(async (tx) => {
        await tx.like.delete({ where: { userId_workId: { userId, workId: id } } })
        await tx.work.update({
          where: { id },
          data: { likeCount: { decrement: 1 } },
        })
        if (work.authorId !== userId) {
          await applyInteractionDelta(tx, work.authorId, { receivedLikeDelta: -1 })
          await recalculateUserInteractionStats(tx, work.authorId)
        }
      })
      return reply.send({ liked: false })
    } else {
      // Like
      await prisma.$transaction(async (tx) => {
        await tx.like.create({
          data: { userId, workId: id },
        })
        await tx.work.update({
          where: { id },
          data: { likeCount: { increment: 1 } },
        })
        if (work.authorId !== userId) {
          await applyInteractionDelta(tx, work.authorId, { receivedLikeDelta: 1 })
          await createInteractionNotification(tx, {
            userId: work.authorId,
            actorId: userId,
            type: 'LIKE',
            workId: id,
          })
          await recalculateUserInteractionStats(tx, work.authorId)
        }
      })
      return reply.send({ liked: true })
    }
  })

  /**
   * POST /api/works/:id/favorite
   * Toggle favorite (auth required)
   */
  fastify.post('/api/works/:id/favorite', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user!.id

    const work = await prisma.work.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, authorId: true },
    })

    if (!work) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Work not found',
      })
    }

    const existing = await prisma.favorite.findUnique({
      where: { userId_workId: { userId, workId: id } },
    })

    if (existing) {
      // Unfavorite
      await prisma.$transaction(async (tx) => {
        await tx.favorite.delete({ where: { userId_workId: { userId, workId: id } } })
        await tx.work.update({
          where: { id },
          data: { favoriteCount: { decrement: 1 } },
        })
        if (work.authorId !== userId) {
          await applyInteractionDelta(tx, work.authorId, { receivedFavoriteDelta: -1 })
          await recalculateUserInteractionStats(tx, work.authorId)
        }
      })
      return reply.send({ favorited: false })
    } else {
      // Favorite
      await prisma.$transaction(async (tx) => {
        await tx.favorite.create({
          data: { userId, workId: id },
        })
        await tx.work.update({
          where: { id },
          data: { favoriteCount: { increment: 1 } },
        })
        if (work.authorId !== userId) {
          await applyInteractionDelta(tx, work.authorId, { receivedFavoriteDelta: 1 })
          await createInteractionNotification(tx, {
            userId: work.authorId,
            actorId: userId,
            type: 'FAVORITE',
            workId: id,
          })
          await recalculateUserInteractionStats(tx, work.authorId)
        }
      })
      return reply.send({ favorited: true })
    }
  })

  /**
   * GET /api/works/:id/comments
   * List comments with pagination
   */
  fastify.get('/api/works/:id/comments', async (request, reply) => {
    const { id } = request.params as { id: string }
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(query.pageSize || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    )

    const work = await prisma.work.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    })

    if (!work) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Work not found',
      })
    }

    const sort = query.sort === 'hot' ? 'hot' : 'new'
    const where = { workId: id, deletedAt: null, parentId: null as string | null }

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        orderBy: sort === 'hot'
          ? [{ likeCount: 'desc' }, { createdAt: 'desc' }]
          : [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: {
            select: { id: true, nickname: true, avatar: true },
          },
          replies: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                select: { id: true, nickname: true, avatar: true },
              },
            },
          },
        },
      }),
      prisma.comment.count({ where: { workId: id, deletedAt: null, parentId: null } }),
    ])

    return reply.send({
      data: comments,
      total,
      page,
      pageSize,
      sort,
    })
  })

  /**
   * POST /api/works/:id/comments
   * Create comment (auth required)
   */
  fastify.post('/api/works/:id/comments', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const work = await prisma.work.findFirst({
      where: { id, deletedAt: null, status: 'PUBLISHED' },
      select: { id: true },
    })

    if (!work) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Work not found',
      })
    }

    const parsed = createCommentSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const sanitizedContent = sanitizeCommentContent(parsed.data.content.trim())

    const comment = await prisma.comment.create({
      data: {
        workId: id,
        authorId: request.user!.id,
        content: sanitizedContent,
        parentId: parsed.data.parentId,
      },
      include: {
        author: {
          select: { id: true, nickname: true, avatar: true },
        },
      },
    })

    return reply.code(201).send({ data: comment })
  })

  /**
   * DELETE /api/comments/:id
   * Soft delete comment (auth required, only author/admin)
   */
  fastify.delete('/api/comments/:id', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { authorId: true, deletedAt: true },
    })

    if (!comment || comment.deletedAt) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Comment not found',
      })
    }

    if (comment.authorId !== request.user!.id && request.user!.role !== 'ADMIN') {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only the author or admin can delete this comment',
      })
    }

    await prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return reply.send({ message: 'Comment deleted' })
  })

  /**
   * POST /api/comments/:id/reaction
   * Toggle comment like/dislike (auth required)
   */
  fastify.post('/api/comments/:id/reaction', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { type?: 'LIKE' | 'DISLIKE' }
    const type = body?.type
    if (type !== 'LIKE' && type !== 'DISLIKE') {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid reaction type',
      })
    }

    const comment = await prisma.comment.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    })
    if (!comment) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Comment not found',
      })
    }

    const userId = request.user!.id
    const existing = await prisma.commentReaction.findUnique({
      where: { userId_commentId: { userId, commentId: id } },
    })

    let liked = false
    let disliked = false

    await prisma.$transaction(async (tx) => {
      if (!existing) {
        await tx.commentReaction.create({
          data: { userId, commentId: id, type },
        })
        await tx.comment.update({
          where: { id },
          data: type === 'LIKE'
            ? { likeCount: { increment: 1 } }
            : { dislikeCount: { increment: 1 } },
        })
        liked = type === 'LIKE'
        disliked = type === 'DISLIKE'
        return
      }

      if (existing.type === type) {
        await tx.commentReaction.delete({
          where: { userId_commentId: { userId, commentId: id } },
        })
        await tx.comment.update({
          where: { id },
          data: type === 'LIKE'
            ? { likeCount: { decrement: 1 } }
            : { dislikeCount: { decrement: 1 } },
        })
        liked = false
        disliked = false
        return
      }

      await tx.commentReaction.update({
        where: { userId_commentId: { userId, commentId: id } },
        data: { type },
      })
      await tx.comment.update({
        where: { id },
        data: type === 'LIKE'
          ? {
              likeCount: { increment: 1 },
              dislikeCount: { decrement: 1 },
            }
          : {
              likeCount: { decrement: 1 },
              dislikeCount: { increment: 1 },
            },
      })
      liked = type === 'LIKE'
      disliked = type === 'DISLIKE'
    })

    const latest = await prisma.comment.findUnique({
      where: { id },
      select: { likeCount: true, dislikeCount: true },
    })

    return reply.send({
      liked,
      disliked,
      likeCount: latest?.likeCount || 0,
      dislikeCount: latest?.dislikeCount || 0,
    })
  })

  /**
   * POST /api/reports
   * Create report (auth required)
   */
  fastify.post('/api/reports', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    const parsed = createReportSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const report = await prisma.report.create({
      data: {
        ...parsed.data,
        reporterId: request.user!.id,
      },
    })

    return reply.code(201).send({ data: report })
  })
}
