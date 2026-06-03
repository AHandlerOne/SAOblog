import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { requireAuth } from '../../common/middleware/auth.js'
import { requireRole } from '../../common/middleware/rbac.js'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@sao/shared'
import { z } from 'zod'

// --- Validation schemas ---

const createWallpaperSchema = z.object({
  title: z.string().min(1).max(200),
  characterId: z.number().int().optional(),
  arcId: z.number().int().optional(),
  imageUrl: z.string().min(1),
  resolution: z.string().max(50).optional(),
  sourceUrl: z.string().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
})

const updateWallpaperSchema = createWallpaperSchema.partial()

// --- Route handler ---

export async function galleryRoutes(fastify: FastifyInstance): Promise<void> {
  // ===================== Public routes =====================

  /**
   * GET /api/wallpapers
   * List wallpapers with pagination, filter by characterId, arcId, tag
   */
  fastify.get('/api/wallpapers', async (request, reply) => {
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(query.pageSize || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    )
    const characterId = query.characterId ? parseInt(query.characterId, 10) : undefined
    const arcId = query.arcId ? parseInt(query.arcId, 10) : undefined
    const tag = query.tag?.trim()
    const search = query.search?.trim()
    const resolution = query.resolution?.trim()

    const where: Record<string, unknown> = {}
    if (characterId && !isNaN(characterId)) {
      where.characterId = characterId
    }
    if (arcId && !isNaN(arcId)) {
      where.arcId = arcId
    }
    if (tag) {
      where.tags = { has: tag }
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { tags: { has: search } },
      ]
    }
    if (resolution) {
      where.resolution = resolution
    }

    const [wallpapers, total] = await Promise.all([
      prisma.wallpaper.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          character: {
            select: { id: true, name: true, nameEn: true, avatar: true },
          },
          arc: {
            select: { id: true, name: true, nameEn: true },
          },
        },
      }),
      prisma.wallpaper.count({ where }),
    ])

    return reply.send({
      data: wallpapers,
      total,
      page,
      pageSize,
    })
  })

  /**
   * GET /api/wallpapers/:id
   * Wallpaper detail
   */
  fastify.get('/api/wallpapers/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const wallpaperId = parseInt(id, 10)

    if (isNaN(wallpaperId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid wallpaper id',
      })
    }

    const wallpaper = await prisma.wallpaper.findUnique({
      where: { id: wallpaperId },
      include: {
        character: {
          select: { id: true, name: true, nameJa: true, nameEn: true, avatar: true },
        },
        arc: {
          select: { id: true, name: true, nameJa: true, nameEn: true },
        },
      },
    })

    if (!wallpaper) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Wallpaper not found',
      })
    }

    return reply.send({ data: wallpaper })
  })

  // ===================== Admin routes =====================

  /**
   * POST /api/admin/wallpapers
   * Create a new wallpaper
   */
  fastify.post('/api/admin/wallpapers', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const parsed = createWallpaperSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const createData: Prisma.WallpaperUncheckedCreateInput = {
      title: parsed.data.title,
      imageUrl: parsed.data.imageUrl,
      resolution: parsed.data.resolution,
      sourceUrl: parsed.data.sourceUrl,
      tags: parsed.data.tags ?? [],
      ...(parsed.data.characterId !== undefined ? { characterId: parsed.data.characterId } : {}),
      ...(parsed.data.arcId !== undefined ? { arcId: parsed.data.arcId } : {}),
    }

    const wallpaper = await prisma.wallpaper.create({
      data: createData,
      include: {
        character: {
          select: { id: true, name: true, nameEn: true, avatar: true },
        },
        arc: {
          select: { id: true, name: true, nameEn: true },
        },
      },
    })

    return reply.code(201).send({ data: wallpaper })
  })

  /**
   * PUT /api/admin/wallpapers/:id
   * Update a wallpaper
   */
  fastify.put('/api/admin/wallpapers/:id', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const wallpaperId = parseInt(id, 10)

    if (isNaN(wallpaperId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid wallpaper id',
      })
    }

    const existing = await prisma.wallpaper.findUnique({ where: { id: wallpaperId } })
    if (!existing) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Wallpaper not found',
      })
    }

    const parsed = updateWallpaperSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const updateData: Prisma.WallpaperUncheckedUpdateInput = {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl } : {}),
      ...(parsed.data.resolution !== undefined ? { resolution: parsed.data.resolution } : {}),
      ...(parsed.data.sourceUrl !== undefined ? { sourceUrl: parsed.data.sourceUrl } : {}),
      ...(parsed.data.tags !== undefined ? { tags: parsed.data.tags } : {}),
      ...(parsed.data.characterId !== undefined ? { characterId: parsed.data.characterId } : {}),
      ...(parsed.data.arcId !== undefined ? { arcId: parsed.data.arcId } : {}),
    }

    const wallpaper = await prisma.wallpaper.update({
      where: { id: wallpaperId },
      data: updateData,
      include: {
        character: {
          select: { id: true, name: true, nameEn: true, avatar: true },
        },
        arc: {
          select: { id: true, name: true, nameEn: true },
        },
      },
    })

    return reply.send({ data: wallpaper })
  })

  /**
   * DELETE /api/admin/wallpapers/:id
   * Delete a wallpaper
   */
  fastify.delete('/api/admin/wallpapers/:id', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const wallpaperId = parseInt(id, 10)

    if (isNaN(wallpaperId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid wallpaper id',
      })
    }

    const existing = await prisma.wallpaper.findUnique({ where: { id: wallpaperId } })
    if (!existing) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Wallpaper not found',
      })
    }

    await prisma.wallpaper.delete({ where: { id: wallpaperId } })

    return reply.send({ message: 'Wallpaper deleted' })
  })
}
