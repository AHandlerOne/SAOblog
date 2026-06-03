# SAO 创意博客 - 项目设置指南

## 项目概述

这是一个基于 Sword Art Online 主题的创意博客平台，使用以下技术栈：

- **前端**: Vue 3 + TypeScript + Vite + Naive UI
- **后端**: Fastify + Prisma + SQLite (开发环境)
- **包管理**: pnpm workspace

## 环境要求

- Node.js >= 18
- pnpm >= 8

## 快速开始

### 1. 安装依赖

```bash
cd sao-blog
pnpm install
```

### 2. 数据库设置

项目已经使用 SQLite 作为开发环境的数据库。数据库文件位于 `prisma/dev.db`。

### 3. 启动服务

#### 启动后端服务器

```bash
cd packages/server
npx tsx watch src/index.ts
```

后端服务将在 http://localhost:3000 运行

#### 启动前端开发服务器

```bash
cd sao-blog
pnpm dev:web
```

前端服务将在 http://localhost:5173 运行

### 4. 测试 API

可以使用以下测试账户进行登录测试：

- 邮箱: `test@example.com`
- 密码: `password123`

## 项目结构

```
sao-blog/
├── packages/
│   ├── server/          # 后端服务
│   │   ├── src/
│   │   │   ├── modules/  # API 模块
│   │   │   ├── lib/     # 工具库
│   │   │   └── config/  # 配置
│   │   └── prisma/      # 数据库模式
│   ├── web/             # 前端应用
│   │   └── src/
│   │       ├── pages/   # 页面组件
│   │       ├── components/ # 通用组件
│   │       ├── stores/  # Pinia 状态管理
│   │       └── api/     # API 客户端
│   └── shared/          # 共享类型和验证
├── prisma/              # 数据库模式（根目录）
└── uploads/             # 文件上传目录
```

## 主要功能

### 已实现

- [x] 用户认证（登录/注册）
- [x] 基础页面布局
- [x] 数据库模型设计
- [x] API 路由框架

### 待实现

- [ ] 作品上传和管理
- [ ] 评论系统
- [ ] 搜索功能
- [ ] 管理员面板
- [ ] 文件上传（图片处理）

## 开发注意事项

1. **认证**: 项目使用了 JWT 认证，包含访问令牌和刷新令牌机制
2. **数据库**: 开发环境使用 SQLite，生产环境建议使用 PostgreSQL
3. **类型安全**: 前后端都使用 TypeScript，共享了类型定义
4. **样式**: 使用 SCSS 和 Naive UI 组件库

## Docker 部署

项目包含 `docker-compose.yml`，可以一键启动所有服务：

```bash
docker-compose up -d
```

这将启动：
- PostgreSQL 数据库
- Redis 缓存
- MinIO 对象存储
- 后端服务
- Nginx 前端服务

## 下一步

1. 实现作品 CRUD API
2. 添加文件上传功能
3. 完善前端页面交互
4. 添加搜索和筛选功能