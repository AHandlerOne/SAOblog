import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../../common/middleware/auth.js'
import { prisma } from '../../lib/prisma.js'
import { cleanupExpiredNotifications } from '../engagement/service.js'

const notificationTypeSchema = z.enum(['ALL', 'FOLLOW', 'LIKE', 'FAVORITE'])

const markReadSchema = z.object({
  ids: z.array(z.string().min(1)).max(200).optional(),
})

const batchDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
})

export async function notificationRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/notifications', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize || '20', 10) || 20))
    const parsedType = notificationTypeSchema.safeParse((query.type || 'ALL').toUpperCase())
    if (!parsedType.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid notification type',
      })
    }

    await cleanupExpiredNotifications(prisma)
    const type = parsedType.data
    const where = {
      userId: request.user!.id,
      ...(type !== 'ALL' ? { type } : {}),
    }

    const [records, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
          work: {
            select: {
              id: true,
              title: true,
              coverImage: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
    ])

    return reply.send({
      data: records,
      total,
      page,
      pageSize,
    })
  })

  fastify.get('/api/notifications/unread-count', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    await cleanupExpiredNotifications(prisma)
    const unreadCount = await prisma.notification.count({
      where: {
        userId: request.user!.id,
        isRead: false,
      },
    })

    return reply.send({ data: { unreadCount } })
  })

  fastify.get('/api/notifications/unread-summary', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    await cleanupExpiredNotifications(prisma)
    const unread = await prisma.notification.findMany({
      where: {
        userId: request.user!.id,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        actor: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        work: {
          select: {
            id: true,
            title: true,
            coverImage: true,
          },
        },
      },
    })

    return reply.send({ data: unread })
  })

  fastify.patch('/api/notifications/read', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    const parsed = markReadSchema.safeParse(request.body || {})
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue) => issue.message).join('; '),
      })
    }

    const ids = parsed.data.ids ? Array.from(new Set(parsed.data.ids)) : []
    await prisma.notification.updateMany({
      where: {
        userId: request.user!.id,
        ...(ids.length > 0 ? { id: { in: ids } } : {}),
        isRead: false,
      },
      data: { isRead: true },
    })

    return reply.send({ message: 'Notifications marked as read' })
  })

  fastify.delete('/api/notifications', {
    preHandler: [requireAuth.preHandler],
  }, async (request, reply) => {
    const parsed = batchDeleteSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue) => issue.message).join('; '),
      })
    }

    const ids = Array.from(new Set(parsed.data.ids))
    const result = await prisma.notification.deleteMany({
      where: {
        userId: request.user!.id,
        id: { in: ids },
      },
    })

    return reply.send({
      message: 'Notifications deleted',
      deletedCount: result.count,
    })
  })
}

