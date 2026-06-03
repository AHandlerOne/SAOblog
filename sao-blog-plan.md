# 刀剑神域（SAO）主题创作博客 — 项目计划

## 一、项目概述

### 1.1 项目定位
一个以《刀剑神域》（Sword Art Online）为主题的综合性创作社区网站。既是 SAO 系列内容的展示平台（官方资料库），也是粉丝创作交流的社区（UGC 平台）。

### 1.2 目标用户
- SAO 系列粉丝（核心用户）：浏览剧情、人物资料，发布二创作品
- 动漫爱好者（泛用户）：发现和浏览 SAO 相关内容
- 内容创作者：发表同人图、同人文等二创作品

### 1.3 核心价值
- **内容展示**：系统化整理 SAO 剧情线、人物图鉴、官方企划信息
- **创作社区**：为粉丝提供发布和交流二创作品的平台
- **沉浸体验**：SAO 风格的 UI 设计，让用户有代入感

### 1.4 版本规划

**MVP（V1）** — 核心功能，可上线的最小产品：
- 内容展示：剧情、人物、壁纸、官方企划
- 用户系统：注册/登录、个人主页
- UGC：作品发布（同人图+同人文）、作品广场、点赞/收藏/评论
- 管理后台：内容管理、用户管理、作品审核、举报处理
- 基础设施：认证、文件上传、搜索、部署

**V2** — 增强功能，MVP 上线后迭代：
- 关注/粉丝系统
- 人物关系图（D3.js 交互式可视化）
- 创作活动（主题创作大赛+投票）
- 视频嵌入（B站/YouTube）
- 全站评论二级回复
- 高级搜索（Meilisearch/ES 替换 PostgreSQL FTS）

---

## 二、功能模块

### 2.1 内容展示模块（CMS）

#### 2.1.1 剧情介绍
- 按篇章组织（SAO、ALO、GGO、圣母圣咏、Alicization、Unital Ring 等）
- 每个篇章包含：
  - 篇章概要（一句话总结）
  - 详细剧情（分章节/分集介绍，含剧透警告）
  - 关键事件时间线
  - 登场人物列表（可点击跳转人物详情）
- 剧透保护机制：默认折叠详细内容，用户点击确认后展开

#### 2.1.2 人物图鉴
- 人物卡片展示：头像、姓名（日文/中文/英文）、声优、简介
- 人物详情页：
  - 基本信息（年龄、武器、所属阵营、登场篇章）
  - 人物壁纸图集（高清大图，支持画廊浏览）
  - 人物名言/经典台词
- 支持按篇章、阵营、角色类型筛选

#### 2.1.3 人物壁纸
- 壁纸画廊：瀑布流布局（使用 vue-waterfall-plugin 或类似成熟方案，非实验性 CSS Masonry）
- 按人物、篇章、分辨率分类
- 支持预览大图、下载（标明来源/版权信息）
- 壁纸标签系统（如"桐人"、"亚丝娜"、"双剑流"）

#### 2.1.4 官方企划
- 展示 SAO 相关的官方信息：
  - 动画各季播出信息
  - 剧场版信息
  - 游戏作品（SAO 相关游戏列表）
  - 原作者川原砾相关消息
  - 周边商品/联动活动
- 时间线形式展示

### 2.2 创作社区模块（UGC）

#### 2.2.1 用户系统
- 注册/登录（邮箱 + 密码，可选第三方登录如 GitHub）
- 用户主页：头像、昵称、简介、作品列表
- 角色体系：普通用户（USER）、内容审核员（MODERATOR）、管理员（ADMIN）

#### 2.2.2 作品发布
- **同人图**：
  - 支持多图上传（JPG/PNG/WebP，单张最大 10MB）
  - 标题、描述、标签
  - 分类：插画、漫画、壁纸等
  - 原创声明 / 角色标注
- **同人文**：
  - 富文本编辑器（支持 Markdown）
  - 标题、简介、正文
  - 按章节组织（连载支持）
  - 标签：角色CP、篇章背景、题材（冒险/日常/虐心等）
  - 字数统计

