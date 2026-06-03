import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { optionalAuth, requireAuth } from '../../common/middleware/auth.js'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@sao/shared'
import { z } from 'zod'
import {
  applyInteractionDelta,
  createInteractionNotification,
  recalculateUserInteractionStats,
} from '../engagement/service.js'

const updateProfileSchema = z.object({
  nickname: z.string().trim().min(2).max(20),
  avatar: z.string().trim().min(1).nullable().optional(),
})

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * PUT /api/users/me
   * Update current user's editable profile fields.
   */
  fastify.put('/api/users/me', { preHandler: [requireAuth.preHandler] }, async (request, reply) => {
    const parsed = updateProfileSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const existingUser = await prisma.user.findFirst({
      where: { id: request.user!.id, deletedAt: null },
      select: { id: true },
    })

    if (!existingUser) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      })
    }

    const user = await prisma.user.update({
      where: { id: request.user!.id },
      data: {
        nickname: parsed.data.nickname,
        avatar: parsed.data.avatar ?? null,
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatar: true,
        bio: true,
        role: true,
        isBanned: true,
        createdAt: true,
      },
    })

    return reply.send({ user })
  })

  /**
   * GET /api/users/:id
   * Public user profile
   */
  fastify.get('/api/users/:id', { preHandler: [optionalAuth.preHandler] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const viewerId = request.user?.id
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            works: {
              where: { deletedAt: null, status: 'PUBLISHED', visibility: 'VISIBLE' },
            },
            followers: true,
          },
        },
        interactionStat: {
          select: {
            followerCount: true,
            receivedLikeCount: true,
            receivedFavoriteCount: true,
          },
        },
      },
    })

    if (!user) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      })
    }

    const isFollowing = viewerId
      ? Boolean(await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: id,
            },
          },
        }))
      : false

    return reply.send({
      data: {
        ...user,
        worksCount: user._count.works,
        followerCount: user.interactionStat?.followerCount ?? user._count.followers,
        totalReceivedLikes: user.interactionStat?.receivedLikeCount ?? 0,
        totalReceivedFavorites: user.interactionStat?.receivedFavoriteCount ?? 0,
        isFollowing,
      },
    })
  })

  /**
   * GET /api/users/:id/works
   * List a user's published works
   */
  fastify.get('/api/users/:id/works', { preHandler: [optionalAuth.preHandler] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(query.pageSize || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    )

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    })

    if (!user) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      })
    }

    const isOwner = request.user?.id === id
    const includePending = query.includePending === 'true' && isOwner
    const statusFilter = query.status
    const canUsePendingStatus = includePending && statusFilter === 'PENDING'

    const where = {
      authorId: id,
      ...(canUsePendingStatus
        ? { status: 'PENDING' as const }
        : { status: 'PUBLISHED' as const }),
      ...(isOwner ? {} : { visibility: 'VISIBLE' as const }),
      deletedAt: null as Date | null,
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
   * POST /api/users/:id/follow
   * Toggle follow user
   */
  fastify.post('/api/users/:id/follow', { preHandler: [requireAuth.preHandler] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const followerId = request.user!.id
    if (id === followerId) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Cannot follow yourself',
      })
    }

    const target = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    })
    if (!target) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      })
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: id,
        },
      },
    })

    if (existing) {
      await prisma.$transaction(async (tx) => {
        await tx.follow.delete({
          where: {
            followerId_followingId: {
              followerId,
              followingId: id,
            },
          },
        })
        await applyInteractionDelta(tx, id, { followerDelta: -1 })
        await recalculateUserInteractionStats(tx, id)
      })
      return reply.send({ following: false })
    }

    await prisma.$transaction(async (tx) => {
      await tx.follow.create({
        data: {
          followerId,
          followingId: id,
        },
      })
      await applyInteractionDelta(tx, id, { followerDelta: 1 })
      await createInteractionNotification(tx, {
        userId: id,
        actorId: followerId,
        type: 'FOLLOW',
      })
      await recalculateUserInteractionStats(tx, id)
    })

    return reply.send({ following: true })
  })

  /**
   * GET /api/users/:id/interaction-trends
   * Weekly/Monthly trend for creator dashboard
   */
  fastify.get('/api/users/:id/interaction-trends', { preHandler: [requireAuth.preHandler] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    if (request.user!.id !== id) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only owner can view interaction trends',
      })
    }

    const query = request.query as Record<string, string>
    const periodRaw = (query.period || 'WEEK').toUpperCase()
    if (periodRaw !== 'WEEK' && periodRaw !== 'MONTH') {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid period value',
      })
    }
    const period = periodRaw as 'WEEK' | 'MONTH'
    const limit = Math.min(24, Math.max(1, parseInt(query.limit || '12', 10) || 12))

    const records = await prisma.userInteractionTrend.findMany({
      where: {
        userId: id,
        period,
      },
      orderBy: { periodStart: 'desc' },
      take: limit,
    })

    return reply.send({
      data: records.reverse(),
    })
  })
}
