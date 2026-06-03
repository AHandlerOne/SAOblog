# SAO Blog 部署到 Linux 虚拟机操作文档

本文档按“完全不会运维”的前提来写，默认你的服务器是一台常见的 Ubuntu 22.04 / 24.04 Linux 虚拟机。

服务器信息：

- 公网 IP：`107.173.123.241`
- 本文示例 SSH 登录用户：`root`

如果你的服务器不是 `root` 登录，而是 `ubuntu`、`admin` 之类的普通账号，那么把文中的 `root` 改成你的实际用户名；如果命令提示权限不够，就在命令前加 `sudo`。

---

## 1. 先看结论

这个项目推荐使用 Docker Compose 一次性启动整套服务。启动后会包含这些组件：

- `web`：前端网站，外部访问入口，默认端口 `80`
- `server`：后端 API，容器内部端口 `3000`
- `postgres`：数据库
- `redis`：缓存
- `minio`：对象存储，负责上传文件

你真正给访客访问的地址通常是：

- 网站首页：`http://107.173.123.241`

---

## 2. 非常重要的上线说明

### 2.1 现在这个项目可以直接用 IP 跑起来，但有一个限制

当前项目在生产模式下会把“刷新登录状态”的 Cookie 标记为 `Secure`。这会带来一个结果：

- 如果你只用 `http://107.173.123.241` 访问，而不是 HTTPS
- 那么登录后的“长期保持登录”能力可能不稳定
- 公开页面通常可以正常浏览
- 注册、登录、后台等依赖登录态续期的功能，正式上线时建议一定要用域名 + HTTPS

简单理解：

- 现在这份文档可以帮你把站点先部署起来
- 但如果你后面要让用户长期稳定登录，建议再做“域名 + HTTPS”升级

如果你只是先把项目在服务器上跑起来给自己验收，这份文档可以直接用。

### 2.2 当前部署时的安全建议

项目自带的 `docker-compose.yml` 会把这些端口映射出来：

- `80`
- `3000`
- `5432`
- `6379`
- `9000`
- `9001`

其中真正需要给外网开放的，一般只有：

- `22`：SSH 登录服务器
- `80`：网站访问

强烈建议你在云厂商防火墙 / 安全组里，先只放行：

- TCP `22`
- TCP `80`

先不要放行 `3000`、`5432`、`6379`、`9000`、`9001`。

备注：

- 就算 Docker 把端口映射出来，只要云平台防火墙没放行，外部通常也访问不到
- 这对新手来说，是最简单也最重要的安全措施

---

## 3. 你需要提前准备的东西

在开始前，请确认你手里有这些信息：

### 3.1 服务器登录信息

至少要有以下其中一种：

- 服务器登录账号和密码
- 服务器登录账号和 SSH 私钥

如果这些信息你没有，需要先向买服务器的平台或提供服务器的人确认。

### 3.2 本地项目代码

你现在本地项目目录是：

- `C:\ysb\aiTest\sao-blog`

后面你需要把这份项目代码上传到服务器。

### 3.3 服务器最低建议配置

建议至少：

- 2 核 CPU
- 4 GB 内存
- 20 GB 磁盘

如果内存只有 1 GB，Docker、数据库、Redis、MinIO 同时启动时可能比较吃紧。

---

## 4. 第一步：配置云服务器防火墙 / 安全组

这一步在“云服务器控制台网页”里做，不是在 Linux 命令行里做。

请登录你的云服务器控制台，找到这台服务器对应的：

- 安全组
- 防火墙
- 入站规则

然后放行下面端口：

| 端口 | 协议 | 用途 |
|---|---|---|
| 22 | TCP | 远程登录服务器 |
| 80 | TCP | 网站访问 |

如果你暂时还需要远程看 MinIO 管理界面，也可以临时放行：

| 端口 | 协议 | 用途 |
|---|---|---|
| 9001 | TCP | MinIO 控制台，不建议长期公开 |

不要放行：

- `3000`
- `5432`
- `6379`
- `9000`

---

## 5. 第二步：用 SSH 登录 Linux 服务器

如果你用的是 Windows 10/11，通常可以直接打开：

- PowerShell
- Windows Terminal

执行：

```powershell
ssh root@107.173.123.241
```

