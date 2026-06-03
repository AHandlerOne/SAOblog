import type { InteractionTrendPeriod, NotificationType, Prisma, PrismaClient } from '@prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

const NOTIFICATION_RETAIN_DAYS = 90

export function getNotificationExpiry(now = new Date()): Date {
  return new Date(now.getTime() + NOTIFICATION_RETAIN_DAYS * 24 * 60 * 60 * 1000)
}

function getPeriodStart(date: Date, period: InteractionTrendPeriod): Date {
  const start = new Date(date)
  start.setUTCHours(0, 0, 0, 0)

  if (period === 'WEEK') {
    const day = start.getUTCDay()
    const offset = day === 0 ? 6 : day - 1
    start.setUTCDate(start.getUTCDate() - offset)
    return start
  }

  start.setUTCDate(1)
  return start
}

export async function applyInteractionDelta(
  db: DbClient,
  userId: string,
  delta: { followerDelta?: number; receivedLikeDelta?: number; receivedFavoriteDelta?: number },
): Promise<void> {
  const followerDelta = delta.followerDelta ?? 0
  const receivedLikeDelta = delta.receivedLikeDelta ?? 0
  const receivedFavoriteDelta = delta.receivedFavoriteDelta ?? 0

  if (followerDelta === 0 && receivedLikeDelta === 0 && receivedFavoriteDelta === 0) {
    return
  }

  await db.userInteractionStat.upsert({
    where: { userId },
    update: {
      followerCount: { increment: followerDelta },
      receivedLikeCount: { increment: receivedLikeDelta },
      receivedFavoriteCount: { increment: receivedFavoriteDelta },
    },
    create: {
      userId,
      followerCount: Math.max(0, followerDelta),
      receivedLikeCount: Math.max(0, receivedLikeDelta),
      receivedFavoriteCount: Math.max(0, receivedFavoriteDelta),
    },
  })

  const now = new Date()
  for (const period of ['WEEK', 'MONTH'] as const) {
    const periodStart = getPeriodStart(now, period)
    await db.userInteractionTrend.upsert({
      where: {
        userId_period_periodStart: {
          userId,
          period,
          periodStart,
        },
      },
      update: {
        followerDelta: { increment: followerDelta },
        receivedLikeDelta: { increment: receivedLikeDelta },
        receivedFavoriteDelta: { increment: receivedFavoriteDelta },
      },
      create: {
        userId,
        period,
        periodStart,
        followerDelta,
        receivedLikeDelta,
        receivedFavoriteDelta,
      },
    })
  }
}

export async function recalculateUserInteractionStats(db: DbClient, userId: string): Promise<void> {
  const [followerCount, receivedLikeCount, receivedFavoriteCount] = await Promise.all([
    db.follow.count({
      where: { followingId: userId },
    }),
    db.like.count({
      where: {
        userId: { not: userId },
        work: {
          authorId: userId,
          status: 'PUBLISHED',
          deletedAt: null,
        },
      },
    }),
    db.favorite.count({
      where: {
        userId: { not: userId },
        work: {
          authorId: userId,
          status: 'PUBLISHED',
          deletedAt: null,
        },
      },
    }),
  ])

  await db.userInteractionStat.upsert({
    where: { userId },
    update: {
      followerCount,
      receivedLikeCount,
      receivedFavoriteCount,
    },
    create: {
      userId,
      followerCount,
      receivedLikeCount,
      receivedFavoriteCount,
    },
  })
}

export async function createInteractionNotification(
  db: DbClient,
  input: {
    userId: string
    actorId: string
    type: NotificationType
    workId?: string
  },
): Promise<void> {
  if (input.userId === input.actorId) {
    return
  }

  await db.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId,
      type: input.type,
      workId: input.workId,
      expiresAt: getNotificationExpiry(),
    },
  })
}

export async function cleanupExpiredNotifications(db: DbClient): Promise<void> {
  await db.notification.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })
}

