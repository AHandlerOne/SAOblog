---
name: project-docker-guard
description: "Use before and after every project change. Enforces Docker deployability and Prisma schema consistency."
---

执行本仓库变更前后，必须执行以下守护规则：

1. **Docker 可部署性必须成立**
   - 任何涉及后端、前端、Dockerfile、依赖、构建脚本、环境变量、数据库模型的改动后，必须确保镜像可构建。
   - 最低要求：`docker compose build server web` 成功。
   - 若仅改后端也至少保证：`docker compose build server` 成功。

2. **Prisma schema 必须三份一致**
   - 以下文件涉及同一数据模型，新增/修改模型、字段、枚举、关系时必须同步：
     - `packages/server/prisma/schema.prisma`
     - `packages/server/prisma/schema-postgres.prisma`
     - `packages/server/prisma/schema-sqlite.prisma`
   - 特别注意：Docker 构建中会把 `schema-postgres.prisma` 复制为 `schema.prisma`，因此只改其一会导致构建或类型错误。

3. **Prisma Client 生成链路必须可用**
   - 与 Prisma 相关变更后，确保生成流程可运行（例如 Docker 内 `npx prisma generate`）。
   - 若网络受限导致引擎下载失败，优先保持镜像源与重试策略，不得回退为“跳过 generate”。

4. **交付前阻断条件**
   - 只要 Docker 构建失败、Prisma 三份 schema 不一致、或 generate 失败，就不能宣告完成。
   - 必须先修复，再继续后续实现或交付说明。

