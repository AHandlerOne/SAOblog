import { prisma } from '../../lib/prisma.js'

const AUTO_APPROVE_AFTER_MS = 8 * 60 * 60 * 1000

export async function autoApproveExpiredPendingWorks(): Promise<number> {
  const deadline = new Date(Date.now() - AUTO_APPROVE_AFTER_MS)

  const result = await prisma.work.updateMany({
    where: {
      status: 'PENDING',
      deletedAt: null,
      updatedAt: {
        lte: deadline,
      },
    },
    data: {
      status: 'PUBLISHED',
      rejectReason: null,
    },
  })

  return result.count
}
