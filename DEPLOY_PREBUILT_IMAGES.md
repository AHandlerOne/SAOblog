# SAO Blog 预构建 Docker 镜像部署手册

这份文档适合这种部署方式：

- 在你的本地 Windows 电脑上先构建 `server` 和 `web` Docker 镜像
- 把镜像导出成 `.tar`
- 上传到 Linux 服务器
- 服务器只负责 `docker load` 和 `docker compose up`

这种方式的优点：

- 服务器不需要保存整套项目源码
- 服务器不需要每次重新编译前后端
- 后续更新时，只需要重新上传镜像包和少量部署文件

---

## 1. 这套方案会上传哪些东西

每次部署，通常只需要上传两类内容：

### 1.1 应用镜像包

一个 `.tar` 文件，里面包含：

- `sao-blog/server:某个版本号`
- `sao-blog/web:某个版本号`

例如：

- `sao-blog-images-20260520.tar`

### 1.2 部署目录

仓库里已经准备好了这套专用部署文件：

- [deploy/prebuilt-images/docker-compose.yml](C:\ysb\aiTest\sao-blog\deploy\prebuilt-images\docker-compose.yml)
- [deploy/prebuilt-images/.env.example](C:\ysb\aiTest\sao-blog\deploy\prebuilt-images\.env.example)
- [deploy/prebuilt-images/init-db.sh](C:\ysb\aiTest\sao-blog\deploy\prebuilt-images\init-db.sh)

你上传到服务器时，只需要把这个目录一并带上。

---

## 2. 先说限制

### 2.1 服务器仍然需要 Docker

这套方案只是让服务器“不编译你的项目源码”，不是让服务器“不装 Docker”。

服务器仍然需要：

- Docker
- Docker Compose 插件

### 2.2 服务器默认仍会拉取公共基础镜像

即使你已经把 `server` 和 `web` 镜像打包上传了，服务器第一次启动时通常还是会去拉这些公共镜像：

- `postgres:16-alpine`
- `redis:7-alpine`
- `minio/minio:latest`
- `minio/mc`

所以这份手册默认前提是：

- Linux 服务器可以访问外网拉取公共镜像

如果你的服务器完全不能联网，也可以做“全离线镜像包”，文末我会写可选方案。

### 2.3 登录相关限制仍然存在

当前项目在生产模式下，登录续期依赖 `Secure` Cookie。

所以如果你最终访问地址只是：

- `http://107.173.123.241`

那么登录续期能力仍然可能不稳定。这个和“是否预构建镜像”无关，是当前项目本身的生产认证策略决定的。

---

## 3. 第一步：确认服务器架构

你本地构建镜像时，平台架构要和 Linux 服务器一致。

先登录 Linux 服务器执行：

```bash
uname -m
```

常见结果：

- `x86_64`：说明服务器是 `linux/amd64`
- `aarch64`：说明服务器是 `linux/arm64`

大多数云服务器都是：

- `x86_64`

如果你的输出是 `x86_64`，后面文档里的平台参数就用：

```text
linux/amd64
```

---

## 4. 第二步：本地准备发布目录

下面操作在你的 Windows 本地电脑执行。

建议先建一个发布目录，例如：

```powershell
New-Item -ItemType Directory -Force C:\ysb\release\sao-blog-20260520
New-Item -ItemType Directory -Force C:\ysb\release\sao-blog-20260520\deploy
```

后面我们把镜像包和部署文件都放到这里，方便上传。

---

## 5. 第三步：本地构建 Linux 镜像

你的项目目录是：

- `C:\ysb\aiTest\sao-blog`

先打开 PowerShell，进入项目目录：

```powershell
cd C:\ysb\aiTest\sao-blog
```

### 5.1 构建后端镜像

如果服务器是 `x86_64`，执行：

```powershell
docker buildx build --platform linux/amd64 -f packages/server/Dockerfile -t sao-blog/server:2026.05.20 --load .
```

### 5.2 构建前端镜像

```powershell
docker buildx build --platform linux/amd64 -f packages/web/Dockerfile -t sao-blog/web:2026.05.20 --load .
```

说明：

- `--platform linux/amd64` 是为了保证镜像能在 Linux 服务器上运行
- `--load` 表示构建完成后把镜像加载到你本地 Docker
- `2026.05.20` 只是示例版本号，你可以换成自己的发布日期