#### 2.2.3 作品审核与内容安全
- 作品状态机：草稿（DRAFT）→ 待审核（PENDING）→ 已发布（PUBLISHED）/ 已拒绝（REJECTED）
- 新发布作品默认进入 PENDING 状态，管理员/审核员审核后发布
- 用户举报机制：作品和评论支持举报，填写举报原因
- 举报处理：管理员查看举报列表，可下架作品/删除评论/封禁用户
- 封禁用户：被封禁用户无法登录，其作品自动隐藏（可逆，解封后恢复可见）

#### 2.2.4 作品浏览与互动
- 作品广场：推荐/最新/热门排序
- 分类筛选：同人图、同人文、其他
- 标签筛选和搜索
- 作品详情页：大图/全文展示
- 点赞、收藏、评论
- 评论支持一级回复（V2 升级为二级回复）
- 评论删除：仅软删除（保留 parent_id 维护回复树完整性），前端显示"该评论已删除"占位

#### 2.2.5 创作活动（V2）
- 管理员可发布主题创作活动
- 活动页面：活动说明、参赛作品展示、投票功能（含 IP/账号频率限制防刷票）

### 2.3 管理后台
- **内容管理**：剧情、人物、壁纸、官方企划的 CRUD
- **作品审核**：待审核作品列表、批量审核操作
- **举报管理**：举报列表、处理操作（下架/忽略/封禁）
- **用户管理**：用户列表、封禁/解封、角色分配
- **数据统计**：基础数据概览（用户数、作品数、评论数）

### 2.4 站点基础功能
- 全站搜索（基于 PostgreSQL FTS + GIN 索引，默认 pg_trgm 模糊匹配，可选安装 pg_jieba 增强中文分词）
- 公告系统
- 友情链接
- 关于页面 / 免责声明
- 响应式设计（适配 PC 和移动端）

---

## 三、内容版权策略

### 3.1 内容权利矩阵

| 内容类型 | 展示 | 下载 | 需授权 | 说明 |
|---------|------|------|--------|------|
| 官方剧情介绍 | ✅ 自撰摘要 | N/A | - | 基于官方作品的二次概述，非原文复制 |
| 人物基本信息 | ✅ 事实性信息 | N/A | - | 姓名、声优等公开信息 |
| 人物壁纸 | ✅ 展示 | ✅ | 标注来源 | 仅收录标注了转载来源的壁纸，提供来源链接 |
| 用户二创作品 | ✅ 展示 | ❌ 禁止 | 作者授权 | 仅展示，明确标注"未经作者授权禁止转载" |
| 官方 Logo/海报 | ❌ 禁止 | ❌ 禁止 | 需授权 | 不使用官方 Logo、海报等受版权保护的素材 |

### 3.2 免责声明
- 站点声明为非官方粉丝创作平台，与 SAO 版权方无关
- 所有二创作品版权归原作者所有
- 提供侵权举报入口，收到通知后 24 小时内处理

---

## 四、技术架构

### 4.1 技术选型

| 层级 | 技术 | 选型理由 |
|------|------|---------|
| **前端框架** | Vue 3 + TypeScript + Vite | 用户要求，生态成熟 |
| **UI 框架** | Naive UI | Vue3 原生 TS 支持，组件丰富，主题定制灵活 |
| **状态管理** | Pinia | Vue3 官方推荐 |
| **路由** | Vue Router 4 | Vue3 配套 |
| **瀑布流** | vue-waterfall-plugin-next | 成熟稳定的瀑布流方案，非实验性 API |
| **Markdown** | Markdown-it + highlight.js | 同人文编辑和渲染 |
| **SEO 预渲染** | vite-plugin-prerender | 仅预渲染 CMS 静态页（剧情/人物/壁纸/企划列表），UGC 页走 CSR |
| **后端框架** | Node.js + Fastify + TypeScript | 与前端统一 TS 生态，Fastify 性能优于 Express |
| **ORM** | Prisma | 类型安全，自动生成 TS 类型 |
| **数据库** | PostgreSQL | 关系型数据库适合结构化内容 + 全文搜索（FTS + GIN） |
| **缓存** | Redis | 热门内容缓存、API 限流、会话管理 |
| **文件存储** | 本地存储（开发）/ MinIO（生产） | 用户上传的图片 |
| **认证** | JWT (Access Token + Refresh Token Rotation) | Refresh Token 通过 HttpOnly Cookie 传输，启用 rotation |
| **密码哈希** | Argon2id | 当前最安全的密码哈希算法 |
| **图片处理** | Sharp | 服务端图片压缩、缩略图生成、EXIF 元数据清除 |
| **限流** | @fastify/rate-limit | API 限流、登录限流、投票限流 |
| **任务队列** | BullMQ (Redis) | 异步图片处理（含重试、死信队列） |

