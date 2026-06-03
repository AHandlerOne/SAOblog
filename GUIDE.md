# SAO Blog 用户操作指南 & 运维手册

## 目录

- [一、快速启动](#一快速启动)
- [二、访问地址](#二访问地址)
- [三、用户操作指南](#三用户操作指南)
- [四、运维指南](#四运维指南)
- [五、数据管理](#五数据管理)

---

## 一、快速启动

### 前置条件

- Docker Desktop 已安装并运行
- 项目代码已克隆到本地

### 启动所有服务

```bash
# 在项目根目录下执行
docker compose up -d --build
```

首次启动需要构建镜像，大约需要 3-5 分钟。启动完成后，所有服务会自动运行。

### 查看服务状态

```bash
docker compose ps
```

所有服务状态应为 `Up` / `healthy`。

### 停止所有服务

```bash
docker compose down
```

> 数据保存在 Docker 卷中，停止服务不会丢失数据。如需清除数据，使用 `docker compose down -v`。

---

## 二、访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| **前端网站** | http://localhost | Vue 3 前端，端口 80 |
| **后端 API** | http://localhost:3000 | Fastify REST API |
| **MinIO 控制台** | http://localhost:9001 | 对象存储管理（minioadmin / minioadmin）|
| **健康检查** | http://localhost:3000/health | API 健康状态 |

---

## 三、用户操作指南

### 3.1 注册账号

1. 访问 http://localhost，点击右上角「注册」
2. 填写邮箱、昵称和密码
3. 提交后自动登录

### 3.2 浏览内容

无需登录即可浏览以下公开内容：

- **剧情攻略**：查看 6 个篇章（艾恩葛朗特、妖精之舞、幽灵子弹、圣剑、圣母圣咏、Alicization）的详细介绍和章节剧情
- **人物图鉴**：查看 15 位角色的详细资料（含声优、武器、所属、登场篇章）
- **新闻资讯**：查看最新 SAO 相关新闻
- **壁纸图库**：浏览精选壁纸
- **社区作品**：查看用户投稿的二次创作

### 3.3 社区功能（需登录）

- **发布作品**：登录后可上传图片、撰写文章
- **点赞 / 收藏**：对喜欢的作品进行互动
- **评论**：在作品下方发表评论

### 3.4 管理员功能

注册后默认角色为 `USER`，需手动在数据库中将角色改为 `ADMIN` 才能访问管理后台：

```bash
# 将用户提升为管理员
docker exec sao-postgres psql -U sao -d sao_blog -c \
  "UPDATE users SET role = 'ADMIN' WHERE email = '你的邮箱';"
```

管理后台地址：http://localhost/admin

管理员可执行：
- 内容管理（增删改剧情、角色、新闻、壁纸）
- 用户管理（封禁/解封、角色分配）
- 作品审核
- 举报处理

---

## 四、运维指南

### 4.1 查看服务日志

```bash
# 查看所有服务日志
docker compose logs

# 查看特定服务日志
docker compose logs server       # 后端 API
docker compose logs web          # 前端 Nginx
docker compose logs postgres     # 数据库
docker compose logs redis        # 缓存

# 实时跟踪日志（Ctrl+C 退出）
docker compose logs -f server

# 查看最近 100 行日志
docker compose logs --tail 100 server
```

### 4.2 查看数据库

#### 方式一：命令行（psql）

```bash
# 进入 PostgreSQL 命令行
docker exec -it sao-postgres psql -U sao -d sao_blog

# 常用 SQL 查询
\d                              -- 列出所有表
SELECT * FROM arcs;             -- 查看剧情篇章
SELECT id, email, nickname, role FROM users;  -- 查看用户
SELECT COUNT(*) FROM characters; -- 角色数量
SELECT COUNT(*) FROM wallpapers; -- 壁纸数量
\q                              -- 退出
```

#### 方式二：Prisma Studio（可视化界面）

在 Windows (PowerShell) 下运行：
```powershell
cd packages/server
$env:DATABASE_URL="postgresql://sao:sao123@localhost:5432/sao_blog"; npx prisma studio
```

在 macOS / Linux 下运行：
```bash
cd packages/server
DATABASE_URL="postgresql://sao:sao123@localhost:5432/sao_blog" npx prisma studio
```

浏览器打开 http://localhost:5555 即可查看和编辑所有数据。

#### 方式三：直接查询

```bash
# 快速查看数据统计
docker exec sao-postgres psql -U sao -d sao_blog -c \
  "SELECT 'arcs' as table_name, COUNT(*) FROM arcs UNION ALL
   SELECT 'characters', COUNT(*) FROM characters UNION ALL
   SELECT 'chapters', COUNT(*) FROM story_chapters UNION ALL
   SELECT 'news', COUNT(*) FROM news UNION ALL
   SELECT 'wallpapers', COUNT(*) FROM wallpapers UNION ALL
   SELECT 'users', COUNT(*) FROM users;"
```

### 4.3 服务管理

```bash
# 重启单个服务
docker compose restart server

# 重启所有服务
docker compose restart

# 重新构建并启动（代码更新后）
docker compose up -d --build server

# 查看资源使用情况
docker stats --no-stream
```

### 4.4 重新填充数据

当需要重置或更新种子数据时：

```bash
# 清空所有内容数据（保留用户）
docker exec sao-postgres psql -U sao -d sao_blog -c "
  TRUNCATE wallpapers, story_chapters, character_arcs, characters, arcs, news CASCADE;
"

# 重新运行种子脚本
cd packages/server

# Windows (PowerShell):
$env:DATABASE_URL="postgresql://sao:sao123@localhost:5432/sao_blog"; npx tsx prisma/seed.ts

# macOS / Linux:
DATABASE_URL="postgresql://sao:sao123@localhost:5432/sao_blog" npx tsx prisma/seed.ts
```

> 注意：此操作会删除所有剧情、角色、新闻等数据并重新创建。

### 4.5 数据库备份与恢复

```bash
# 备份
docker exec sao-postgres pg_dump -U sao sao_blog > backup_$(date +%Y%m%d).sql

# 恢复
cat backup_20260515.sql | docker exec -i sao-postgres psql -U sao -d sao_blog
```

### 4.6 MinIO 对象存储管理

- **控制台**：http://localhost:9001
- **用户名**：minioadmin
- **密码**：minioadmin
- **存储桶**：sao-blog（公开读取）

可通过控制台上传图片、管理文件。

### 4.7 Redis 缓存管理

```bash
# 连接 Redis
docker exec -it sao-redis redis-cli

# 常用命令
KEYS *              -- 查看所有缓存键
GET cache:arcs      -- 查看剧情缓存
DBSIZE              -- 缓存条目数
FLUSHALL            -- 清空所有缓存（谨慎使用）
```

### 4.8 常见问题排查

| 问题 | 排查命令 | 解决方案 |
|------|---------|---------|
| 前端无法访问 | `docker compose ps web` | 确认 web 容器正常运行 |
| API 返回空数据 | `docker compose logs server` | 检查数据库连接，重新 seed |
| 数据库连接失败 | `docker compose logs postgres` | 确认 postgres 健康：`docker exec sao-postgres pg_isready` |
| 图片上传失败 | 检查 MinIO 控制台 | 确认 sao-blog 存储桶存在且为公开 |
| 服务启动失败 | `docker compose logs <服务名>` | 查看错误日志定位原因 |

### 4.9 端口映射

| 端口 | 服务 | 用途 |
|------|------|------|
| 80 | web (Nginx) | 前端访问入口 |
| 3000 | server (Fastify) | 后端 API |
| 5432 | postgres | 数据库（可外部连接） |
| 6379 | redis | 缓存（可外部连接） |
| 9000 | minio | 对象存储 API |
| 9001 | minio | 对象存储控制台 |

---

## 五、数据管理

### 当前种子数据统计

| 数据类型 | 数量 | 说明 |
|---------|------|------|
| 剧情篇章 | 6 | 艾恩葛朗特 → Alicization |
| 角色 | 15 | 桐人、亚丝娜、莉法、诗乃、尤基等 |
| 角色关联 | 39 | 角色与篇章的登场关系 |
| 剧情章节 | 19 | 每个篇章 2-4 章 |
| 新闻 | 6 | 动画/游戏/活动资讯 |
| 壁纸 | 13 | 各篇章/角色的精选壁纸 |

### 数据库连接信息

| 参数 | 值 |
|------|-----|
| 主机 | localhost（外部）/ postgres（Docker 内部） |
| 端口 | 5432 |
| 用户名 | sao |
| 密码 | sao123 |
| 数据库 | sao_blog |
| 连接串 | `postgresql://sao:sao123@localhost:5432/sao_blog` |