如果你的服务器是 `aarch64`，把上面两条命令里的：

- `linux/amd64`

改成：

- `linux/arm64`

### 5.3 检查镜像是否构建成功

```powershell
docker image ls
```

你应该至少能看到：

- `sao-blog/server   2026.05.20`
- `sao-blog/web      2026.05.20`

---

## 6. 第四步：把镜像导出成 tar 文件

执行：

```powershell
docker save -o C:\ysb\release\sao-blog-20260520\sao-blog-images-20260520.tar sao-blog/server:2026.05.20 sao-blog/web:2026.05.20
```

说明：

- 这一步会生成一个镜像包
- 文件通常会比较大，几百 MB 都是正常的

导出成功后，你会得到：

- `C:\ysb\release\sao-blog-20260520\sao-blog-images-20260520.tar`

---

## 7. 第五步：把部署文件复制到发布目录

把仓库里的预构建部署目录复制到发布目录。

在 PowerShell 执行：

```powershell
Get-ChildItem -Force C:\ysb\aiTest\sao-blog\deploy\prebuilt-images | Copy-Item -Destination C:\ysb\release\sao-blog-20260520\deploy\ -Recurse -Force
```

复制后，发布目录里至少应该有这些文件：

- `C:\ysb\release\sao-blog-20260520\sao-blog-images-20260520.tar`
- `C:\ysb\release\sao-blog-20260520\deploy\docker-compose.yml`
- `C:\ysb\release\sao-blog-20260520\deploy\.env.example`
- `C:\ysb\release\sao-blog-20260520\deploy\init-db.sh`

---

## 8. 第六步：上传到 Linux 服务器

推荐继续使用 `WinSCP` 上传。

### 8.1 服务器上建议放到哪个目录

建议部署目录放这里：

- `/opt/sao-blog-deploy`

先在服务器创建目录：

```bash
mkdir -p /opt/sao-blog-deploy
```

### 8.2 需要上传什么

把下面这些内容上传到服务器 `/opt/sao-blog-deploy`：

- `sao-blog-images-20260520.tar`
- `deploy/docker-compose.yml`
- `deploy/.env.example`
- `deploy/init-db.sh`

上传完成后，服务器目录最好长这样：

```text
/opt/sao-blog-deploy/
  sao-blog-images-20260520.tar
  docker-compose.yml
  .env.example
  init-db.sh
```

备注：

- 这里不需要上传整套项目源码
- 也不需要上传 `packages/`、`node_modules/` 这些目录

---

## 9. 第七步：在 Linux 服务器导入镜像

登录服务器后执行：

```bash
cd /opt/sao-blog-deploy
docker load -i sao-blog-images-20260520.tar
```

如果成功，通常会看到类似：

```text
Loaded image: sao-blog/server:2026.05.20
Loaded image: sao-blog/web:2026.05.20
```

### 9.1 检查镜像是否已经进入服务器

```bash
docker image ls
```

确认你能看到：

- `sao-blog/server   2026.05.20`
- `sao-blog/web      2026.05.20`

---

## 10. 第八步：生成服务器部署环境文件

部署目录里已经有一个示例文件：

- `.env.example`

把它复制成真正使用的 `.env`：

```bash
cd /opt/sao-blog-deploy
cp .env.example .env
```

然后编辑：

```bash
nano .env
```

你至少要改这些值：

```env
SAO_SERVER_IMAGE=sao-blog/server:2026.05.20
SAO_WEB_IMAGE=sao-blog/web:2026.05.20
POSTGRES_PASSWORD=你自己的数据库密码
MINIO_ACCESS_KEY=你自己的MinIO账号
MINIO_SECRET_KEY=你自己的MinIO密码
JWT_SECRET=你自己生成的至少32位随机字符串
```

建议你先在服务器生成随机字符串：

```bash
openssl rand -base64 24
openssl rand -base64 32
```

说明：

- `POSTGRES_PASSWORD` 必须改
- `MINIO_ACCESS_KEY` 和 `MINIO_SECRET_KEY` 必须改
- `JWT_SECRET` 必须改，而且长度至少 32 位
- `SAO_SERVER_IMAGE` 和 `SAO_WEB_IMAGE` 要和你实际导入的镜像标签一致

保存退出：

1. `Ctrl + O`
2. 回车
3. `Ctrl + X`