### 4.2 项目结构

```
sao-blog/
├── packages/
│   ├── web/                    # 前端
│   │   ├── src/
│   │   │   ├── api/            # API 请求封装
│   │   │   ├── assets/         # 静态资源
│   │   │   ├── components/     # 通用组件
│   │   │   │   ├── common/     # 基础组件
│   │   │   │   ├── layout/     # 布局组件
│   │   │   │   └── sao/        # SAO 风格组件
│   │   │   ├── composables/    # 组合式函数
│   │   │   ├── pages/          # 页面
│   │   │   │   ├── home/       # 首页
│   │   │   │   ├── story/      # 剧情介绍
│   │   │   │   ├── characters/ # 人物图鉴
│   │   │   │   ├── gallery/    # 壁纸画廊
│   │   │   │   ├── news/       # 官方企划
│   │   │   │   ├── community/  # 创作社区
│   │   │   │   │   ├── works/  # 作品广场
│   │   │   │   │   └── create/ # 发布作品
│   │   │   │   ├── user/       # 用户中心
│   │   │   │   └── about/      # 关于
│   │   │   ├── router/         # 路由配置
│   │   │   ├── stores/         # Pinia 状态
│   │   │   ├── styles/         # 全局样式 / SAO 主题
│   │   │   ├── types/          # TS 类型定义
│   │   │   └── utils/          # 工具函数
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── server/                 # 后端
│   │   ├── src/
│   │   │   ├── modules/        # 业务模块
│   │   │   │   ├── auth/       # 认证（注册/登录/JWT/Refresh Rotation）
│   │   │   │   ├── user/       # 用户管理
│   │   │   │   ├── story/      # 剧情内容
│   │   │   │   ├── character/  # 人物管理
│   │   │   │   ├── gallery/    # 壁纸管理
│   │   │   │   ├── news/       # 官方企划
│   │   │   │   ├── work/       # 用户作品
│   │   │   │   ├── comment/    # 评论
│   │   │   │   ├── report/     # 举报处理
│   │   │   │   └── upload/     # 文件上传
│   │   │   ├── admin/          # 管理后台 API
│   │   │   │   ├── content/    # 内容管理
│   │   │   │   ├── moderation/ # 审核/举报
│   │   │   │   └── stats/      # 数据统计
│   │   │   ├── common/         # 公共模块
│   │   │   │   ├── middleware/ # 中间件（认证、RBAC、限流、错误处理）
│   │   │   │   ├── utils/      # 工具函数
│   │   │   │   └── types/      # 共享类型
│   │   │   ├── config/         # 配置
│   │   │   └── index.ts        # 入口
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── shared/                 # 前后端共享
│       ├── src/
│       │   ├── types/          # 共享类型定义（DTO、枚举）
│       │   ├── constants/      # 共享常量
│       │   └── validators/     # 共享校验规则（zod schemas）
│       ├── tsconfig.json
│       └── package.json
│
├── data/                       # 种子数据（剧情、人物等初始数据）
│   ├── stories/                # 剧情数据（JSON）
│   ├── characters/             # 人物数据（JSON）
│   └── wallpapers/             # 壁纸元数据（JSON）
│
├── docker-compose.yml          # 一键部署
├── package.json                # Monorepo 根配置（pnpm workspace）
├── pnpm-workspace.yaml
└── README.md
```

### 4.3 权限矩阵（RBAC）