第一次连接时，可能会看到类似提示：

```text
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

输入：

```text
yes
```

如果服务器要求密码，输入密码后按回车。

备注：

- 输入密码时，屏幕通常不会显示任何字符，这是正常现象
- 输完直接按回车即可

登录成功后，你会看到类似：

```text
root@xxxx:~#
```

---

## 6. 第三步：先把服务器基础环境装好

下面命令默认按 Ubuntu / Debian 系列来写。

### 6.1 更新系统

登录服务器后，执行：

```bash
apt update
apt upgrade -y
```

备注：

- `apt update` 是更新软件列表
- `apt upgrade -y` 是安装系统更新
- 这一步可能要几分钟

### 6.2 安装一些基础工具

```bash
apt install -y ca-certificates curl gnupg lsb-release nano openssl
```

说明：

- `curl`：下载文件
- `nano`：编辑文本文件，适合新手

---

## 7. 第四步：安装 Docker 和 Docker Compose

### 7.1 添加 Docker 官方软件源

依次执行下面这些命令：

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
```

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
```

```bash
apt update
```

### 7.2 安装 Docker

```bash
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 7.3 启动 Docker 并设置开机自启

```bash
systemctl enable docker
systemctl start docker
```

### 7.4 检查是否安装成功

```bash
docker --version
docker compose version
```

看到版本号就说明安装成功。

---

## 8. 第五步：在服务器上创建项目目录

建议把项目放到 `/opt` 目录下。

执行：

```bash
mkdir -p /opt/sao-blog
```

你也可以顺手确认目录存在：

```bash
ls /opt
```

如果看到 `sao-blog`，说明创建成功。

---

## 9. 第六步：把本地项目上传到服务器

对完全没运维经验的人，推荐用图形化工具 `WinSCP` 上传。

### 9.1 推荐方法：用 WinSCP 上传

#### 9.1.1 安装 WinSCP

在你的 Windows 电脑安装 `WinSCP`。

#### 9.1.2 新建连接

在 WinSCP 里填写：

- 文件协议：`SFTP`
- 主机名：`107.173.123.241`
- 端口：`22`
- 用户名：`root`
- 密码：你的服务器密码

然后点击连接。

#### 9.1.3 进入服务器目录

连接成功后，右边是服务器文件，进入：

```text
/opt/sao-blog
```

#### 9.1.4 上传哪些文件

把本地 `C:\ysb\aiTest\sao-blog` 里的项目上传到服务器。

建议不要上传这些体积大、没必要上传的目录：

- `node_modules`
- `packages\web\node_modules`
- `packages\web\dist`
- `.codex`
- `.agents`
- `.claude`
- `.cursor`
- `.gemini`
- `.opencode`

说明：

- 这些目录不是部署运行必须的
- 尤其 `node_modules` 体积很大，上传会很慢

上传完成后，服务器目录 `/opt/sao-blog` 里至少应该能看到这些关键文件：

- `docker-compose.yml`
- `.env.docker`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `packages`

### 9.2 命令行方法

如果你更习惯命令行，也可以在本地 PowerShell 执行：

```powershell
scp -r "C:\ysb\aiTest\sao-blog" root@107.173.123.241:/opt/
```

但是这个方法通常会把很多不必要的目录也传上去，所以对新手不如 WinSCP 直观。

---

## 10. 第七步：进入项目目录并检查文件

回到服务器终端，执行：

```bash
cd /opt/sao-blog
ls -la
```

确认能看到：

- `docker-compose.yml`
- `.env.docker`
- `packages`

如果这些文件看不到，说明上传不完整，需要回到上一步补传。

---

## 11. 第八步：修改生产环境配置

这一步非常重要，至少要改掉默认密钥和默认密码。

### 11.1 先备份配置文件

```bash
cp .env.docker .env.docker.bak
cp docker-compose.yml docker-compose.yml.bak
```

### 11.2 生成几组随机密码

执行下面命令，多生成几次：

```bash
openssl rand -base64 24
```

请把生成出来的结果先记下来，后面会用到。

你至少需要准备 3 组：

- PostgreSQL 密码
- MinIO 密码
- JWT_SECRET

注意：

- `JWT_SECRET` 最好 32 位以上
- 可以直接用 `openssl rand -base64 32`

