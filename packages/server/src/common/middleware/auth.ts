import type { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import { config } from '../../config/index.js'
import { prisma } from '../../lib/prisma.js'
import { isBlacklisted } from '../../modules/auth/service.js'

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string
      email: string
      nickname: string
      role: string
      isBanned: boolean
      aiAccess: boolean
    }
  }
}

export interface JwtPayload {
  sub: string
  email: string
  nickname: string
  role: string
  jti: string
  iat: number
  exp: number
}

async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Missing or invalid Authorization header' })
    return
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload

    // Check if token is blacklisted
    const blacklisted = await isBlacklisted(decoded.jti)
    if (blacklisted) {
      reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Token has been revoked' })
      return
    }

    // Verify user still exists and is not banned
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, nickname: true, role: true, isBanned: true, aiAccess: true },
    })

    if (!user) {
      reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'User not found' })
      return
    }

    if (user.isBanned) {
      reply.code(403).send({ statusCode: 403, error: 'Forbidden', message: 'Account has been banned' })
      return
    }

    request.user = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
      isBanned: user.isBanned,
      aiAccess: user.aiAccess,
    }
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Token expired' })
      return
    }
    reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid token' })
  }
}

export const requireAuth = {
  preHandler: authenticate,
}

export const optionalAuth = {
  preHandler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return
    }

    const token = authHeader.slice(7)

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload

      const blacklisted = await isBlacklisted(decoded.jti)
      if (blacklisted) return

      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, email: true, nickname: true, role: true, isBanned: true, aiAccess: true },
      })

      if (!user || user.isBanned) return

      request.user = {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        isBanned: user.isBanned,
        aiAccess: user.aiAccess,
      }
    } catch {
      // Silently ignore invalid token for optional auth
    }
  },
}
