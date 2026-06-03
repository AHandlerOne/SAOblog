import { z } from 'zod'
import path from 'path'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),
  MINIO_BUCKET: z.string().default('sao-blog'),
  MINIO_USE_SSL: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  UPLOAD_DIR: z.string().default('./uploads'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_WIRE_API: z.enum(['chat_completions', 'responses']).default('chat_completions'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

export const config = parsed.data
export const uploadRoot = path.isAbsolute(config.UPLOAD_DIR)
  ? config.UPLOAD_DIR
  : path.resolve(process.cwd(), config.UPLOAD_DIR)

export const isDev = config.NODE_ENV === 'development'
export const isProd = config.NODE_ENV === 'production'
export const isTest = config.NODE_ENV === 'test'