### 11.3 修改 `.env.docker`

用 `nano` 打开：

```bash
nano .env.docker
```

建议至少改这些值：

```env
DATABASE_URL=postgresql://sao:你自己的数据库密码@postgres:5432/sao_blog
MINIO_ACCESS_KEY=你自己的MinIO账号
MINIO_SECRET_KEY=你自己的MinIO密码
JWT_SECRET=你自己生成的一长串随机字符串
```

建议示例：

```env
DATABASE_URL=postgresql://sao:SaoDb_2026_xxxxx@postgres:5432/sao_blog
MINIO_ACCESS_KEY=saoadmin
MINIO_SECRET_KEY=SaoMinio_2026_xxxxx
JWT_SECRET=请替换成你自己生成的超长随机字符串至少32位
```

修改完成后：

1. 按 `Ctrl + O` 保存
2. 按回车确认文件名
3. 按 `Ctrl + X` 退出

### 11.4 修改 `docker-compose.yml`

再打开：

```bash
nano docker-compose.yml
```

你要同步改下面这些地方：

#### 位置 1：PostgreSQL 密码

找到：

```yaml
POSTGRES_PASSWORD: sao123
```

改成你自己的数据库密码，例如：

```yaml
POSTGRES_PASSWORD: SaoDb_2026_xxxxx
```

#### 位置 2：MinIO 管理账号和密码

找到：

```yaml
MINIO_ROOT_USER: minioadmin
MINIO_ROOT_PASSWORD: minioadmin
```

改成和 `.env.docker` 里一致的值，例如：

```yaml
MINIO_ROOT_USER: saoadmin
MINIO_ROOT_PASSWORD: SaoMinio_2026_xxxxx
```

#### 位置 3：`minio-init` 里的登录信息

找到这一段：

```yaml
until (/usr/bin/mc alias set myminio http://minio:9000 minioadmin minioadmin) do echo '...waiting...' && sleep 1; done;
```

把后面的两个 `minioadmin` 也改成你自己的 MinIO 账号和密码，例如：

```yaml
until (/usr/bin/mc alias set myminio http://minio:9000 saoadmin SaoMinio_2026_xxxxx) do echo '...waiting...' && sleep 1; done;
```

非常重要：

- `docker-compose.yml` 里的数据库密码
- `.env.docker` 里的 `DATABASE_URL`

这两处必须一致。

同样：

- `docker-compose.yml` 里的 `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`
- `.env.docker` 里的 `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`
- `minio-init` 里的登录信息

这三处也必须一致。

保存退出方法同上：

1. `Ctrl + O`
2. 回车
3. `Ctrl + X`

---

## 12. 第九步：启动项目

进入项目目录后执行：

```bash
cd /opt/sao-blog
docker compose up -d --build
```

说明：

- `--build` 表示重新构建镜像
- 第一次启动会比较慢，常见需要几分钟
- 期间会下载基础镜像、安装依赖、构建前后端

如果中途没有报错，先不要着急，继续检查容器状态。

---

## 13. 第十步：检查容器是否启动成功

执行：

```bash
docker compose ps
```

正常情况下你会看到大致这些服务：

- `postgres`
- `redis`
- `minio`
- `minio-init`
- `server`
- `web`

### 13.1 什么状态算正常

通常你会看到：

- `postgres`：`Up` 或 `healthy`
- `redis`：`Up` 或 `healthy`
- `minio`：`Up` 或 `healthy`
- `server`：`Up`
- `web`：`Up`

`minio-init` 这个服务比较特殊：

- 它只负责初始化桶
- 跑完后退出是正常的

如果它显示类似“已完成 / Exited 0”，通常不是故障。

### 13.2 如果没起来，先看日志

