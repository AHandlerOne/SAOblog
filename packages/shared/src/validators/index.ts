import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  nickname: z.string().min(2, 'Nickname must be at least 2 characters').max(20, 'Nickname must be at most 20 characters'),
})

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Please enter your password'),
})

export const createWorkSchema = z.object({
  type: z.enum(['ILLUSTRATION', 'NOVEL', 'OTHER']),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  summary: z.string().max(500, 'Summary must be at most 500 characters').optional(),
  content: z.string().optional(),
  tags: z.array(z.string().max(20)).max(10, 'At most 10 tags').optional(),
  coverImage: z.string().optional(),
  images: z.array(z.string().min(1)).optional(),
  characterTags: z.array(z.string()).optional(),
  draftSizeBytes: z.number().int().min(0).max(500 * 1024 * 1024).optional(),
})

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(500, 'Comment must be at most 500 characters'),
  parentId: z.string().uuid().optional(),
})

export const createReportSchema = z.object({
  targetType: z.enum(['WORK', 'COMMENT', 'USER']),
  targetId: z.string(),
  reason: z.string().min(1, 'Please provide a reason').max(200),
  description: z.string().max(500).optional(),
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateWorkInput = z.infer<typeof createWorkSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type CreateReportInput = z.infer<typeof createReportSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
