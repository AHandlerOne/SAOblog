import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    nickname: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    nickname: string;
}, {
    email: string;
    password: string;
    nickname: string;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const createWorkSchema: z.ZodObject<{
    type: z.ZodEnum<["ILLUSTRATION", "NOVEL", "OTHER"]>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    coverImage: z.ZodOptional<z.ZodString>;
    images: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    characterTags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "ILLUSTRATION" | "NOVEL" | "OTHER";
    title: string;
    description?: string | undefined;
    summary?: string | undefined;
    content?: string | undefined;
    tags?: string[] | undefined;
    coverImage?: string | undefined;
    images?: string[] | undefined;
    characterTags?: string[] | undefined;
}, {
    type: "ILLUSTRATION" | "NOVEL" | "OTHER";
    title: string;
    description?: string | undefined;
    summary?: string | undefined;
    content?: string | undefined;
    tags?: string[] | undefined;
    coverImage?: string | undefined;
    images?: string[] | undefined;
    characterTags?: string[] | undefined;
}>;
export declare const createCommentSchema: z.ZodObject<{
    content: z.ZodString;
    parentId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    content: string;
    parentId?: string | undefined;
}, {
    content: string;
    parentId?: string | undefined;
}>;
export declare const createReportSchema: z.ZodObject<{
    targetType: z.ZodEnum<["WORK", "COMMENT", "USER"]>;
    targetId: z.ZodString;
    reason: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    targetType: "USER" | "WORK" | "COMMENT";
    targetId: string;
    reason: string;
    description?: string | undefined;
}, {
    targetType: "USER" | "WORK" | "COMMENT";
    targetId: string;
    reason: string;
    description?: string | undefined;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    sort: z.ZodOptional<z.ZodString>;
    order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    order: "asc" | "desc";
    sort?: string | undefined;
}, {
    sort?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    order?: "asc" | "desc" | undefined;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateWorkInput = z.infer<typeof createWorkSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
//# sourceMappingURL=index.d.ts.map