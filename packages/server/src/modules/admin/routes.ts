import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { requireAuth } from '../../common/middleware/auth.js'
import { requireRole } from '../../common/middleware/rbac.js'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@sao/shared'
import { z } from 'zod'
import { autoApproveExpiredPendingWorks } from '../work/auto-approve.js'

// --- Validation schemas ---

const handleReportSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED']),
})

const rejectWorkSchema = z.object({
  reason: z.string().min(1, '请填写拒绝原因').max(500),
})

const changeWorkStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED']),
  reason: z.string().max(500).optional(),
})

const banUserSchema = z.object({
  reason: z.string().min(1, '请填写封禁原因').max(500),
})

const changeRoleSchema = z.object({
  role: z.enum(['USER', 'MODERATOR', 'ADMIN']),
})

const updateAiAccessSchema = z.object({
  aiAccess: z.boolean(),
})

async function attachReportTitles<T extends {
  targetType: string
  targetId: string
}>(reports: T[]): Promise<Array<T & { targetTitle: string }>> {
  if (reports.length === 0) {
    return []
  }

  const workIds = reports
    .filter(report => report.targetType === 'WORK')
    .map(report => report.targetId)

  const commentIds = reports
    .filter(report => report.targetType === 'COMMENT')
    .map(report => report.targetId)

  const userIds = reports
    .filter(report => report.targetType === 'USER')
    .map(report => report.targetId)

  const [works, comments, users] = await Promise.all([
    workIds.length > 0
      ? prisma.work.findMany({
          where: { id: { in: workIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
    commentIds.length > 0
      ? prisma.comment.findMany({
          where: { id: { in: commentIds } },
          select: { id: true, content: true },
        })
      : Promise.resolve([]),
    userIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, nickname: true },
        })
      : Promise.resolve([]),
  ])

  const workTitleMap = new Map(works.map(work => [work.id, work.title]))
  const commentTitleMap = new Map(comments.map(comment => [comment.id, comment.content.slice(0, 40)]))
  const userTitleMap = new Map(users.map(user => [user.id, user.nickname]))

  return reports.map((report) => {
    let targetTitle = `${report.targetType} #${report.targetId.slice(0, 8)}`

    if (report.targetType === 'WORK') {
      targetTitle = workTitleMap.get(report.targetId) ?? targetTitle
    } else if (report.targetType === 'COMMENT') {
      targetTitle = commentTitleMap.get(report.targetId) ?? targetTitle
    } else if (report.targetType === 'USER') {
      targetTitle = userTitleMap.get(report.targetId) ?? targetTitle
    }

    return {
      ...report,
      targetTitle,
    }
  })
}

// --- Route handler ---

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  // All admin routes require MODERATOR role minimum

  /**
   * GET /api/admin/reports
   * List reports with pagination
   */
  fastify.get('/api/admin/reports', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(query.pageSize || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    )
    const status = query.status?.toUpperCase()

    const VALID_STATUSES = ['PENDING', 'RESOLVED', 'DISMISSED']

    const where: Record<string, unknown> = {}
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          reporter: {
            select: { id: true, nickname: true, avatar: true },
          },
          handledBy: {
            select: { id: true, nickname: true, avatar: true },
          },
        },
      }),
      prisma.report.count({ where }),
    ])

    const enrichedReports = await attachReportTitles(reports)

    return reply.send({
      data: enrichedReports,
      total,
      page,
      pageSize,
    })
  })

  /**
   * PUT /api/admin/reports/:id
   * Handle report (resolve/dismiss)
   */
  fastify.put('/api/admin/reports/:id', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const reportId = parseInt(id, 10)

    if (isNaN(reportId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid report id',
      })
    }

    const report = await prisma.report.findUnique({ where: { id: reportId } })
    if (!report) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Report not found',
      })
    }

    if (report.status !== 'PENDING') {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Report has already been handled',
      })
    }

    const parsed = handleReportSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: parsed.data.status,
        handledById: request.user!.id,
        resolvedAt: new Date(),
      },
      include: {
        reporter: {
          select: { id: true, nickname: true, avatar: true },
        },
        handledBy: {
          select: { id: true, nickname: true, avatar: true },
        },
      },
    })

    return reply.send({ data: updated })
  })

  /**
   * POST /api/admin/works/:id/approve
   * Approve work
   */
  fastify.post('/api/admin/works/:id/approve', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    await autoApproveExpiredPendingWorks()

    const { id } = request.params as { id: string }

    const work = await prisma.work.findUnique({
      where: { id },
      select: { id: true, status: true, deletedAt: true },
    })

    if (!work || work.deletedAt) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Work not found',
      })
    }

    if (work.status !== 'PENDING') {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Only PENDING works can be approved',
      })
    }

    const updated = await prisma.work.update({
      where: { id },
      data: { status: 'PUBLISHED', rejectReason: null },
    })

    return reply.send({ data: updated })
  })

  /**
   * POST /api/admin/works/:id/reject
   * Reject work (body: { reason })
   */
  fastify.post('/api/admin/works/:id/reject', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    await autoApproveExpiredPendingWorks()

    const { id } = request.params as { id: string }

    const work = await prisma.work.findUnique({
      where: { id },
      select: { id: true, status: true, deletedAt: true },
    })

    if (!work || work.deletedAt) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Work not found',
      })
    }

    if (work.status !== 'PENDING') {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Only PENDING works can be rejected',
      })
    }

    const parsed = rejectWorkSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const updated = await prisma.work.update({
      where: { id },
      data: { status: 'REJECTED', rejectReason: parsed.data.reason },
    })

    return reply.send({ data: updated })
  })

  /**
   * GET /api/admin/works/pending
   * List pending works for moderation
   */
  fastify.get('/api/admin/works/pending', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    await autoApproveExpiredPendingWorks()

    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(query.pageSize || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    )

    const where = { status: 'PENDING' as const, deletedAt: null }

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
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          _count: { select: { comments: true, likes: true, favorites: true } },
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
   * GET /api/admin/works
   * List works by moderation status
   */
  fastify.get('/api/admin/works', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    await autoApproveExpiredPendingWorks()

    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(query.pageSize || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    )
    const status = query.status?.toUpperCase()
    const search = query.search?.trim()
    const VALID_STATUSES = ['DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED'] as const

    const where: Record<string, unknown> = { deletedAt: null }
    if (status && VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      where.status = status
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { author: { nickname: { contains: search, mode: 'insensitive' } } },
        { tags: { has: search } },
      ]
    }

    const [works, total] = await Promise.all([
      prisma.work.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: {
            select: { id: true, nickname: true, avatar: true },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          _count: { select: { comments: true, likes: true, favorites: true } },
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
   * PUT /api/admin/works/:id/status
   * Change work moderation status
   */
  fastify.put('/api/admin/works/:id/status', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = changeWorkStatusSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    if (parsed.data.status === 'REJECTED' && !parsed.data.reason?.trim()) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Reject reason is required when status is REJECTED',
      })
    }

    const work = await prisma.work.findUnique({
      where: { id },
      select: { id: true, status: true, deletedAt: true },
    })

    if (!work || work.deletedAt) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Work not found',
      })
    }

    const updated = await prisma.work.update({
      where: { id },
      data: {
        status: parsed.data.status,
        rejectReason: parsed.data.status === 'REJECTED'
          ? parsed.data.reason!.trim()
          : null,
      },
    })

    return reply.send({ data: updated })
  })

  /**
   * GET /api/admin/users
   * List users with pagination
   */
  fastify.get('/api/admin/users', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(query.pageSize || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    )
    const search = query.search?.trim()

    const where: Record<string, unknown> = { deletedAt: null }
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { nickname: { contains: search } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          nickname: true,
          avatar: true,
          bio: true,
          role: true,
          isBanned: true,
          aiAccess: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { works: true, comments: true, reports: true } },
        },
      }),
      prisma.user.count({ where }),
    ])

    return reply.send({
      data: users,
      total,
      page,
      pageSize,
    })
  })

  /**
   * PUT /api/admin/users/:id/ban
   * Ban user (body: { reason })
   */
  fastify.put('/api/admin/users/:id/ban', {
    preHandler: [requireAuth.preHandler, requireRole('ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isBanned: true, deletedAt: true },
    })

    if (!user || user.deletedAt) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      })
    }

    if (user.isBanned) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'User is already banned',
      })
    }

    const parsed = banUserSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    // Create ban record and update user status in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { isBanned: true },
      }),
      prisma.banRecord.create({
        data: {
          userId: id,
          reason: parsed.data.reason,
          bannedById: request.user!.id,
        },
      }),
    ])

    // Invalidate all user sessions
    await prisma.session.deleteMany({ where: { userId: id } })

    return reply.send({ message: 'User banned' })
  })

  /**
   * PUT /api/admin/users/:id/unban
   * Unban user
   */
  fastify.put('/api/admin/users/:id/unban', {
    preHandler: [requireAuth.preHandler, requireRole('ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isBanned: true, deletedAt: true },
    })

    if (!user || user.deletedAt) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      })
    }

    if (!user.isBanned) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'User is not banned',
      })
    }

    // Update user and close the latest ban record
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { isBanned: false },
      }),
      prisma.banRecord.updateMany({
        where: { userId: id, unbannedAt: null },
        data: {
          unbannedAt: new Date(),
          unbannedById: request.user!.id,
        },
      }),
    ])

    return reply.send({ message: 'User unbanned' })
  })

  /**
   * PUT /api/admin/users/:id/role
   * Change user role
   */
  fastify.put('/api/admin/users/:id/role', {
    preHandler: [requireAuth.preHandler, requireRole('ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    if (id === request.user!.id) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Cannot change your own role',
      })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, deletedAt: true },
    })

    if (!user || user.deletedAt) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      })
    }

    const parsed = changeRoleSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: { id: true, nickname: true, role: true },
    })

    return reply.send({ data: updated })
  })

  /**
   * PUT /api/admin/users/:id/ai-access
   * Enable or disable AI assistant access for a user.
   */
  fastify.put('/api/admin/users/:id/ai-access', {
    preHandler: [requireAuth.preHandler, requireRole('ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = updateAiAccessSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    })

    if (!user || user.deletedAt) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { aiAccess: parsed.data.aiAccess },
      select: { id: true, nickname: true, aiAccess: true },
    })

    return reply.send({ data: updated })
  })

  /**
   * PUT /api/admin/users/:id/reset-profile
   * Reset nickname/avatar to default values
   */
  fastify.put('/api/admin/users/:id/reset-profile', {
    preHandler: [requireAuth.preHandler, requireRole('ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    })

    if (!user || user.deletedAt) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        nickname: 'momo',
        avatar: null,
      },
      select: {
        id: true,
        nickname: true,
        avatar: true,
      },
    })

    return reply.send({ data: updated })
  })

  /**
   * GET /api/admin/stats
   * Dashboard statistics
   */
  fastify.get('/api/admin/stats', {
    preHandler: [requireAuth.preHandler, requireRole('MODERATOR')],
  }, async (_request, reply) => {
    await autoApproveExpiredPendingWorks()

    const [
      totalUsers,
      totalWorks,
      totalComments,
      totalReports,
      pendingWorks,
      pendingReports,
      recentUsers,
      recentReports,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.work.count({ where: { deletedAt: null, status: 'PUBLISHED' } }),
      prisma.comment.count({ where: { deletedAt: null } }),
      prisma.report.count(),
      prisma.work.count({ where: { deletedAt: null, status: 'PENDING' } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, nickname: true, avatar: true, createdAt: true },
      }),
      prisma.report.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          reporter: {
            select: { id: true, nickname: true, avatar: true },
          },
          handledBy: {
            select: { id: true, nickname: true, avatar: true },
          },
        },
      }),
    ])

    const enrichedRecentReports = await attachReportTitles(recentReports)

    return reply.send({
      data: {
        totalUsers,
        totalWorks,
        totalComments,
        totalReports,
        pendingWorks,
        pendingReviews: pendingWorks,
        pendingReports,
        recentUsers,
        recentReports: enrichedRecentReports,
      },
    })
  })
}
