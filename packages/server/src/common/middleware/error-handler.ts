import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'

interface ErrorResponse {
  statusCode: number
  error: string
  message: string
}

export function errorHandler(
  error: FastifyError & { statusCode?: number; validation?: unknown[] },
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const response: ErrorResponse = {
    statusCode: error.statusCode ?? 500,
    error: error.name ?? 'Internal Server Error',
    message: error.message ?? 'An unexpected error occurred',
  }

  // Handle Fastify validation errors (schema validation)
  if (error.validation && error.validation.length > 0) {
    response.statusCode = 400
    response.error = 'Bad Request'
    const details = error.validation
      .map((v: { instancePath?: string; message?: string }) => {
        const field = v.instancePath || 'field'
        return `${field.replace('/', '')}: ${v.message}`
      })
      .join('; ')
    response.message = `Validation failed: ${details}`
  }

  // Handle ZodError from manual validation
  if (error.name === 'ZodError') {
    response.statusCode = 400
    response.error = 'Bad Request'
    response.message = error.message
  }

  // Handle Prisma known errors
  if (error.code === 'P2002') {
    response.statusCode = 409
    response.error = 'Conflict'
    response.message = 'A record with this value already exists'
  } else if (error.code === 'P2025') {
    response.statusCode = 404
    response.error = 'Not Found'
    response.message = 'Record not found'
  } else if (error.code?.startsWith('P')) {
    // Other Prisma errors
    if (response.statusCode === 500) {
      response.message = 'Database operation failed'
    }
  }

  // Log error in development
  if (response.statusCode >= 500) {
    request.log.error({ err: error, req: request.url, response }, 'Unhandled error')
  } else {
    request.log.warn({ err: error, req: request.url }, 'Client error')
  }

  reply.code(response.statusCode).send(response)
}
