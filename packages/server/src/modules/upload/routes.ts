import type { FastifyInstance } from 'fastify'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_UPLOAD_TYPES,
  MAX_FILE_SIZE,
  MAX_MEDIA_FILE_SIZE,
  UPLOAD_CHUNK_SIZE,
} from '@sao/shared'
import { prisma } from '../../lib/prisma.js'
import { uploadRoot } from '../../config/index.js'
import { processImage, validateFileType } from './service.js'
import { getImageQueue } from './queue.js'
import { requireAuth } from '../../common/middleware/auth.js'

type ChunkSessionMeta = {
  id: string
  userId: string
  filename: string
  mimeType: string
  totalSize: number
  totalChunks: number
  chunkSize: number
  uploadedChunks: number[]
  createdAt: string
}

function getUploadLimit(mimeType: string): number {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return MAX_FILE_SIZE
  }
  return MAX_MEDIA_FILE_SIZE
}

function resolveExtFromMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    case 'video/mp4':
      return 'mp4'
    case 'video/webm':
      return 'webm'
    case 'video/quicktime':
      return 'mov'
    case 'audio/mpeg':
      return 'mp3'
    case 'audio/wav':
      return 'wav'
    case 'audio/ogg':
      return 'ogg'
    case 'audio/mp4':
      return 'm4a'
    case 'text/plain':
      return 'txt'
    case 'text/markdown':
      return 'md'
    case 'application/pdf':
      return 'pdf'
    case 'application/msword':
      return 'doc'
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'docx'
    default:
      return 'bin'
  }
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

function sessionDir(): string {
  return path.join(uploadRoot, 'chunks')
}

function sessionPath(sessionId: string): string {
  return path.join(sessionDir(), `${sessionId}.json`)
}

function chunkPath(sessionId: string, index: number): string {
  return path.join(sessionDir(), `${sessionId}.${index}.part`)
}

async function readSession(sessionId: string): Promise<ChunkSessionMeta | null> {
  try {
    const raw = await fs.readFile(sessionPath(sessionId), 'utf-8')
    return JSON.parse(raw) as ChunkSessionMeta
  } catch {
    return null
  }
}

async function writeSession(meta: ChunkSessionMeta): Promise<void> {
  await ensureDir(sessionDir())
  await fs.writeFile(sessionPath(meta.id), JSON.stringify(meta))
}

async function removeSessionArtifacts(sessionId: string, totalChunks: number): Promise<void> {
  const deletions: Promise<unknown>[] = [fs.unlink(sessionPath(sessionId)).catch(() => undefined)]
  for (let i = 0; i < totalChunks; i += 1) {
    deletions.push(fs.unlink(chunkPath(sessionId, i)).catch(() => undefined))
  }
  await Promise.all(deletions)
}

async function collectFileBuffer(stream: AsyncIterable<Buffer>): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks)
}