---

## 11. 第九步：首次启动整套服务

在服务器执行：

```bash
cd /opt/sao-blog-deploy
docker compose up -d
```

说明：

- 这里不需要 `--build`
- 因为 `server` 和 `web` 镜像已经提前上传并导入

如果是第一次启动，服务器仍可能去拉这些公共镜像：

- `postgres:16-alpine`
- `redis:7-alpine`
- `minio/minio:latest`
- `minio/mc`

这是正常现象。

---

## 12. 第十步：检查启动状态

执行：

```bash
cd /opt/sao-blog-deploy
docker compose ps
```

正常情况下，你应该能看到这些服务：

- `postgres`
- `redis`
- `minio`
- `minio-init`
- `server`
- `web`

其中：

- `postgres`、`redis`、`minio` 通常会变成 `Up` 或 `healthy`
- `server`、`web` 通常会显示 `Up`
- `minio-init` 执行完成后退出是正常的

---

## 13. 第十一步：检查日志

如果你想确认服务到底是否正常，执行：

```bash
cd /opt/sao-blog-deploy
docker compose logs --tail 100
```

如果你只想看后端：

```bash
docker compose logs --tail 100 server
```

如果你只想看前端：

```bash
docker compose logs --tail 100 web
```

如果你只想看数据库：

```bash
docker compose logs --tail 100 postgres
```

---

## 14. 第十二步：健康检查

### 14.1 在服务器本机检查后端

```bash
curl http://127.0.0.1:3000/health
```

正常返回类似：

```json
{"status":"ok","timestamp":"..."}
```

### 14.2 在浏览器检查前端

浏览器打开：

```text
http://107.173.123.241
```

### 14.3 检查前端健康页

浏览器打开：

```text
http://107.173.123.241/health
```

如果返回：

```text
ok
```

说明前端 Nginx 正常。

---

## 15. 第十三步：首次导入演示数据

当前项目镜像部署成功后，数据库结构会自动初始化，但演示内容不一定自动导入。

如果你需要站点里有默认剧情、角色、新闻等内容，可以执行一次种子脚本。

在服务器执行：

```bash
cd /opt/sao-blog-deploy
docker compose exec server pnpm dlx tsx packages/server/prisma/seed.ts
```

注意：

- 这条命令通常只在全新数据库第一次部署时执行 1 次
- 这条命令会通过 `pnpm dlx` 临时下载 `tsx`
- 所以执行时，服务器容器需要能访问外网

如果成功，通常会看到类似：

- `Seeding database with SAO content...`
- `Seed completed successfully!`

如果你以后要做真正的“全离线部署”，这一步需要改成“提前准备 SQL 备份并导入”，本文先不展开。

---

## 16. 第十四步：注册管理员账号

### 16.1 先在网页注册普通账号

浏览器打开：

```text
http://107.173.123.241
```

自己注册一个账号。

### 16.2 提升为管理员

在服务器执行：

```bash
docker exec sao-postgres psql -U sao -d sao_blog -c "UPDATE users SET role = 'ADMIN' WHERE email = '你的邮箱';"
```

例如：

```bash
docker exec sao-postgres psql -U sao -d sao_blog -c "UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';"
```

如果返回：

```text
UPDATE 1
```

表示设置成功。

后台地址：

```text
http://107.173.123.241/admin
```

---

## 17. 以后更新版本怎么做

以后更新时，你只要重复这几个动作：

### 17.1 在本地重新构建新版本镜像

例如版本改成：

- `2026.05.21`

本地执行：

```powershell
cd C:\ysb\aiTest\sao-blog
docker buildx build --platform linux/amd64 -f packages/server/Dockerfile -t sao-blog/server:2026.05.21 --load .
docker buildx build --platform linux/amd64 -f packages/web/Dockerfile -t sao-blog/web:2026.05.21 --load .
docker save -o C:\ysb\aiTest\sao-blog\deploy\sao-blog-images-20260527.tar sao-blog/server:2026.05.21 sao-blog/web:2026.05.21
```

### 17.2 上传新 tar 到服务器

上传：

- `sao-blog-images-20260521.tar`

到：

- `/opt/sao-blog-deploy`

### 17.3 在服务器导入新镜像

```bash
cd /opt/sao-blog-deploy
docker load -i sao-blog-images-20260521.tar
```