| 资源/操作 | 游客 | 普通用户 | 审核员 | 管理员 |
|----------|------|---------|--------|--------|
| 浏览内容 | ✅ | ✅ | ✅ | ✅ |
| 注册/登录 | ✅ | - | - | - |
| 发布作品 | ❌ | ✅ | ✅ | ✅ |
| 编辑/删除自己作品 | ❌ | ✅ | ✅ | ✅ |
| 删除任意作品 | ❌ | ❌ | ❌ | ✅ |
| 审核作品 | ❌ | ❌ | ✅ | ✅ |
| 管理用户（封禁/角色） | ❌ | ❌ | ❌ | ✅ |
| 管理官方内容 | ❌ | ❌ | ❌ | ✅ |
| 处理举报 | ❌ | ❌ | ✅ | ✅ |
| 查看数据统计 | ❌ | ❌ | ❌ | ✅ |

权限通过 Fastify 路由中间件强制校验，每个 API 路由声明所需最低角色。

### 4.4 数据库设计

#### 约束与策略
- 所有时间字段统一使用 UTC 时区存储，`timestamptz` 类型
- 唯一约束：`Like(userId, workId)`、`Favorite(userId, workId)`、`Follow(followerId, followingId)`、`User(email)`、`WorkVote(userId, eventEntryId)`
- 外键策略：级联删除仅在明确需要的场景使用（如 WorkImage 随 Work 删除），其余使用 `SET NULL` 或 `RESTRICT`
- 软删除：User、Work、Comment 表添加 `deleted_at` 字段，通过 Prisma middleware 实现

#### 核心表

```sql
-- 用户（含软删除）
User (id UUID PK, email UNIQUE, password_hash, nickname, avatar, bio,
     role ENUM(USER/MODERATOR/ADMIN) DEFAULT USER,
     is_banned BOOLEAN DEFAULT false, deleted_at TIMESTAMPTZ,
     created_at, updated_at)

-- 用户关系（关注/粉丝）
Follow (follower_id UUID FK→User, following_id UUID FK→User,
        UNIQUE(follower_id, following_id), created_at)

-- 篇章
Arc (id SERIAL PK, name, name_ja, name_en, season, sort_order,
     synopsis, cover_image, created_at)

-- 剧情章节
StoryChapter (id SERIAL PK, arc_id FK→Arc ON DELETE CASCADE,
              title, content TEXT, chapter_number, is_spoiler DEFAULT false, created_at)

-- 人物
Character (id SERIAL PK, name, name_ja, name_en, cv, avatar,
           description TEXT, weapon, affiliation, created_at)

-- 人物-篇章关联（多对多）
CharacterArc (character_id FK→Character, arc_id FK→Arc,
              role, PRIMARY KEY(character_id, arc_id))

-- 人物壁纸
Wallpaper (id SERIAL PK, title, character_id FK→Character ON DELETE SET NULL,
           arc_id FK→Arc ON DELETE SET NULL,
           image_url, resolution, source_url, -- 来源标注
           tags TEXT[], created_at)

-- 官方企划
News (id SERIAL PK, title, content TEXT, category,
      cover_image, published_at TIMESTAMPTZ, created_at)

-- 用户作品（含软删除、审核状态）
Work (id UUID PK, author_id FK→User ON DELETE RESTRICT,
      type ENUM(ILLUSTRATION/NOVEL/OTHER),
      title, description, content TEXT,
      cover_image, tags TEXT[],
      status ENUM(DRAFT/PENDING/PUBLISHED/REJECTED) DEFAULT DRAFT,
      visibility ENUM(VISIBLE/HIDDEN_BY_BAN) DEFAULT VISIBLE,
      reject_reason TEXT, -- 审核拒绝原因
      view_count INT DEFAULT 0, like_count INT DEFAULT 0,
      deleted_at TIMESTAMPTZ,
      created_at, updated_at)

-- 作品图片
WorkImage (id SERIAL PK, work_id FK→Work ON DELETE CASCADE,
           image_url, sort_order)

-- 同人文章节
NovelChapter (id SERIAL PK, work_id FK→Work ON DELETE CASCADE,
              title, content TEXT, word_count INT,
              chapter_number, published_at TIMESTAMPTZ)

-- 点赞（复合唯一约束防重复）
Like (user_id FK→User, work_id FK→Work,
      PRIMARY KEY(user_id, work_id), created_at)

-- 收藏（复合唯一约束防重复）
Favorite (user_id FK→User, work_id FK→Work,
          PRIMARY KEY(user_id, work_id), created_at)

-- 评论（含软删除、一级回复，仅软删除保留回复树）
Comment (id UUID PK, work_id FK→Work ON DELETE CASCADE,
         author_id FK→User ON DELETE RESTRICT,
         content TEXT, parent_id FK→Comment ON DELETE RESTRICT,
         deleted_at TIMESTAMPTZ,
         created_at)

-- 举报
Report (id SERIAL PK, reporter_id FK→User,
        target_type ENUM(WORK/COMMENT/USER),
        target_id UUID, reason, description,
        status ENUM(PENDING/RESOLVED/DISMISSED) DEFAULT PENDING,
        handled_by FK→User nullable,
        created_at, resolved_at)

-- Refresh Token 会话（用于 rotation 竞态检测）
Session (id UUID PK, user_id FK→User, current_jti VARCHAR,
        token_family VARCHAR, -- 同一登录会话的 token 族，重放时整族吊销
        expires_at TIMESTAMPTZ, created_at)

-- 封禁记录（审计追踪）
BanRecord (id SERIAL PK, user_id FK→User,
           reason TEXT, banned_by FK→User,
           created_at, unbanned_at TIMESTAMPTZ nullable,
           unbanned_by FK→User nullable)

-- 创作活动（V2）
Event (id SERIAL PK, title, description TEXT, cover_image,
       start_date, end_date, status, created_at)

-- 活动参赛作品（V2）
EventEntry (event_id FK→Event, work_id FK→Work,
            vote_count INT DEFAULT 0,
            PRIMARY KEY(event_id, work_id))
```

