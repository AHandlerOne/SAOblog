# SAO 创意博客

一个以《刀剑神域》（Sword Art Online）为主题的综合性创作社区网站。

## 项目特性

- 🎮 官方内容展示：剧情介绍、人物图鉴、壁纸画廊、官方企划
- 🖌️ 创作社区：同人图、同人文发布与分享
- 🛡️ 安全认证：JWT + Refresh Token Rotation
- 📱 响应式设计：支持 PC 和移动端
- 🔍 全文搜索：基于 PostgreSQL 的模糊搜索
- ⚡ 高性能：Redis 缓存、图片压缩

## 技术栈

### 前端
- **框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **UI 组件**: Naive UI
- **状态管理**: Pinia
- **路由**: Vue Router 4

### 后端
- **框架**: Fastify + TypeScript
- **ORM**: Prisma
- **数据库**: PostgreSQL (生产) / SQLite (开发)
- **缓存**: Redis
- **认证**: JWT (Access Token + Refresh Token Rotation)
- **密码哈希**: Argon2id

### 其他
- **包管理**: pnpm workspace (Monorepo)
- **部署**: Docker Compose
- **文件存储**: MinIO (生产) / 本地存储 (开发)
- **图片处理**: Sharp
- **任务队列**: BullMQ

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
cd sao-blog
pnpm install
```

### 开发环境

#### 1. 启动数据库和依赖服务

```bash
docker-compose -f docker-compose.dev.yml up -d
```

#### 2. 初始化数据库

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

#### 3. 启动开发服务器

```bash
# 启动后端
pnpm dev:server

# 启动前端
pnpm dev:web
```

- 后端服务: http://localhost:3000
- 前端服务: http://localhost:5173

### 生产部署

项目支持 Docker Compose 一键部署：

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f
```

## 项目结构

```
sao-blog/
├── packages/
│   ├── server/          # 后端服务
│   │   ├── src/
│   │   │   ├── modules/  # API 业务模块
│   │   │   ├── lib/     # 工具库
│   │   │   └── config/  # 配置
│   │   └── prisma/      # 数据库 Schema
│   ├── web/             # 前端应用
│   │   └── src/
│   │       ├── pages/   # 页面组件
│   │       ├── components/ # 通用组件
│   │       ├── stores/  # Pinia 状态管理
│   │       └── api/     # API 客户端
│   └── shared/          # 共享类型和验证
├── docker-compose.yml   # 生产环境部署
├── docker-compose.dev.yml # 开发环境
└── README.md
```

## 主要功能

### 已实现
- ✅ 用户认证（注册/登录）
- ✅ 剧情介绍与篇章管理
- ✅ 人物图鉴
- ✅ 壁纸画廊（瀑布流）
- ✅ 官方企划展示
- ✅ 作品发布与管理
- ✅ 作品审核系统
- ✅ 评论、点赞、收藏
- ✅ 管理后台
- ✅ 全文搜索
- ✅ 举报处理

### 测试账户

- 邮箱: `test@example.com`
- 密码: `password123`

## 开发指南

### 数据库操作

```bash
# 生成 Prisma Client
pnpm db:generate

# 应用迁移
pnpm db:migrate

# 推送 Schema 变更
pnpm db:push

# 初始化种子数据
pnpm db:seed
```

### 代码规范

- 前后端统一使用 TypeScript
- 遵循现有的代码风格和目录结构
- 共享类型定义位于 `packages/shared`

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 免责声明

本项目为非官方粉丝创作平台，与《刀剑神域》版权方无关。所有官方内容仅供学习和交流使用。

## License

MIT
