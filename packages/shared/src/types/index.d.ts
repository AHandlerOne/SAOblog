export declare enum UserRole {
    USER = "USER",
    MODERATOR = "MODERATOR",
    ADMIN = "ADMIN"
}
export declare enum WorkType {
    ILLUSTRATION = "ILLUSTRATION",
    NOVEL = "NOVEL",
    OTHER = "OTHER"
}
export declare enum WorkStatus {
    DRAFT = "DRAFT",
    PENDING = "PENDING",
    PUBLISHED = "PUBLISHED",
    REJECTED = "REJECTED"
}
export declare enum WorkVisibility {
    VISIBLE = "VISIBLE",
    HIDDEN_BY_BAN = "HIDDEN_BY_BAN"
}
export declare enum ReportTargetType {
    WORK = "WORK",
    COMMENT = "COMMENT",
    USER = "USER"
}
export declare enum ReportStatus {
    PENDING = "PENDING",
    RESOLVED = "RESOLVED",
    DISMISSED = "DISMISSED"
}
export declare enum FileStatus {
    UPLOADED = "UPLOADED",
    PROCESSING = "PROCESSING",
    READY = "READY",
    FAILED = "FAILED"
}
export declare enum CharacterRelationType {
    LOVER = "LOVER",
    PARTNER = "PARTNER",
    FRIEND = "FRIEND",
    RIVAL = "RIVAL",
    MENTOR = "MENTOR",
    STUDENT = "STUDENT",
    FAMILY = "FAMILY",
    ENEMY = "ENEMY",
    OTHER = "OTHER"
}
export declare enum NewsCategory {
    ANIME = "ANIME",
    MOVIE = "MOVIE",
    GAME = "GAME",
    AUTHOR = "AUTHOR",
    MERCHANDISE = "MERCHANDISE",
    EVENT = "EVENT",
    OTHER = "OTHER"
}
export interface ApiResponse<T> {
    data: T;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
}
export interface ApiError {
    statusCode: number;
    error: string;
    message: string;
}
export interface PaginationQuery {
    page?: number;
    pageSize?: number;
    sort?: string;
    order?: 'asc' | 'desc';
}
//# sourceMappingURL=index.d.ts.map