### 4.5 API 设计

#### 通用约定
- 分页：`GET /api/xxx?page=1&pageSize=20`，响应 `{ data, total, page, pageSize }`
- 排序：`sort=createdAt&order=desc`
- 认证：Access Token 通过 `Authorization: Bearer <token>` 请求头传递
- Refresh Token：通过 `HttpOnly + Secure + SameSite=Strict` Cookie 传递
- 错误响应格式：`{ statusCode, error, message }`
- 所有时间字段返回 ISO 8601 格式（UTC）

#### 认证
- `POST /api/auth/register` — 注册
- `POST /api/auth/login` — 登录（设置 Refresh Token Cookie）
- `POST /api/auth/logout` — 登出（清除 Cookie、吊销 Refresh Token）
- `POST /api/auth/refresh` — 刷新 Token（Refresh Token Rotation）
- `GET /api/auth/me` — 获取当前用户

#### 剧情
- `GET /api/arcs` — 篇章列表
- `GET /api/arcs/:id` — 篇章详情
- `GET /api/arcs/:id/chapters` — 章节列表（支持分页、剧透过滤）

#### 人物
- `GET /api/characters` — 人物列表（支持筛选、分页）
- `GET /api/characters/:id` — 人物详情
- `GET /api/characters/:id/wallpapers` — 人物壁纸

#### 壁纸
- `GET /api/wallpapers` — 壁纸列表（支持筛选、分页）
- `GET /api/wallpapers/:id` — 壁纸详情

#### 官方企划
- `GET /api/news` — 企划列表（分页、分类筛选）
- `GET /api/news/:id` — 企划详情

#### 作品（UGC）
- `GET /api/works` — 作品广场（仅返回 PUBLISHED 且 VISIBLE 状态，筛选、排序、分页）
- `GET /api/works/:id` — 作品详情
- `POST /api/works` — 创建作品（状态 → PENDING）
- `PUT /api/works/:id` — 编辑作品（仅作者，DRAFT/PENDING 状态可编辑）
- `DELETE /api/works/:id` — 软删除作品（仅作者/管理员）

#### 互动
- `POST /api/works/:id/like` — 点赞/取消点赞
- `POST /api/works/:id/favorite` — 收藏/取消收藏