async function processImageWithQueueFallback(fileId: number): Promise<void> {
  const queue = getImageQueue()
  if (!queue) {
    await prisma.uploadRecord.update({
      where: { id: fileId },
      data: { status: 'PROCESSING' },
    })
    await processImage(fileId)
    return
  }

  await queue.add(
    'process-image',
    { fileId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  )
}

async function createReadyNonImageRecord(params: {
  userId: string
  originalFilename: string
  mimeType: string
  data: Buffer
}): Promise<{ fileId: number; status: string; url: string }> {
  const uniqueId = crypto.randomUUID()
  const ext = resolveExtFromMime(params.mimeType)
  const filename = `${uniqueId}.${ext}`
  const publicFilesDir = path.join(uploadRoot, 'public', 'files')
  await ensureDir(publicFilesDir)
  await fs.writeFile(path.join(publicFilesDir, filename), params.data)

  const record = await prisma.uploadRecord.create({
    data: {
      userId: params.userId,
      originalFilename: params.originalFilename,
      filename,
      mimeType: params.mimeType,
      size: params.data.length,
      status: 'READY',
      url: `/api/uploads/public/files/${filename}`,
    },
    select: {
      id: true,
      status: true,
      url: true,
    },
  })

  return { fileId: record.id, status: record.status, url: record.url! }
}

export async function uploadRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/api/upload/image', { preHandler: requireAuth.preHandler }, async (request, reply) => {
    const data = await request.file()
    if (!data) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'No file uploaded',
      })
    }

    const buffer = await collectFileBuffer(data.file)
    if (buffer.length === 0) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Empty file',
      })
    }
    if (buffer.length > MAX_FILE_SIZE) {
      return reply.code(413).send({
        statusCode: 413,
        error: 'Payload Too Large',
        message: `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      })
    }

    const detectedMime = validateFileType(buffer)
    if (!detectedMime || !ALLOWED_IMAGE_TYPES.includes(detectedMime)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Unsupported file type. Only JPEG, PNG, and WebP are allowed.',
      })
    }

    const uniqueId = crypto.randomUUID()
    const extension = detectedMime.split('/')[1] === 'jpeg' ? 'jpg' : detectedMime.split('/')[1]
    const filename = `${uniqueId}.${extension}`
    const privateDir = path.join(uploadRoot, 'private')
    await ensureDir(privateDir)
    await fs.writeFile(path.join(privateDir, filename), buffer)

    const record = await prisma.uploadRecord.create({
      data: {
        userId: request.user!.id,
        originalFilename: data.filename || filename,
        filename,
        mimeType: detectedMime,
        size: buffer.length,
        status: 'UPLOADED',
      },
      select: { id: true, status: true },
    })

    try {
      await processImageWithQueueFallback(record.id)
    } catch {
      await prisma.uploadRecord.update({
        where: { id: record.id },
        data: { status: 'FAILED' },
      })
      return reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to process upload',
      })
    }

    return reply.code(202).send({
      fileId: record.id,
      status: record.status,
      message: 'File uploaded and queued for processing',
    })
  })

  fastify.post('/api/upload/init', { preHandler: requireAuth.preHandler }, async (request, reply) => {
    const body = request.body as {
      filename?: string
      mimeType?: string
      totalSize?: number
      totalChunks?: number
    }
    const filename = body.filename?.trim()
    const mimeType = body.mimeType?.trim()
    const totalSize = Number(body.totalSize || 0)
    const totalChunks = Number(body.totalChunks || 0)

    if (!filename || !mimeType || !Number.isFinite(totalSize) || !Number.isFinite(totalChunks)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid upload init payload',
      })
    }

    if (!ALLOWED_UPLOAD_TYPES.includes(mimeType as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Unsupported file type',
      })
    }

    const limit = getUploadLimit(mimeType)
    if (totalSize <= 0 || totalSize > limit) {
      return reply.code(413).send({
        statusCode: 413,
        error: 'Payload Too Large',
        message: `File size exceeds limit (${Math.floor(limit / (1024 * 1024))}MB)`,
      })
    }

    const expectedChunks = Math.ceil(totalSize / UPLOAD_CHUNK_SIZE)
    if (totalChunks !== expectedChunks) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Chunk count mismatch',
      })
    }

    const uploadId = crypto.randomUUID()
    const meta: ChunkSessionMeta = {
      id: uploadId,
      userId: request.user!.id,
      filename,
      mimeType,
      totalSize,
      totalChunks,
      chunkSize: UPLOAD_CHUNK_SIZE,
      uploadedChunks: [],
      createdAt: new Date().toISOString(),
    }
    await writeSession(meta)

    return reply.send({
      uploadId,
      chunkSize: UPLOAD_CHUNK_SIZE,
      uploadedChunks: [],
    })
  })

  fastify.put('/api/upload/session/:id/chunk/:index', {
    preHandler: requireAuth.preHandler,
    bodyLimit: MAX_FILE_SIZE,
  }, async (request, reply) => {
    const { id, index } = request.params as { id: string; index: string }
    const chunkIndex = Number(index)
    const meta = await readSession(id)
    if (!meta) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Upload session not found',
      })
    }
    if (meta.userId !== request.user!.id) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Upload session mismatch',
      })
    }
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= meta.totalChunks) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid chunk index',
      })
    }

    const raw = Buffer.isBuffer(request.body)
      ? request.body
      : await collectFileBuffer(request.raw as unknown as AsyncIterable<Buffer>)
    if (raw.length === 0 || raw.length > meta.chunkSize) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid chunk size',
      })
    }

    await fs.writeFile(chunkPath(id, chunkIndex), raw)
    if (!meta.uploadedChunks.includes(chunkIndex)) {
      meta.uploadedChunks.push(chunkIndex)
      meta.uploadedChunks.sort((a, b) => a - b)
      await writeSession(meta)
    }

    return reply.send({
      uploadId: id,
      uploadedChunks: meta.uploadedChunks,
      uploadedCount: meta.uploadedChunks.length,
      totalChunks: meta.totalChunks,
    })
  })

  fastify.get('/api/upload/session/:id', { preHandler: requireAuth.preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const meta = await readSession(id)
    if (!meta || meta.userId !== request.user!.id) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Upload session not found',
      })
    }

    return reply.send({
      uploadId: meta.id,
      uploadedChunks: meta.uploadedChunks,
      totalChunks: meta.totalChunks,
      chunkSize: meta.chunkSize,
      progress: meta.uploadedChunks.length / meta.totalChunks,
    })
  })

  fastify.post('/api/upload/session/:id/complete', { preHandler: requireAuth.preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const meta = await readSession(id)
    if (!meta) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Upload session not found',
      })
    }
    if (meta.userId !== request.user!.id) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Upload session mismatch',
      })
    }
    if (meta.uploadedChunks.length !== meta.totalChunks) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Upload is incomplete',
      })
    }

    const chunkBuffers: Buffer[] = []
    for (let i = 0; i < meta.totalChunks; i += 1) {
      chunkBuffers.push(await fs.readFile(chunkPath(id, i)))
    }
    const merged = Buffer.concat(chunkBuffers)
    if (merged.length !== meta.totalSize) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Upload size mismatch',
      })
    }

    if (ALLOWED_IMAGE_TYPES.includes(meta.mimeType)) {
      const detectedMime = validateFileType(merged)
      if (!detectedMime || !ALLOWED_IMAGE_TYPES.includes(detectedMime)) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Corrupted image upload',
        })
      }

      const extension = resolveExtFromMime(detectedMime)
      const filename = `${crypto.randomUUID()}.${extension}`
      const privateDir = path.join(uploadRoot, 'private')
      await ensureDir(privateDir)
      await fs.writeFile(path.join(privateDir, filename), merged)

      const record = await prisma.uploadRecord.create({
        data: {
          userId: request.user!.id,
          originalFilename: meta.filename,
          filename,
          mimeType: detectedMime,
          size: merged.length,
          status: 'UPLOADED',
        },
        select: { id: true, status: true },
      })

      try {
        await processImageWithQueueFallback(record.id)
        await removeSessionArtifacts(id, meta.totalChunks)
        return reply.code(202).send({
          fileId: record.id,
          status: record.status,
          message: 'Image upload completed',
        })
      } catch {
        await prisma.uploadRecord.update({
          where: { id: record.id },
          data: { status: 'FAILED' },
        })
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Image processing failed',
        })
      }
    }

    const result = await createReadyNonImageRecord({
      userId: request.user!.id,
      originalFilename: meta.filename,
      mimeType: meta.mimeType,
      data: merged,
    })
    await removeSessionArtifacts(id, meta.totalChunks)

    return reply.code(201).send({
      fileId: result.fileId,
      status: result.status,
      url: result.url,
      message: 'File upload completed',
    })
  })

  fastify.get('/api/upload/:id', { preHandler: requireAuth.preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const fileId = parseInt(id, 10)

    if (Number.isNaN(fileId)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid upload id',
      })
    }

    const record = await prisma.uploadRecord.findFirst({
      where: {
        id: fileId,
        userId: request.user!.id,
      },
      select: {
        id: true,
        status: true,
        url: true,
        thumbnailUrl: true,
        width: true,
        height: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!record) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Upload record not found',
      })
    }

    return reply.send({ data: record })
  })
}
