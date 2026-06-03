import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { requireAuth } from '../../common/middleware/auth.js'
import { requireRole } from '../../common/middleware/rbac.js'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@sao/shared'
import { z } from 'zod'

// --- Validation schemas ---

const createCharacterSchema = z.object({
  name: z.string().min(1).max(100),
  nameJa: z.string().min(1).max(100),
  nameEn: z.string().min(1).max(100),
  cv: z.string().max(100).optional(),
  avatar: z.string().min(1),
  description: z.string(),
  weapon: z.string().max(200).optional(),
  affiliation: z.string().max(200).optional(),
  arcIds: z.array(z.number().int()).optional(),
})

const updateCharacterSchema = createCharacterSchema.partial().omit({ arcIds: true })

// --- Route handler ---

export async function characterRoutes(fastify: FastifyInstance): Promise<void> {
  // ===================== Public routes =====================

  /**
   * GET /api/characters
   * List characters with pagination, filter by arcId, search by name
   */
  fastify.get('/api/characters', async (request, reply) => {
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(query.pageSize || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    )
    const arcId = query.arcId ? parseInt(query.arcId, 10) : undefined
    const search = query.search?.trim()

    const where: Record<string, unknown> = {}
    if (arcId && !isNaN(arcId)) {
      where.arcs = { some: { arcId } }
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameJa: { contains: search } },
        { nameEn: { contains: search } },
      ]
    }

    const [characters, total] = await Promise.all([
      prisma.character.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'asc' },
        include: {
          arcs: {
            include: {
              arc: {
                select: { id: true, name: true, nameEn: true },
              },
            },
          },
          _count: { select: { wallpapers: true } },
        },
      }),
      prisma.character.count({ where }),
    ])

    return reply.send({
      data: characters,
      total,
      page,
      pageSize,
    })
  })

  /**
   * GET /api/characters/:id
   * Character detail
   */
  fastify.get('/api/characters/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const characterId = parseInt(id, 10)

    if (isNaN(characterId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid character id',
      })
    }

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        arcs: {
          include: {
            arc: {
              select: { id: true, name: true, nameEn: true, season: true, synopsis: true },
            },
          },
        },
        wallpapers: {
          select: { id: true, title: true, imageUrl: true, resolution: true },
          take: 10,
        },
        _count: {
          select: { wallpapers: true },
        },
      },
    })

    if (!character) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Character not found',
      })
    }

    const related = await prisma.character.findMany({
      where: {
        id: { not: characterId },
        arcs: {
          some: {
            arcId: {
              in: character.arcs.map((item) => item.arcId),
            },
          },
        },
      },
      take: 8,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        nameEn: true,
        avatar: true,
        arcs: {
          where: {
            arcId: {
              in: character.arcs.map((item) => item.arcId),
            },
          },
          select: {
            arc: {
              select: { id: true, name: true },
            },
            role: true,
          },
          take: 1,
        },
      },
    })

    return reply.send({
      data: {
        ...character,
        relatedCharacters: related,
      },
    })
  })

  /**
   * GET /api/characters/:id/wallpapers
   * Character wallpapers
   */
  fastify.get('/api/characters/:id/wallpapers', async (request, reply) => {
    const { id } = request.params as { id: string }
    const query = request.query as Record<string, string>
    const characterId = parseInt(id, 10)

    if (isNaN(characterId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid character id',
      })
    }

    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(query.pageSize || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    )

    const character = await prisma.character.findUnique({ where: { id: characterId } })
    if (!character) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Character not found',
      })
    }

    const [wallpapers, total] = await Promise.all([
      prisma.wallpaper.findMany({
        where: { characterId },
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.wallpaper.count({ where: { characterId } }),
    ])

    return reply.send({
      data: wallpapers,
      total,
      page,
      pageSize,
    })
  })

  // ===================== Admin routes =====================

  /**
   * POST /api/admin/characters
   * Create a new character
   */
  fastify.post('/api/admin/characters', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const parsed = createCharacterSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const { arcIds, ...data } = parsed.data

    const character = await prisma.character.create({
      data: {
        ...data,
        arcs: arcIds
          ? {
              create: arcIds.map((arcId) => ({ arcId })),
            }
          : undefined,
      },
      include: { arcs: true },
    })

    return reply.code(201).send({ data: character })
  })

  /**
   * PUT /api/admin/characters/:id
   * Update a character
   */
  fastify.put('/api/admin/characters/:id', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const characterId = parseInt(id, 10)

    if (isNaN(characterId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid character id',
      })
    }

    const existing = await prisma.character.findUnique({ where: { id: characterId } })
    if (!existing) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Character not found',
      })
    }

    const parsed = updateCharacterSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const character = await prisma.character.update({
      where: { id: characterId },
      data: parsed.data,
    })

    return reply.send({ data: character })
  })

  /**
   * DELETE /api/admin/characters/:id
   * Delete a character
   */
  fastify.delete('/api/admin/characters/:id', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const characterId = parseInt(id, 10)

    if (isNaN(characterId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid character id',
      })
    }

    const existing = await prisma.character.findUnique({ where: { id: characterId } })
    if (!existing) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Character not found',
      })
    }

    await prisma.character.delete({ where: { id: characterId } })

    return reply.send({ message: 'Character deleted' })
  })
}
