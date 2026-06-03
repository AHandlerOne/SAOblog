import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import type { SignOptions } from 'jsonwebtoken'
import { config } from '../../config/index.js'
import { prisma } from '../../lib/prisma.js'
import { getRedis } from '../../lib/redis.js'

const BLACKLIST_PREFIX = 'bl:'
const accessTokenExpiresIn = config.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn']
const refreshTokenExpiresIn = config.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn']

/**
 * Hash a password using argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,   // 64 MB
    timeCost: 3,          // 3 iterations
    parallelism: 4,       // 4 threads
  })
}

/**
 * Verify a password against an argon2 hash.
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password)
}

/**
 * Generate a short-lived access token for API authentication.
 */
export function generateAccessToken(user: {
  id: string
  email: string
  nickname: string
  role: string
}): string {
  const payload = {
    sub: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
  }

  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: accessTokenExpiresIn,
    jwtid: crypto.randomUUID(),
  })
}

/**
 * Generate a refresh token (JWT) and its associated metadata.
 */
export function generateRefreshToken(): { jti: string; token: string } {
  const jti = crypto.randomUUID()
  const token = jwt.sign({ jti }, config.JWT_SECRET, {
    expiresIn: refreshTokenExpiresIn,
  })
  return { jti, token }
}

/**
 * Parse the refresh token expiry string (e.g. "7d") into milliseconds.
 */
function parseDurationToMs(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/)
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000 // default 7 days
  }
  const value = parseInt(match[1], 10)
  const unit = match[2]
  switch (unit) {
    case 's': return value * 1000
    case 'm': return value * 60 * 1000
    case 'h': return value * 60 * 60 * 1000
    case 'd': return value * 24 * 60 * 60 * 1000
    default: return 7 * 24 * 60 * 60 * 1000
  }
}

/**
 * Create a session record in the database for JWT rotation tracking.
 */
export async function createSession(
  userId: string,
  jti: string,
  tokenFamily: string,
  expiresAt: Date,
): Promise<void> {
  await prisma.session.create({
    data: {
      userId,
      currentJti: jti,
      tokenFamily,
      expiresAt,
    },
  })
}

/**
 * Verify a refresh token and perform CAS (Compare-And-Swap) check.
 * Returns the session if valid, or null if reuse is detected (potential theft).
 */
export async function verifyRefreshToken(
  token: string,
): Promise<{ session: { id: string; userId: string; currentJti: string; tokenFamily: string; expiresAt: Date }; jti: string } | null> {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { jti: string; exp: number }

    // Check if token is blacklisted
    if (await isBlacklisted(decoded.jti)) {
      return null
    }

    // Look up the session by the token's jti
    const session = await prisma.session.findFirst({
      where: { currentJti: decoded.jti },
    })

    if (!session) {
      // Token not found in any session - might belong to a different family
      // or could be an old token. We just reject it.
      return null
    }

    if (session.expiresAt < new Date()) {
      // Session expired - clean up
      await prisma.session.delete({ where: { id: session.id } })
      return null
    }

    return { session, jti: decoded.jti }
  } catch {
    return null
  }
}

/**
 * Rotate a refresh token: update the session's currentJti to the new one.
 * Returns the updated session.
 */
export async function rotateRefreshToken(
  sessionId: string,
  newJti: string,
  newExpiresAt: Date,
): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      currentJti: newJti,
      expiresAt: newExpiresAt,
    },
  })
}

/**
 * Invalidate an entire token family (all sessions with the same family).
 * Called when token reuse is detected.
 */
export async function invalidateTokenFamily(tokenFamily: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { tokenFamily },
  })
}

/**
 * Blacklist a token's jti in Redis with a TTL matching the token's remaining lifetime.
 */
export async function blacklistToken(jti: string, expiresIn: number): Promise<void> {
  const redis = getRedis()
  await redis.set(`${BLACKLIST_PREFIX}${jti}`, '1', 'EX', Math.ceil(expiresIn / 1000))
}

/**
 * Check if a token's jti is blacklisted.
 */
export async function isBlacklisted(jti: string): Promise<boolean> {
  const redis = getRedis()
  const result = await redis.get(`${BLACKLIST_PREFIX}${jti}`)
  return result === '1'
}

/**
 * Get the refresh token TTL in milliseconds (for blacklisting and session expiry).
 */
export function getRefreshTokenTtlMs(): number {
  return parseDurationToMs(config.JWT_REFRESH_EXPIRES_IN)
}
