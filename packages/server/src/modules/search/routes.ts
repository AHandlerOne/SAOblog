import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@sao/shared'
import { optionalAuth } from '../../common/middleware/auth.js'
import {
  calculatePublicHotScore,
  getPublicRecommendationScore,
  isEligibleForPublicDiscovery,
} from '../../common/utils/public-work-discovery.js'

type SearchSort = 'relevance' | 'hot' | 'latest'
type SearchType = 'all' | 'work' | 'character' | 'story'

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

  const hasCjk = /[\u3400-\u9FFF]/.test(compact)
  if (hasCjk && compact.length > 1) {
    for (const char of Array.from(compact)) {
      const c = char.trim()
      if (c) termSet.add(c)
    }
    for (let i = 0; i < compact.length - 1; i += 1) {
      const bi = compact.slice(i, i + 2).trim()
      if (bi) termSet.add(bi)
    }
  }

  return Array.from(termSet).filter((term) => term.length > 0)
}

function scoreText(value: string, keyword: string): number {
  const normalized = (value || '').toLowerCase()
  const key = keyword.toLowerCase()
  if (!normalized) return 0
  if (normalized === key) return 100
  if (normalized.startsWith(key)) return 60
  if (normalized.includes(key)) return 30
  return 0
}

function normalizeSearchText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export async function searchRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/search/suggest', async (request, reply) => {
    const query = request.query as Record<string, string>
    const keyword = query.q?.trim()
    if (!keyword || keyword.length < 1) {
      return reply.send({ data: [] })
    }
    const terms = buildKeywordTerms(keyword)

    const [works, characters, chapters] = await Promise.all([
      prisma.work.findMany({
        where: {
          deletedAt: null,
          status: 'PUBLISHED',
          visibility: 'VISIBLE',
          OR: [
            ...terms.map((term) => ({ title: { contains: term, mode: 'insensitive' as const } })),
            ...terms.map((term) => ({ description: { contains: term, mode: 'insensitive' as const } })),
            { tags: { hasSome: terms } },
          ],
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
        take: 12,
        orderBy: [{ createdAt: 'desc' }],
      }),
      prisma.character.findMany({
        where: {
          OR: terms.flatMap((term) => ([
            { name: { contains: term, mode: 'insensitive' as const } },
            { nameJa: { contains: term, mode: 'insensitive' as const } },
            { nameEn: { contains: term, mode: 'insensitive' as const } },
          ])),
        },
        select: { name: true },
        take: 4,
      }),
      prisma.storyChapter.findMany({
        where: {
          OR: terms.map((term) => ({ title: { contains: term, mode: 'insensitive' as const } })),
        },
        select: { title: true },
        take: 4,
      }),
    ])

    const suggestions = Array.from(
      new Set([
        ...works
          .filter((work) => isEligibleForPublicDiscovery(work))
          .sort((left, right) => {
            const leftScore = scoreText(left.title, keyword) * 3 + getPublicRecommendationScore(left)
            const rightScore = scoreText(right.title, keyword) * 3 + getPublicRecommendationScore(right)
            return rightScore - leftScore
          })
          .map((w) => w.title),
        ...characters.map((c) => c.name),
        ...chapters.map((c) => c.title),
      ]),
    ).slice(0, 10)

    return reply.send({ data: suggestions })
  })

  fastify.get('/api/search/hot', async (_request, reply) => {
    const works = await prisma.work.findMany({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
        visibility: 'VISIBLE',
      },
      take: 24,
      orderBy: [{ viewCount: 'desc' }, { likeCount: 'desc' }, { createdAt: 'desc' }],
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
    })

    const data = works
      .filter((item) => isEligibleForPublicDiscovery(item))
      .sort((left, right) => calculatePublicHotScore(right) - calculatePublicHotScore(left))
      .map((item) => item.title)
      .slice(0, 10)

    return reply.send({ data })
  })

  fastify.get('/api/search', { preHandler: [optionalAuth.preHandler] }, async (request, reply) => {
    const startedAt = Date.now()
    const query = request.query as Record<string, string>
    const keyword = query.q?.trim()
    if (!keyword) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Search keyword "q" is required',
      })
    }

    const type = (query.type || 'all') as SearchType
    const sort = (query.sort || 'relevance') as SearchSort
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(query.pageSize || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    )
    const skip = (page - 1) * pageSize
    const terms = buildKeywordTerms(keyword)
    const lowerTerms = terms.map((term) => term.toLowerCase())

    if (!['all', 'work', 'character', 'story'].includes(type)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid search type',
      })
    }

    const [works, characters, chapters] = await Promise.all([
      (type === 'all' || type === 'work')
        ? prisma.work.findMany({
            where: {
              deletedAt: null,
              status: 'PUBLISHED',
              visibility: 'VISIBLE',
              AND: [
                {
                  OR: [
                    ...terms.flatMap((term) => ([
                      { title: { contains: term, mode: 'insensitive' as const } },
                      { description: { contains: term, mode: 'insensitive' as const } },
                      { content: { contains: term, mode: 'insensitive' as const } },
                      { author: { nickname: { contains: term, mode: 'insensitive' as const } } },
                    ])),
                    { tags: { hasSome: terms } },
                  ],
                },
              ],
            },
            select: {
              id: true,
              title: true,
              description: true,
              type: true,
              coverImage: true,
              tags: true,
              viewCount: true,
              likeCount: true,
              favoriteCount: true,
              createdAt: true,
              author: { select: { id: true, nickname: true, avatar: true } },
            },
            take: Math.max(pageSize * 2, 40),
            orderBy: sort === 'latest'
              ? [{ createdAt: 'desc' }]
              : [{ likeCount: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }],
          })
        : Promise.resolve([]),

      (type === 'all' || type === 'character')
        ? prisma.character.findMany({
            where: {
              OR: terms.flatMap((term) => ([
                { name: { contains: term, mode: 'insensitive' as const } },
                { nameJa: { contains: term, mode: 'insensitive' as const } },
                { nameEn: { contains: term, mode: 'insensitive' as const } },
                { description: { contains: term, mode: 'insensitive' as const } },
                { arcs: { some: { arc: { name: { contains: term, mode: 'insensitive' as const } } } } },
              ])),
            },
            select: {
              id: true,
              name: true,
              nameJa: true,
              nameEn: true,
              avatar: true,
              description: true,
            },
            take: Math.max(pageSize * 2, 30),
            orderBy: { id: 'asc' },
          })
        : Promise.resolve([]),

      (type === 'all' || type === 'story')
        ? prisma.storyChapter.findMany({
            where: {
              OR: terms.flatMap((term) => ([
                { title: { contains: term, mode: 'insensitive' as const } },
                { content: { contains: term, mode: 'insensitive' as const } },
                { arc: { name: { contains: term, mode: 'insensitive' as const } } },
              ])),
            },
            select: {
              id: true,
              title: true,
              content: true,
              chapterNumber: true,
              isSpoiler: true,
              createdAt: true,
              arcId: true,
              arc: { select: { name: true } },
            },
            take: Math.max(pageSize * 2, 30),
            orderBy: sort === 'latest'
              ? [{ createdAt: 'desc' }]
              : [{ chapterNumber: 'asc' }],
          })
        : Promise.resolve([]),
    ])

    const rankedWorkCandidates = works
      .map((item) => {
        const relevance = terms.reduce((score, term) => (
          score
          + scoreText(item.title, term) * 3
          + scoreText(item.description || '', term)
        ), 0)
          + (lowerTerms.some((term) => item.author.nickname.toLowerCase().includes(term)) ? 20 : 0)
          + (lowerTerms.some((term) => item.type.toLowerCase().includes(term)) ? 5 : 0)
        const hotness = item.likeCount * 3 + item.favoriteCount * 2 + item.viewCount * 0.02
        return { ...item, _score: sort === 'hot' ? hotness : relevance + hotness * 0.2 }
      })
      .sort((a, b) => sort === 'latest'
        ? b.createdAt.getTime() - a.createdAt.getTime()
        : b._score - a._score)

    const rankedWorkMap = new Map<string, (typeof rankedWorkCandidates)[number]>()
    for (const item of rankedWorkCandidates) {
      const key = `${item.author.id}:${item.type}:${normalizeSearchText(item.title)}`
      if (!rankedWorkMap.has(key)) {
        rankedWorkMap.set(key, item)
      }
    }

    const rankedWorkAll = Array.from(rankedWorkMap.values())
    const rankedWorks = rankedWorkAll.slice(skip, skip + pageSize).map(({ _score, ...rest }) => rest)

    const rankedCharacterAll = characters
      .map((item) => ({
        ...item,
        _score: terms.reduce((score, term) => (
          score
          + scoreText(item.name, term) * 3
          + scoreText(item.description || '', term)
        ), 0),
      }))
      .sort((a, b) => b._score - a._score)
    const rankedCharacters = rankedCharacterAll.slice(skip, skip + pageSize).map(({ _score, ...rest }) => rest)

    const rankedChapterAll = chapters
      .map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content.slice(0, 220),
        chapterNumber: item.chapterNumber,
        isSpoiler: item.isSpoiler,
        createdAt: item.createdAt,
        arcId: item.arcId,
        arcName: item.arc.name,
        _score: terms.reduce((score, term) => (
          score
          + scoreText(item.title, term) * 3
          + scoreText(item.content, term)
        ), 0),
      }))
      .sort((a, b) => sort === 'latest'
        ? b.createdAt.getTime() - a.createdAt.getTime()
        : b._score - a._score)
    const rankedChapters = rankedChapterAll.slice(skip, skip + pageSize).map(({ _score, ...rest }) => rest)

    let rankedWorksFinal = rankedWorks
    const rankedCharactersFinal = rankedCharacters
    const rankedChaptersFinal = rankedChapters
    let total = rankedWorkAll.length + rankedCharacterAll.length + rankedChapterAll.length

    if (total === 0 && (type === 'all' || type === 'work')) {
      const fallbackWorks = await prisma.work.findMany({
        where: {
          deletedAt: null,
          status: 'PUBLISHED',
          visibility: 'VISIBLE',
        },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          coverImage: true,
          tags: true,
          viewCount: true,
          likeCount: true,
          favoriteCount: true,
          createdAt: true,
          author: { select: { id: true, nickname: true, avatar: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: pageSize,
      })
      rankedWorksFinal = fallbackWorks
      total = fallbackWorks.length
    }
    const durationMs = Date.now() - startedAt

    return reply.send({
      data: {
        works: rankedWorksFinal,
        characters: rankedCharactersFinal,
        chapters: rankedChaptersFinal,
        total,
      },
      keyword,
      type,
      sort,
      page,
      pageSize,
      durationMs,
    })
  })
}