### 17.4 修改 `.env` 里的镜像标签

```bash
nano /opt/sao-blog-deploy/.env
```

把：

```env
SAO_SERVER_IMAGE=sao-blog/server:2026.05.20
SAO_WEB_IMAGE=sao-blog/web:2026.05.20
```

改成：

```env
SAO_SERVER_IMAGE=sao-blog/server:2026.05.21
SAO_WEB_IMAGE=sao-blog/web:2026.05.21
```

### 17.5 重建容器

```bash
cd /opt/sao-blog-deploy
docker compose up -d
```

然后检查：

```bash
docker compose ps
docker compose logs --tail 100 server
```

---

## 18. 常用运维命令

### 18.1 查看状态

```bash
cd /opt/sao-blog-deploy
docker compose ps
```

### 18.2 查看日志

```bash
cd /opt/sao-blog-deploy
docker compose logs --tail 200
```

### 18.3 实时查看后端日志

```bash
cd /opt/sao-blog-deploy
docker compose logs -f server
```

### 18.4 重启服务

```bash
cd /opt/sao-blog-deploy
docker compose restart
```

### 18.5 停止服务

```bash
cd /opt/sao-blog-deploy
docker compose down
```

说明：

- 这会停容器
- 不会删除卷数据

---

## 19. 常见问题

### 19.1 `docker compose up -d` 时提示找不到镜像

先检查：

```bash
docker image ls
```

看服务器里是否真的有：

- `sao-blog/server:你写的版本`
- `sao-blog/web:你写的版本`

再检查：

- `.env` 里的 `SAO_SERVER_IMAGE`
- `.env` 里的 `SAO_WEB_IMAGE`

是否和 `docker image ls` 里完全一致。

### 19.2 页面打不开

先检查：

1. 服务器防火墙是否放行 `80`
2. `web` 容器是否启动
3. `docker compose ps` 是否正常

### 19.3 后端启动失败

查看：

```bash
cd /opt/sao-blog-deploy
docker compose logs --tail 200 server
```

重点看：

- `POSTGRES_PASSWORD` 是否为空
- `JWT_SECRET` 是否太短
- `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` 是否没改

### 19.4 MinIO 初始化失败

通常是：

- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`

配置有误。

### 19.5 登录不稳定

这是当前项目在纯 HTTP 下的已知限制，不是镜像打包方式的问题。

正式上线建议后续补：

- 域名
- HTTPS

---

## 20. 可选：做全离线镜像包

如果你希望服务器连公共镜像也不拉，那么本地还可以额外把这些镜像也打进 tar：

### 20.1 本地先拉公共镜像

```powershell
docker pull postgres:16-alpine
docker pull redis:7-alpine
docker pull minio/minio:latest
docker pull minio/mc
```

### 20.2 导出完整镜像包

```powershell
docker save -o C:\ysb\release\sao-blog-20260520\sao-blog-full-stack-20260520.tar sao-blog/server:2026.05.20 sao-blog/web:2026.05.20 postgres:16-alpine redis:7-alpine minio/minio:latest minio/mc
```

### 20.3 服务器导入

```bash
docker load -i sao-blog-full-stack-20260520.tar
```

这样服务器首次启动时，通常就不需要再拉这些基础镜像。

---

## 21. 最简流程

如果你已经理解前面的步骤，最核心流程就是：

### 本地 Windows

```powershell
cd C:\ysb\aiTest\sao-blog
docker buildx build --platform linux/amd64 -f packages/server/Dockerfile -t sao-blog/server:2026.05.20 --load .
docker buildx build --platform linux/amd64 -f packages/web/Dockerfile -t sao-blog/web:2026.05.20 --load .
docker save -o C:\ysb\release\sao-blog-20260520\sao-blog-images-20260520.tar sao-blog/server:2026.05.20 sao-blog/web:2026.05.20
Get-ChildItem -Force C:\ysb\aiTest\sao-blog\deploy\prebuilt-images | Copy-Item -Destination C:\ysb\release\sao-blog-20260520\deploy\ -Recurse -Force
```

### Linux 服务器

```bash
mkdir -p /opt/sao-blog-deploy
cd /opt/sao-blog-deploy
docker load -i sao-blog-images-20260520.tar
cp .env.example .env
nano .env
docker compose up -d
docker compose ps
curl http://127.0.0.1:3000/health
```
