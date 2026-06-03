---
name: project-docker-guard
description: "Use before and after every project change. Enforces Docker deployability and Prisma schema consistency."
---

执行本仓库变更前后，必须执行以下守护规则：

1. Docker 相关改动后，至少保证 `docker compose build server web`（或最少 `docker compose build server`）可通过。
2. Prisma 三份 schema（`schema.prisma` / `schema-postgres.prisma` / `schema-sqlite.prisma`）必须同步一致。
3. `npx prisma generate` 链路必须可用，不能以“跳过 generate”规避失败。
4. 若上述任一失败，不能宣告任务完成。

