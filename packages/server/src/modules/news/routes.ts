import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { requireAuth } from '../../common/middleware/auth.js'
import { requireRole } from '../../common/middleware/rbac.js'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@sao/shared'
import { z } from 'zod'
import { sanitizeRichContent } from '../../common/utils/content-sanitize.js'

// --- Validation schemas ---

const VALID_CATEGORIES = ['ANIME', 'MOVIE', 'GAME', 'AUTHOR', 'MERCHANDISE', 'OTHER'] as const

const createNewsSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  category: z.enum(VALID_CATEGORIES),
  coverImage: z.string().optional(),
  publishedAt: z.string().datetime().optional(),
})

const updateNewsSchema = createNewsSchema.partial()

// --- Route handler ---

export async function newsRoutes(fastify: FastifyInstance): Promise<void> {
  // ===================== Public routes =====================

  /**
   * GET /api/news
   * List news with pagination, filter by category
   */
  fastify.get('/api/news', async (request, reply) => {
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(query.pageSize || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    )
    const category = query.category?.toUpperCase()

    const where: Record<string, unknown> = {}
    if (category && VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
      where.category = category
    }

    const [news, total] = await Promise.all([
      prisma.news.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.news.count({ where }),
    ])

    return reply.send({
      data: news,
      total,
      page,
      pageSize,
    })
  })

  /**
   * GET /api/news/:id
   * News detail
   */
  fastify.get('/api/news/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const newsId = parseInt(id, 10)

    if (isNaN(newsId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid news id',
      })
    }

    const news = await prisma.news.findUnique({
      where: { id: newsId },
    })

    if (!news) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'News not found',
      })
    }

    return reply.send({ data: news })
  })

  // ===================== Admin routes =====================

  /**
   * POST /api/admin/news
   * Create a new news article
   */
  fastify.post('/api/admin/news', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const parsed = createNewsSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const { publishedAt, ...data } = parsed.data

    const news = await prisma.news.create({
      data: {
        ...data,
        content: sanitizeRichContent(data.content),
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      },
    })

    return reply.code(201).send({ data: news })
  })

  /**
   * PUT /api/admin/news/:id
   * Update a news article
   */
  fastify.put('/api/admin/news/:id', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const newsId = parseInt(id, 10)

    if (isNaN(newsId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid news id',
      })
    }

    const existing = await prisma.news.findUnique({ where: { id: newsId } })
    if (!existing) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'News not found',
      })
    }

    const parsed = updateNewsSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const { publishedAt, ...data } = parsed.data

    const news = await prisma.news.update({
      where: { id: newsId },
      data: {
        ...data,
        ...(data.content !== undefined ? { content: sanitizeRichContent(data.content) } : {}),
        ...(publishedAt !== undefined ? { publishedAt: new Date(publishedAt) } : {}),
      },
    })

    return reply.send({ data: news })
  })

  /**
   * DELETE /api/admin/news/:id
   * Delete a news article
   */
  fastify.delete('/api/admin/news/:id', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const newsId = parseInt(id, 10)

    if (isNaN(newsId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid news id',
      })
    }

    const existing = await prisma.news.findUnique({ where: { id: newsId } })
    if (!existing) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'News not found',
      })
    }

    await prisma.news.delete({ where: { id: newsId } })

    return reply.send({ message: 'News deleted' })
  })
}