#### 评论
- `GET /api/works/:id/comments` — 评论列表（分页，排除已软删除）
- `POST /api/works/:id/comments` — 发表评论（需登录）
- `DELETE /api/comments/:id` — 软删除评论（仅作者/管理员）

#### 举报
- `POST /api/reports` — 提交举报（需登录）
- `GET /api/admin/reports` — 举报列表（管理员/审核员）
- `PUT /api/admin/reports/:id` — 处理举报（管理员/审核员）

#### 用户
- `GET /api/users/:id` — 用户主页
- `GET /api/users/:id/works` — 用户作品

#### 管理后台
- `POST /api/admin/works/:id/approve` — 审核通过
- `POST /api/admin/works/:id/reject` — 审核拒绝（附原因）
- `GET /api/admin/users` — 用户列表
- `PUT /api/admin/users/:id/ban` — 封禁用户（记录原因，作品设为 HIDDEN_BY_BAN）
- `PUT /api/admin/users/:id/unban` — 解封用户（作品恢复 VISIBLE，记录操作）
- `PUT /api/admin/users/:id/role` — 修改角色
- `GET /api/admin/stats` — 数据统计

#### 文件上传
- `POST /api/upload/image` — 上传图片（需登录，返回 URL）

---

## 五、认证安全设计

### 5.1 JWT 认证流程
1. 用户登录 → 服务端验证密码（Argon2id）→ 返回 Access Token（15min）+ 设置 Refresh Token Cookie（7天）
2. Access Token 过期 → 前端自动调用 `/api/auth/refresh` → 服务端验证 Refresh Token → CAS 原子校验（仅当 `presented_jti == current_jti` 时签发新 RT，防止并发刷新竞态）→ 签发新 Access Token + 新 Refresh Token（旧 jti 加入黑名单）
3. Refresh Token 泄露 → 攻击者使用旧 RT 刷新时 `jti != current_jti` → 判定重放 → 吊销整个 token family
4. 登出 → 清除 Cookie + 将 Refresh Token jti 加入黑名单（Redis，TTL = Token 剩余有效期，自动过期清理）

### 5.2 安全措施
- 密码：Argon2id 哈希，最小 8 位，含大小写+数字
- 登录限流：IP + 账号双维度限流（IP 10 次/分钟，同一账号 5 次/分钟），超过后锁定 15 分钟
- 反向代理配置：Fastify `trustProxy` 精确配置代理层数，入口网关清洗 `X-Forwarded-For` 后注入真实 IP，限流 key 使用 `IP + accountId`
- Refresh Token：仅通过 HttpOnly + Secure + SameSite=Strict Cookie 传输，不暴露给 JS
- Token Rotation：每次刷新生成新 Refresh Token，旧 Token 立即失效（黑名单 TTL = Token 剩余有效期）

---

## 六、文件上传安全

### 6.1 上传流程
1. 前端校验：文件类型、大小（10MB）
2. 后端校验：MIME 类型（通过 magic bytes 检测，非扩展名）、文件大小
3. 文件写入私有区域（不可公开访问），状态设为 `UPLOADED`
4. 将处理任务投递到 BullMQ 队列（任务幂等键 = fileId，防重复处理）
5. 图片处理（异步，不阻塞上传响应，BullMQ 消费者执行）：
   - Sharp 压缩：生成缩略图（宽度 800px、400px 两档）
   - EXIF 元数据清除（隐私保护）
   - 格式统一转为 WebP（质量 85%）
5. 处理完成 → 文件移至公开区域，状态设为 `READY`，仅 READY 状态的文件可通过公开 URL 访问
6. 上传响应立即返回（含文件 ID），前端通过文件 ID 轮询或 SSE 确认处理完成
7. 任务可靠性：
   - BullMQ 自动重试（最多 3 次），死信队列人工处理
   - 执行阶段幂等：数据库条件更新（如 `UPDATE files SET status='PROCESSING' WHERE id=? AND status='UPLOADED'`，仅匹配成功才继续处理）
   - WorkScore 使用 UPSERT + updated_at 时间戳防重复生效
   - 定时器回收超时卡在 PROCESSING 的文件

