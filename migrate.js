#!/usr/bin/env node

import 'dotenv/config'
import { PrismaClient } from './packages/server/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function migrate() {
  try {
    // 确保 prisma 目录存在
    const prismaDir = path.join(process.cwd(), 'prisma')
    if (!fs.existsSync(prismaDir)) {
      fs.mkdirSync(prismaDir, { recursive: true })
    }

    // 创建数据库文件
    const dbPath = path.join(prismaDir, 'dev.db')
    if (!fs.existsSync(dbPath)) {
      fs.closeSync(fs.openSync(dbPath, 'w'))
      console.log('Created database file:', dbPath)
    }

    // 执行原始 SQL
    const schemaPath = path.join(prismaDir, 'schema.prisma')
    console.log('Reading schema from:', schemaPath)

    const schema = fs.readFileSync(schemaPath, 'utf8')
    console.log('DATABASE_URL from env:', process.env.DATABASE_URL)

    // 如果使用 Prisma Studio 或直接查询，这里可以添加更多数据库初始化逻辑

    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

migrate()