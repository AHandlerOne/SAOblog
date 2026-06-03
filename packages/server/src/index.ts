import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'
import { MAX_FILE_SIZE } from '@sao/shared'
import { config, uploadRoot } from './config/index.js'
import { getRedis } from './lib/redis.js'
import { errorHandler } from './common/middleware/error-handler.js'
import { authRoutes } from './modules/auth/routes.js'
import { uploadRoutes } from './modules/upload/routes.js'
import { createImageWorker } from './modules/upload/queue.js'
import { storyRoutes } from './modules/story/routes.js'
import { characterRoutes } from './modules/character/routes.js'
import { galleryRoutes } from './modules/gallery/routes.js'
import { newsRoutes } from './modules/news/routes.js'
import { workRoutes } from './modules/work/routes.js'
import { adminRoutes } from './modules/admin/routes.js'
import { searchRoutes } from './modules/search/routes.js'
import { userRoutes } from './modules/user/routes.js'
import { notificationRoutes } from './modules/notification/routes.js'
import { aiRoutes } from './modules/ai/routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main(): Promise<void> {
  const fastify = Fastify({
    bodyLimit: MAX_FILE_SIZE,
    logger: {
      level: config.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: config.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l' },
          }
        : undefined,
    },
  })

  // Global error handler
  fastify.setErrorHandler(errorHandler)

  // Cookie support
  await fastify.register(cookie)

  // Multipart uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1,
    },
    throwFileSizeLimit: true,
  })

  // Binary chunk upload support
  fastify.addContentTypeParser('application/octet-stream', {
    parseAs: 'buffer',
    bodyLimit: MAX_FILE_SIZE,
  }, (_request, payload, done) => {
    done(null, payload)
  })

  // CORS
  await fastify.register(cors, {
    origin: config.NODE_ENV === 'production'
      ? [/^https?:\/\/([\w-]+\.)?sao-blog\.com$/]
      : true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })

  const redis = config.REDIS_URL === 'disabled' ? undefined : getRedis()

  // Rate limiting
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    cache: 10000,
    redis,
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${Math.max(
        1,
        Math.ceil((typeof context.after === 'number' ? context.after : Number(context.after)) / 1000) || 60,
      )} seconds.`,
    }),
  })

  // CSP header hook
  fastify.addHook('onSend', async (request, reply) => {
    // Only set CSP for HTML-like responses
    const contentType = reply.getHeader('content-type')
    if (typeof contentType === 'string' && contentType.includes('text/html')) {
      reply.header(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      )
    }

    // Add security headers for all responses
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('X-XSS-Protection', '1; mode=block')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')

    if (config.NODE_ENV === 'production') {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
  })

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // Register route modules
  await fastify.register(authRoutes)
  await fastify.register(uploadRoutes)
  await fastify.register(storyRoutes)
  await fastify.register(characterRoutes)
  await fastify.register(galleryRoutes)
  await fastify.register(newsRoutes)
  await fastify.register(workRoutes)
  await fastify.register(adminRoutes)
  await fastify.register(searchRoutes)
  await fastify.register(userRoutes)
  await fastify.register(notificationRoutes)
  await fastify.register(aiRoutes)

  // Serve static uploads directory (processed images)
  await fastify.register(
    async (fastifyInstance) => {
      await fastifyInstance.register(
        (await import('@fastify/static')).default,
        {
          root: path.join(uploadRoot, 'public'),
          prefix: '/uploads/public/',
          serve: true,
        },
      )
      await fastifyInstance.register(
        (await import('@fastify/static')).default,
        {
          root: path.join(uploadRoot, 'public'),
          prefix: '/api/uploads/public/',
          serve: true,
          decorateReply: false,
        },
      )
    },
  )

  // Start BullMQ image processing worker
  createImageWorker()

  // Start server
  try {
    const address = await fastify.listen({ port: config.PORT, host: '0.0.0.0' })
    fastify.log.info(`Server listening on ${address}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

main()