### 6.2 安全限制
- 允许类型：JPG、PNG、WebP（通过 magic bytes 校验）
- 单文件大小：10MB
- 单用户每日上传上限：50 张
- 文件名：UUID 重命名，防止路径遍历

---

## 七、缓存策略

| 数据 | 缓存键 | TTL | 失效策略 |
|------|--------|-----|---------|
| 首页榜单 | `home:featured` | 5min | 管理员修改内容 / 作品审核通过时清除 |
| 人物详情 | `char:{id}` | 10min | 管理员编辑人物时清除 |
| 壁纸列表 | `gallery:{page}:{filters}` | 5min | 新增壁纸时清除相关缓存 |
| 篇章列表 | `arcs:list` | 30min | 管理员编辑时清除 |
| 热门作品 | `works:hot` | 10min | 定时刷新 + 作品审核通过/点赞/收藏时更新 |
| 作品详情 | `work:{id}` | 5min | 点赞/收藏/评论变更时清除 |
| 用户作品列表 | `user:{id}:works` | 10min | 用户发布/作品状态变更时清除 |

失效触发事件（直接 Redis DEL，无需消息队列）：
- 作品审核通过 → 清除 `home:featured`、`works:hot`、相关分类缓存
- 作品被点赞/收藏 → 清除该作品 `work:{id}`、更新 `works:hot`
- 评论新增/删除 → 清除该作品 `work:{id}`
- 用户封禁/解封 → 清除该用户 `user:{id}:works`、`works:hot`

---

## 八、搜索实现

### MVP 方案：PostgreSQL pg_trgm 模糊搜索
- 使用 `pg_trgm` 扩展 + GIN 索引（`gin_trgm_ops`）
- 搜索范围：Work（标题+描述+标签）、Character（姓名）、StoryChapter（标题）
- 统一 SQL 路径（不混用 tsvector）：
  - 标题/标签列：` similarity(title, keyword) * 2 + similarity(tags::text, keyword) * 1.5 ` （高权重，GIN 索引加速）
  - 正文/描述列：` similarity(description, keyword) ` （低权重，辅助匹配）
  - 统一排序：`ORDER BY weighted_similarity DESC`
- 可选增强（pg_jieba）：Docker 启动时检测，可用时自动切换为 `pg_jieba 分词 + tsvector GIN`，权重公式不变
- 搜索 API：`GET /api/search?q={keyword}&type={work|character|all}&page=1&pageSize=20`

### V2 方案
- 当用户反馈搜索质量不佳，或数据量超过 10 万条时，切换到 Meilisearch（轻量级全文搜索引擎，中文支持好，部署简单）

---

## 九、推荐/热门排序算法

### 热度公式（加权参与度 + 时间衰减）
```
engagement = like_count * 1 + favorite_count * 2 + comment_count * 3
```
权重说明：收藏比点赞意愿更强（×2），评论参与度最高（×3）

### 时间衰减
```
final_score = engagement / (hours_since_published + 2)^1.5
```

### 反作弊权重
- 新注册账号（< 7 天）的互动权重降为 0.5
- 同一用户对同一作品的重复点赞/收藏只计一次（数据库唯一约束保证）
- 异常高频互动（如 1 分钟内对 10+ 作品点赞）触发人工审核标记

### 预计算机制
- MVP：作品广场直接查询计算热度分数（数据量小，性能足够）
- V2：当作品数超过 1 万时，引入 `WorkScore` 聚合表 + 定时任务预计算

---

## 九、UI/UX 设计方向

### 9.1 设计风格
- **主色调**：SAO 经典配色 — 深蓝/黑背景（#1a1a2e）、蓝绿色强调（#00d4ff / #4ECDC4）、白色文字
- **风格参考**：游戏 UI 风格，毛玻璃效果、科技感边框、光效装饰
- **字体**：思源黑体（中文）、Noto Sans（英文/日文）

### 9.2 核心页面
1. **首页**：轮播图（最新活动/官方新闻）+ 推荐作品 + 人气人物 + 最新壁纸
2. **剧情页**：篇章时间线导航 + 剧情卡片式展示
3. **人物图鉴**：角色卡片网格 + 筛选栏 + 搜索
4. **壁纸画廊**：瀑布流 + Lightbox 大图预览
5. **作品广场**：卡片流布局 + 筛选/排序/搜索
6. **作品发布页**：表单 + 图片上传 + Markdown 编辑器
7. **用户主页**：个人信息 + 作品展示
8. **管理后台**：侧边栏导航 + 数据表格 + 审核操作面板