```bash
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

## 14. 第十一步：第一次初始化数据库结构

当前项目的后端启动时会自动执行数据库结构同步，所以通常不需要你手工建表。

你可以继续查看后端日志确认是否成功：

```bash
docker compose logs -f server
```

如果看到类似这些意思的输出，就说明后端已经正常启动：

- 等待数据库成功
- 数据库结构已同步
- 服务开始监听 `3000`

看完后按：

```text
Ctrl + C
```

退出日志跟踪。

---

## 15. 第十二步：首次导入演示数据

这一项很重要。

项目虽然会自动建表，但“剧情、角色、新闻、壁纸”等演示数据不一定会自动导入，所以首次部署后建议手工执行一次种子脚本。

### 15.1 执行种子脚本

在服务器项目目录下执行：

```bash
docker compose exec server pnpm dlx tsx packages/server/prisma/seed.ts
```

说明：

- 这一步只建议在“第一次部署全新数据库”时执行一次
- 首次执行时，容器可能会临时下载 `tsx`，需要服务器能访问外网
- 执行时间可能 1 到 3 分钟

### 15.2 如果你用的是 Docker 镜像部署，seed 也在容器里执行

这里单独说明一下，避免和“源码部署”搞混：

- 如果你是把源码上传到服务器，再执行 `docker compose up -d --build`
- 或者你是先在本地构建好 `server` / `web` 镜像，再把镜像上传到服务器

种子脚本的执行位置都一样：

- 不是在宿主机直接跑
- 不是在浏览器里跑
- 而是在 `server` 容器里执行

所以镜像部署场景下，命令还是这条：

```bash
docker compose exec server pnpm dlx tsx packages/server/prisma/seed.ts
```

执行前先确认两件事：

1. `server` 容器已经启动成功

```bash
docker compose ps
```

2. 服务器或容器能访问外网

原因是这条命令会通过 `pnpm dlx` 临时下载 `tsx`。如果服务器是完全离线环境，这一步会失败。

如果成功，通常会看到类似：

- `Seeding database with SAO content...`
- `Seed completed successfully!`

### 15.2 不要反复执行

这个种子脚本不是完全幂等的，尤其壁纸数据可能重复。

所以请记住：

- 全新数据库，执行 1 次
- 以后不要随便重复执行

---

## 16. 第十三步：浏览器访问网站

现在你可以在自己电脑浏览器里打开：

```text
http://107.173.123.241
```

你还可以测试：

### 16.1 前端健康检查

浏览器打开：

```text
http://107.173.123.241/health
```

如果看到：

```text
ok
```

说明 `web` 容器正常。

### 16.2 后端健康检查

浏览器打开：

```text
http://107.173.123.241:3000/health
```

如果云防火墙没有开放 `3000`，外部可能打不开，这是正常的。

你可以直接在服务器上自己测试：

```bash
curl http://127.0.0.1:3000/health
```

正常会返回类似：

```json
{"status":"ok","timestamp":"..."}
```

---

## 17. 第十四步：注册管理员账号

项目默认没有现成管理员账号。

你需要自己先注册一个普通账号，再把它提升为管理员。

### 17.1 先在网页注册一个账号

浏览器打开：

```text
http://107.173.123.241
```

自己注册一个账号，比如：

- 邮箱：你自己的邮箱
- 密码：你自己设置

### 17.2 把这个账号提升为管理员

回到服务器命令行，执行：

```bash
docker exec sao-postgres psql -U sao -d sao_blog -c "UPDATE users SET role = 'ADMIN' WHERE email = '你的邮箱地址';"
```

把命令里的：

- `你的邮箱地址`

替换成你刚刚注册的邮箱。

例如：

```bash
docker exec sao-postgres psql -U sao -d sao_blog -c "UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';"
```

如果执行成功，通常会看到：

```text
UPDATE 1
```

这表示有 1 条用户记录被改成管理员了。

### 17.3 后台地址

然后你可以访问：

```text
http://107.173.123.241/admin
```

---

## 18. 常用运维命令

下面这些命令建议你收藏。

### 18.1 查看容器状态

```bash
cd /opt/sao-blog
docker compose ps
```

### 18.2 查看全部日志

```bash
cd /opt/sao-blog
docker compose logs --tail 200
```

### 18.3 实时查看后端日志

```bash
cd /opt/sao-blog
docker compose logs -f server
```

### 18.4 实时查看前端日志

```bash
cd /opt/sao-blog
docker compose logs -f web
```

### 18.5 重启全部服务

```bash
cd /opt/sao-blog
docker compose restart
```

### 18.6 只重启后端

```bash
cd /opt/sao-blog
docker compose restart server
```

### 18.7 停止项目

```bash
cd /opt/sao-blog
docker compose down
```

说明：

- 这会停止容器
- 不会删除数据库卷里的数据

### 18.8 重新构建并启动

当你上传了新代码后，执行：

```bash
cd /opt/sao-blog
docker compose up -d --build
```

---

## 19. 项目更新流程

以后如果你要更新项目代码，按这个顺序做：

### 19.1 备份旧代码和数据库

先备份数据库：

```bash
docker exec sao-postgres pg_dump -U sao sao_blog > /opt/sao-blog/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 19.2 上传新代码覆盖服务器目录

