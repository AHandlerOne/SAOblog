import type { FastifyRequest, FastifyReply } from 'fastify'
import { ROLE_HIERARCHY } from '@sao/shared'

/**
 * RBAC middleware factory.
 * Usage: server.get('/admin', { preHandler: requireRole('ADMIN') }, handler)
 */
export function requireRole(minRole: string) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    if (!request.user) {
      return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Authentication required' })
    }

    const userLevel = ROLE_HIERARCHY[request.user.role]
    const requiredLevel = ROLE_HIERARCHY[minRole]

    if (userLevel === undefined || requiredLevel === undefined) {
      return reply.code(500).send({ statusCode: 500, error: 'Internal Server Error', message: 'Invalid role configuration' })
    }

    if (userLevel < requiredLevel) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Role '${request.user.role}' does not meet minimum requirement '${minRole}'`,
      })
    }
  }
}
