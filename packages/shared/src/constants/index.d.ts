export declare const ROLE_HIERARCHY: Record<string, number>;
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 50;
export declare const ACCESS_TOKEN_EXPIRES_IN = "15m";
export declare const REFRESH_TOKEN_EXPIRES_DAYS = 7;
export declare const MAX_FILE_SIZE: number;
export declare const MAX_DAILY_UPLOADS = 50;
export declare const ALLOWED_IMAGE_TYPES: string[];
export declare const THUMBNAIL_SIZES: readonly [800, 400];
export declare const CACHE_TTL: {
    readonly HOME_FEATURED: 300;
    readonly CHARACTER_DETAIL: 600;
    readonly GALLERY_LIST: 300;
    readonly ARCS_LIST: 1800;
    readonly WORKS_HOT: 600;
    readonly WORK_DETAIL: 300;
    readonly USER_WORKS: 600;
};
export declare const RATE_LIMITS: {
    readonly GLOBAL: {
        readonly max: 100;
        readonly timeWindow: "1m";
    };
    readonly LOGIN_IP: {
        readonly max: 10;
        readonly timeWindow: "1m";
    };
    readonly LOGIN_ACCOUNT: {
        readonly max: 5;
        readonly timeWindow: "1m";
    };
    readonly UPLOAD: {
        readonly max: 20;
        readonly timeWindow: "1m";
    };
};
//# sourceMappingURL=index.d.ts.map