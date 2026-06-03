// Role hierarchy levels (higher number = more permissions)
export const ROLE_HIERARCHY = {
    USER: 0,
    MODERATOR: 1,
    ADMIN: 2,
};
// API defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;
// Auth
export const ACCESS_TOKEN_EXPIRES_IN = '15m';
export const REFRESH_TOKEN_EXPIRES_DAYS = 7;
// Upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_DAILY_UPLOADS = 50;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const THUMBNAIL_SIZES = [800, 400];
// Cache TTL (seconds)
export const CACHE_TTL = {
    HOME_FEATURED: 300, // 5min
    CHARACTER_DETAIL: 600, // 10min
    GALLERY_LIST: 300, // 5min
    ARCS_LIST: 1800, // 30min
    WORKS_HOT: 600, // 10min
    WORK_DETAIL: 300, // 5min
    USER_WORKS: 600, // 10min
};
// Rate limits
export const RATE_LIMITS = {
    GLOBAL: { max: 100, timeWindow: '1m' },
    LOGIN_IP: { max: 10, timeWindow: '1m' },
    LOGIN_ACCOUNT: { max: 5, timeWindow: '1m' },
    UPLOAD: { max: 20, timeWindow: '1m' },
};
//# sourceMappingURL=index.js.map