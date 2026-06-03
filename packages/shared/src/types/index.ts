// User roles
export enum UserRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

// Work types
export enum WorkType {
  ILLUSTRATION = 'ILLUSTRATION',
  NOVEL = 'NOVEL',
  OTHER = 'OTHER',
}

// Work status
export enum WorkStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
}

// Work visibility
export enum WorkVisibility {
  VISIBLE = 'VISIBLE',
  HIDDEN_BY_BAN = 'HIDDEN_BY_BAN',
}

// Report target type
export enum ReportTargetType {
  WORK = 'WORK',
  COMMENT = 'COMMENT',
  USER = 'USER',
}

// Report status
export enum ReportStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

// File processing status
export enum FileStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

// Relation types for characters
export enum CharacterRelationType {
  LOVER = 'LOVER',
  PARTNER = 'PARTNER',
  FRIEND = 'FRIEND',
  RIVAL = 'RIVAL',
  MENTOR = 'MENTOR',
  STUDENT = 'STUDENT',
  FAMILY = 'FAMILY',
  ENEMY = 'ENEMY',
  OTHER = 'OTHER',
}

// News categories
export enum NewsCategory {
  ANIME = 'ANIME',
  MOVIE = 'MOVIE',
  GAME = 'GAME',
  AUTHOR = 'AUTHOR',
  MERCHANDISE = 'MERCHANDISE',
  EVENT = 'EVENT',
  OTHER = 'OTHER',
}

// API response types
export interface ApiResponse<T> {
  data: T
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiError {
  statusCode: number
  error: string
  message: string
}

// Pagination query
export interface PaginationQuery {
  page?: number
  pageSize?: number
  sort?: string
  order?: 'asc' | 'desc'
}
