import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { requireAuth } from '../../common/middleware/auth.js'
import { requireRole } from '../../common/middleware/rbac.js'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@sao/shared'
import { z } from 'zod'

// --- Validation schemas ---

const createArcSchema = z.object({
  name: z.string().min(1).max(100),
  nameJa: z.string().min(1).max(100),
  nameEn: z.string().min(1).max(100),
  season: z.string().max(50).optional(),
  sortOrder: z.number().int(),
  synopsis: z.string().optional(),
  coverImage: z.string().optional(),
})

const updateArcSchema = createArcSchema.partial()

const createChapterSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  chapterNumber: z.number().int().min(1),
  isSpoiler: z.boolean().default(false),
})

const updateChapterSchema = createChapterSchema.partial()

// --- Route handler ---

export async function storyRoutes(fastify: FastifyInstance): Promise<void> {
  // ===================== Public routes =====================

  /**
   * GET /api/arcs
   * List arcs with pagination
   */
  fastify.get('/api/arcs', async (request, reply) => {
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(query.pageSize || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    )

    const [arcs, total] = await Promise.all([
      prisma.arc.findMany({
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          nameJa: true,
          nameEn: true,
          season: true,
          sortOrder: true,
          synopsis: true,
          coverImage: true,
          createdAt: true,
          _count: { select: { chapters: true } },
        },
      }),
      prisma.arc.count(),
    ])

    return reply.send({
      data: arcs,
      total,
      page,
      pageSize,
    })
  })

  /**
   * GET /api/arcs/:id
   * Arc detail with chapters
   */
  fastify.get('/api/arcs/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const arcId = parseInt(id, 10)

    if (isNaN(arcId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid arc id',
      })
    }

    const arc = await prisma.arc.findUnique({
      where: { id: arcId },
      include: {
        chapters: {
          orderBy: { chapterNumber: 'asc' },
          select: {
            id: true,
            arcId: true,
            title: true,
            content: true,
            chapterNumber: true,
            isSpoiler: true,
            createdAt: true,
          },
        },
        characters: {
          include: {
            character: {
              select: {
                id: true,
                name: true,
                nameJa: true,
                nameEn: true,
                avatar: true,
              },
            },
          },
        },
      },
    })

    if (!arc) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Arc not found',
      })
    }

    return reply.send({ data: arc })
  })

  /**
   * GET /api/arcs/:id/chapters
   * Chapters with pagination, spoiler filter query param
   */
  fastify.get('/api/arcs/:id/chapters', async (request, reply) => {
    const { id } = request.params as { id: string }
    const query = request.query as Record<string, string>
    const arcId = parseInt(id, 10)

    if (isNaN(arcId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid arc id',
      })
    }

    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(query.pageSize || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    )
    const hideSpoilers = query.hideSpoilers !== 'false'

    const arc = await prisma.arc.findUnique({ where: { id: arcId } })
    if (!arc) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Arc not found',
      })
    }

    const where = hideSpoilers ? { arcId, isSpoiler: false } : { arcId }

    const [chapters, total] = await Promise.all([
      prisma.storyChapter.findMany({
        where,
        orderBy: { chapterNumber: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.storyChapter.count({ where }),
    ])

    return reply.send({
      data: chapters,
      total,
      page,
      pageSize,
    })
  })

  // ===================== Admin routes =====================

  /**
   * POST /api/admin/arcs
   * Create a new arc
   */
  fastify.post('/api/admin/arcs', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const parsed = createArcSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const arc = await prisma.arc.create({ data: parsed.data })
    return reply.code(201).send({ data: arc })
  })

  /**
   * PUT /api/admin/arcs/:id
   * Update an arc
   */
  fastify.put('/api/admin/arcs/:id', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const arcId = parseInt(id, 10)

    if (isNaN(arcId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid arc id',
      })
    }

    const parsed = updateArcSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const existing = await prisma.arc.findUnique({ where: { id: arcId } })
    if (!existing) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Arc not found',
      })
    }

    const arc = await prisma.arc.update({
      where: { id: arcId },
      data: parsed.data,
    })

    return reply.send({ data: arc })
  })

  /**
   * DELETE /api/admin/arcs/:id
   * Delete an arc (cascades to chapters)
   */
  fastify.delete('/api/admin/arcs/:id', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const arcId = parseInt(id, 10)

    if (isNaN(arcId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid arc id',
      })
    }

    const existing = await prisma.arc.findUnique({ where: { id: arcId } })
    if (!existing) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Arc not found',
      })
    }

    await prisma.arc.delete({ where: { id: arcId } })

    return reply.send({ message: 'Arc deleted' })
  })

  /**
   * POST /api/admin/arcs/:id/chapters
   * Create a new chapter in an arc
   */
  fastify.post('/api/admin/arcs/:id/chapters', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const arcId = parseInt(id, 10)

    if (isNaN(arcId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid arc id',
      })
    }

    const arc = await prisma.arc.findUnique({ where: { id: arcId } })
    if (!arc) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Arc not found',
      })
    }

    const parsed = createChapterSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const chapter = await prisma.storyChapter.create({
      data: { ...parsed.data, arcId },
    })

    return reply.code(201).send({ data: chapter })
  })

  /**
   * PUT /api/admin/arcs/:id/chapters/:chapterId
   * Update a chapter
   */
  fastify.put('/api/admin/arcs/:id/chapters/:chapterId', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const { id, chapterId } = request.params as { id: string; chapterId: string }
    const arcId = parseInt(id, 10)
    const chId = parseInt(chapterId, 10)

    if (isNaN(arcId) || isNaN(chId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid arc or chapter id',
      })
    }

    const chapter = await prisma.storyChapter.findFirst({
      where: { id: chId, arcId },
    })
    if (!chapter) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Chapter not found',
      })
    }

    const parsed = updateChapterSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const updated = await prisma.storyChapter.update({
      where: { id: chId },
      data: parsed.data,
    })

    return reply.send({ data: updated })
  })

  /**
   * DELETE /api/admin/arcs/:id/chapters/:chapterId
   * Delete a chapter
   */
  fastify.delete('/api/admin/arcs/:id/chapters/:chapterId', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const { id, chapterId } = request.params as { id: string; chapterId: string }
    const arcId = parseInt(id, 10)
    const chId = parseInt(chapterId, 10)

    if (isNaN(arcId) || isNaN(chId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid arc or chapter id',
      })
    }

    const chapter = await prisma.storyChapter.findFirst({
      where: { id: chId, arcId },
    })
    if (!chapter) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Chapter not found',
      })
    }

    await prisma.storyChapter.delete({ where: { id: chId } })

    return reply.send({ message: 'Chapter deleted' })
  })
}
