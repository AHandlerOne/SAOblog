import { Queue, Worker } from 'bullmq'
import { getRedis } from '../../lib/redis.js'
import { processImage } from './service.js'
import { prisma } from '../../lib/prisma.js'
import { config } from '../../config/index.js'

const QUEUE_NAME = 'image-processing'

let imageQueue: Queue | null = null

/**
 * Get or create the BullMQ image processing queue.
 */
export function getImageQueue(): Queue | null {
  if (config.REDIS_URL === 'disabled') {
    return null
  }
  if (!imageQueue) {
    const connection = getRedis()
    imageQueue = new Queue(QUEUE_NAME, { connection })
  }
  return imageQueue
}

/**
 * Create and return the BullMQ worker that processes uploaded images.
 * Should be called once when the server starts.
 */
export function createImageWorker(): Worker | null {
  if (config.REDIS_URL === 'disabled') {
    return null
  }

  const connection = getRedis()

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { fileId } = job.data as { fileId: number }
      try {
        await processImage(fileId)
        await job.updateProgress(100)
      } catch (error) {
        // Mark the upload record as failed
        await prisma.uploadRecord.update({
          where: { id: fileId },
          data: { status: 'FAILED' },
        }).catch(() => {
          // Ignore if the record doesn't exist anymore
        })
        throw error
      }
    },
    {
      connection,
      concurrency: 3,
      autorun: true,
    },
  )

  worker.on('completed', (job) => {
    job.log(`Image processing completed for file ${job.data.fileId}`)
  })

  worker.on('failed', (job, err) => {
    if (job) {
      job.log(`Image processing failed for file ${job.data.fileId}: ${err.message}`)
      console.error(`[upload-worker] failed fileId=${job.data.fileId}: ${err.stack || err.message}`)
    }
  })

  return worker
}
