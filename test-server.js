#!/usr/bin/env node

import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l' },
    },
  },
})

// Register plugins
await fastify.register(cookie)
await fastify.register(cors, {
  origin: true,
  credentials: true,
})
await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
})

// Simple health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Test auth endpoint
fastify.post('/auth/login', async (request, reply) => {
  const { email, password } = request.body

  if (email === 'test@example.com' && password === 'password123') {
    return reply.send({
      user: {
        id: '1',
        email: 'test@example.com',
        nickname: 'Test User',
        avatar: null,
        role: 'USER',
        isBanned: false,
        createdAt: new Date().toISOString(),
      },
      accessToken: 'test-access-token',
    })
  }

  return reply.code(401).send({
    statusCode: 401,
    error: 'Unauthorized',
    message: '邮箱或密码错误',
  })
})

// Start server
try {
  const address = await fastify.listen({ port: 3000, host: '0.0.0.0' })
  console.log(`Server listening on ${address}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}