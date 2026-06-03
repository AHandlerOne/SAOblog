#!/usr/bin/env node

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Creating database...')
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')

    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, '')
      console.log('Created database file:', dbPath)
    }

    // 尝试连接
    await prisma.$connect()
    console.log('Database connected successfully!')

    // 读取原始 SQL 并执行
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema-postgres.prisma')
    console.log('Reading from Postgres schema for reference...')

    // 生成 Prisma Client
    execSync('npx prisma generate', { stdio: 'inherit' })

    // 执行推送（不推荐用于生产，但对于开发环境可以）
    console.log('Pushing schema to database...')
    execSync('npx prisma db push', { stdio: 'inherit' })

    console.log('Database created and schema pushed successfully!')

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()