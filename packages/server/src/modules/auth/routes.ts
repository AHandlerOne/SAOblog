import type { FastifyInstance } from 'fastify'
import { registerSchema, loginSchema } from '@sao/shared'
import { prisma } from '../../lib/prisma.js'
import { config } from '../../config/index.js'
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  createSession,
  verifyRefreshToken,
  rotateRefreshToken,
  invalidateTokenFamily,
  blacklistToken,
  getRefreshTokenTtlMs,
} from './service.js'
import { requireAuth } from '../../common/middleware/auth.js'

const REFRESH_COOKIE_NAME = 'sao_rt'
const AUTH_PREFIX = '/api/auth'

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /auth/register
   * Register a new user account. No token is returned; user must log in after.
   */
  fastify.post(`${AUTH_PREFIX}/register`, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const { email, password, nickname } = parsed.data

    // Check if email is already taken
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.code(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: '该邮箱已被注册',
      })
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: { email, passwordHash, nickname },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatar: true,
        role: true,
        isBanned: true,
        aiAccess: true,
        createdAt: true,
      },
    })

    return reply.code(201).send({ user })
  })

  /**
   * POST /auth/login
   * Authenticate user, issue access token and set refresh token as HttpOnly cookie.
   */
  fastify.post(`${AUTH_PREFIX}/login`, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join('; '),
      })
    }

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: '邮箱或密码错误',
      })
    }

    const valid = await verifyPassword(user.passwordHash, password)
    if (!valid) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: '邮箱或密码错误',
      })
    }

    if (user.isBanned) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: '账号已被封禁',
      })
    }

    // Generate access token
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
    })

    // Generate refresh token
    const { jti: rtJti, token: refreshToken } = generateRefreshToken()
    const tokenFamily = rtJti
    const refreshTtlMs = getRefreshTokenTtlMs()
    const expiresAt = new Date(Date.now() + refreshTtlMs)

    // Store session in DB
    await createSession(user.id, rtJti, tokenFamily, expiresAt)

    // Set refresh token as HttpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production'
    reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: AUTH_PREFIX,
      maxAge: Math.ceil(refreshTtlMs / 1000),
    })

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
        isBanned: user.isBanned,
        aiAccess: user.aiAccess,
        createdAt: user.createdAt,
      },
      accessToken,
    })
  })

  /**
   * POST /auth/logout
   * Clear the refresh token cookie and blacklist the current RT jti.
   */
  fastify.post(`${AUTH_PREFIX}/logout`, async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME]

    if (refreshToken) {
      try {
        const decoded = (await import('jsonwebtoken')).default.verify(
          refreshToken,
          config.JWT_SECRET,
        ) as { jti: string; exp: number }

        // Blacklist the RT jti
        const remainingMs = decoded.exp * 1000 - Date.now()
        if (remainingMs > 0) {
          await blacklistToken(decoded.jti, remainingMs)
        }

        // Delete the session
        await prisma.session.deleteMany({
          where: { currentJti: decoded.jti },
        })
      } catch {
        // Token invalid or already expired - just clear cookie
      }
    }

    reply.clearCookie(REFRESH_COOKIE_NAME, { path: AUTH_PREFIX })

    return reply.send({ message: '已登出' })
  })

  /**
   * POST /auth/refresh
   * Verify the refresh token from cookie, perform CAS check, rotate RT, issue new AT.
   */
  fastify.post(`${AUTH_PREFIX}/refresh`, async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME]

    if (!refreshToken) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Refresh token missing',
      })
    }

    const result = await verifyRefreshToken(refreshToken)

    if (!result) {
      // Token invalid or blacklisted - clear cookie
      reply.clearCookie(REFRESH_COOKIE_NAME, { path: AUTH_PREFIX })
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token',
      })
    }

    const { session, jti: oldJti } = result

    // CAS check: the presented jti must match the session's currentJti
    if (session.currentJti !== oldJti) {
      // Token reuse detected! Invalidate entire family (potential theft)
      await invalidateTokenFamily(session.tokenFamily)
      reply.clearCookie(REFRESH_COOKIE_NAME, { path: AUTH_PREFIX })
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Token reuse detected. All sessions in this family have been invalidated.',
      })
    }

    // Blacklist the old RT jti
    const refreshTtlMs = getRefreshTokenTtlMs()
    await blacklistToken(oldJti, refreshTtlMs)

    // Generate new refresh token
    const { jti: newRtJti, token: newRefreshToken } = generateRefreshToken()
    const newExpiresAt = new Date(Date.now() + refreshTtlMs)

    // Rotate: update session with new jti
    await rotateRefreshToken(session.id, newRtJti, newExpiresAt)

    // Fetch user for new access token
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, nickname: true, role: true, isBanned: true },
    })

    if (!user) {
      reply.clearCookie(REFRESH_COOKIE_NAME, { path: AUTH_PREFIX })
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User not found',
      })
    }

    if (user.isBanned) {
      await invalidateTokenFamily(session.tokenFamily)
      reply.clearCookie(REFRESH_COOKIE_NAME, { path: AUTH_PREFIX })
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Account has been banned',
      })
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
    })

    // Set new refresh token cookie
    const isProduction = process.env.NODE_ENV === 'production'
    reply.setCookie(REFRESH_COOKIE_NAME, newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: AUTH_PREFIX,
      maxAge: Math.ceil(refreshTtlMs / 1000),
    })

    return reply.send({ accessToken })
  })

  /**
   * GET /auth/me
   * Return the currently authenticated user's profile.
   */
  fastify.get(`${AUTH_PREFIX}/me`, { preHandler: requireAuth.preHandler }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.id },
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
      },
    })

    if (!user) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      })
    }

    return reply.send({ user })
  })
}