---

## 十、开发计划

### Phase 1：基础框架搭建（第 1-2 周）
- [ ] 初始化 Monorepo 项目（pnpm workspace + shared 包）
- [ ] 搭建前端项目（Vue3 + Vite + Naive UI + 路由 + Pinia）
- [ ] 搭建后端项目（Fastify + Prisma + PostgreSQL + Redis）
- [ ] 设计并实现数据库 Schema（含约束、索引、软删除）
- [ ] 实现 JWT 认证模块（含 Refresh Token Rotation）
- [ ] 实现 RBAC 中间件
- [ ] 实现文件上传模块（含异步图片处理、EXIF 清除）
- [ ] SAO 主题 UI 基础组件（按钮、卡片、导航栏等）
- [ ] Docker Compose 开发环境

### Phase 2：内容展示模块（第 3-4 周）
- [ ] 篇章/剧情 CRUD 及前端页面
- [ ] 人物图鉴 CRUD 及前端页面
- [ ] 壁纸画廊 API + 瀑布流前端
- [ ] 官方企划 CRUD 及前端页面
- [ ] PostgreSQL FTS 搜索 API
- [ ] 编写种子数据（至少覆盖 SAO、ALO、GGO、Alicization 四个篇章）
- [ ] 内容页面预渲染（vite-plugin-prerender，仅 CMS 静态页：剧情/人物/壁纸/企划）

### Phase 3：创作社区 + 管理后台（第 5-7 周）
- [ ] 用户注册/登录/个人主页
- [ ] 作品发布（同人图 + 同人文）含审核流程
- [ ] 作品广场（浏览、筛选、搜索）
- [ ] 点赞、收藏、评论系统
- [ ] 举报系统
- [ ] 管理后台（内容管理、审核、用户管理、统计）
- [ ] 响应式适配

### Phase 4：优化与部署（第 8 周）
- [ ] Redis 缓存策略实现
- [ ] 性能优化（图片懒加载、API 响应优化）
- [ ] SEO 优化（meta 标签、sitemap、robots.txt）
- [ ] 结构化日志（pino）
- [ ] 数据库自动备份脚本
- [ ] 部署方案（Docker Compose 生产配置）

---

## 十一、非功能性需求

- **安全**：
  - XSS 防护（服务端为信任边界）：
    - 同人文：`markdown-it` 配置 `html: false`，服务端渲染时使用 `DOMPurify`（服务端版）净化输出
    - 评论/作品简介：服务端存储前使用 `sanitize-html` 白名单净化（仅允许基础格式标签）
    - 全局 CSP 响应头：`Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`
  - CSRF 保护：
    - SameSite=Strict Cookie（基础防线）
    - 对所有依赖 Cookie 的状态变更接口（/auth/refresh、/auth/logout）强制 Origin/Referer 白名单校验
    - 无任何 GET 请求修改状态
  - SQL 注入防护：Prisma 参数化查询
  - 文件上传：magic bytes 校验 + UUID 文件名 + 文件状态机隔离 + EXIF 清除
  - 认证：Argon2id + JWT Rotation + HttpOnly Cookie
  - API 限流：@fastify/rate-limit
- **性能**：图片缩略图（Sharp 多尺寸）、Redis 缓存、API 响应 < 200ms、首屏加载 < 3s
- **可维护性**：前后端 TypeScript 类型共享（packages/shared）、结构化日志（pino）
- **版权合规**：内容权利矩阵（见第三章）、原创声明、来源标注、侵权举报入口、DMCA 免责声明
- **数据备份**：
  - PostgreSQL：每日自动备份（pg_dump），保留最近 7 天
  - MinIO：启用 Bucket Versioning，定时同步到备份目录
  - 恢复验证：每月在临时环境执行一次 `pg_restore` + MinIO 对象抽样校验（检查文件可访问性），确保备份可恢复