把本地新代码再次上传到：

- `/opt/sao-blog`

### 19.3 重新构建

```bash
cd /opt/sao-blog
docker compose up -d --build
```

### 19.4 检查状态

```bash
docker compose ps
docker compose logs --tail 100 server
```

---

## 20. 常见问题排查

### 20.1 浏览器打不开首页

检查顺序：

1. 先确认服务器公网 IP 是不是 `107.173.123.241`
2. 确认云防火墙是否放行了 `80`
3. 确认容器是否启动

执行：

```bash
cd /opt/sao-blog
docker compose ps
```

如果 `web` 没起来，再看：

```bash
docker compose logs --tail 100 web
```

### 20.2 `docker compose up -d --build` 很久不动

这通常不是卡死，而是：

- 在下载 Docker 镜像
- 在安装依赖
- 在构建前后端

可以新开一个 SSH 窗口查看系统资源：

```bash
free -h
df -h
```

### 20.3 后端启动失败

执行：

```bash
cd /opt/sao-blog
docker compose logs --tail 200 server
```

重点看这些方向：

- 数据库密码是否前后不一致
- `JWT_SECRET` 是否太短
- MinIO 账号密码是否没同步修改

### 20.4 数据库连不上

查看数据库日志：

```bash
cd /opt/sao-blog
docker compose logs --tail 200 postgres
```

检查：

- `POSTGRES_PASSWORD` 是否和 `DATABASE_URL` 一致
- 数据库容器是否健康

### 20.5 MinIO 初始化失败

如果 `minio-init` 报错，最常见原因是：

- `MINIO_ROOT_USER`
- `MINIO_ROOT_PASSWORD`
- `minio-init` 里的账号密码

这三处没有保持一致。

### 20.6 网站能打开，但登录不稳定

这通常不是部署命令错了，而是本文前面说的那个限制：

- 当前项目生产模式依赖 `Secure` Cookie
- 纯 `http://IP` 访问不适合作为正式登录环境

如果你后续要正式对外开放注册/登录，建议下一步补上：

- 域名
- HTTPS

---

## 21. 你可以如何确认这次部署算成功

满足下面几点，基本就算部署成功：

1. `docker compose ps` 里 `web`、`server`、`postgres`、`redis`、`minio` 都是正常状态
2. 浏览器能打开 `http://107.173.123.241`
3. 浏览器打开 `http://107.173.123.241/health` 返回 `ok`
4. 服务器里执行 `curl http://127.0.0.1:3000/health` 返回 JSON
5. 首次种子数据成功执行
6. 你能注册账号并把它提升成管理员

---

## 22. 强烈建议的后续优化

这份文档解决的是“先把项目部署到 Linux 虚拟机并跑起来”。

如果后面要正式上线给别人稳定使用，下一阶段强烈建议继续做这几件事：

1. 绑定域名
2. 配置 HTTPS 证书
3. 让登录 Cookie 在 HTTPS 下正常工作
4. 关闭不必要的外网端口
5. 把默认演示数据、管理员账号、备份策略都规范化

---

## 23. 最简操作清单

如果你已经看懂前面内容，实际最核心的命令顺序就是：

```bash
apt update
apt upgrade -y
apt install -y ca-certificates curl gnupg lsb-release nano openssl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker
mkdir -p /opt/sao-blog
cd /opt/sao-blog
```

上传代码后：

```bash
cd /opt/sao-blog
nano .env.docker
nano docker-compose.yml
docker compose up -d --build
docker compose ps
docker compose exec server pnpm dlx tsx packages/server/prisma/seed.ts
```

部署验证：

```bash
curl http://127.0.0.1:3000/health
```
