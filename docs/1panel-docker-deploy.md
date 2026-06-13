# 1Panel 容器化部署指南

本文档详细介绍如何在 1Panel 面板中部署 KEC 课程管理平台。

---

## 📋 目录

- [前置要求](#前置要求)
- [部署步骤](#部署步骤)
  - [第一步：安装 1Panel](#第一步安装-1panel)
  - [第二步：创建应用](#第二步创建应用)
  - [第三步：配置环境变量](#第三步配置环境变量)
  - [第四步：启动服务](#第四步启动服务)
  - [第五步：初始化管理员](#第五步初始化管理员)
- [域名与 HTTPS 配置](#域名与-https-配置)
- [数据备份与恢复](#数据备份与恢复)
- [常见问题](#常见问题)

---

## 前置要求

### 服务器要求

| 项目 | 最低配置 | 推荐配置 |
|------|---------|---------|
| 操作系统 | CentOS 7+ / Ubuntu 20.04+ / Debian 11+ | Ubuntu 22.04 LTS |
| CPU | 1 核 | 2 核及以上 |
| 内存 | 2 GB | 4 GB 及以上 |
| 硬盘 | 20 GB 可用空间 | 50 GB SSD |
| 网络 | 可访问外网（下载镜像） | 固定公网 IP |

### 软件要求

- **1Panel**: 最新版本（内置 Docker + Docker Compose）
- **浏览器**: Chrome 90+ / Edge 90+（用于访问管理界面）

---

## 部署步骤

### 第一步：安装 1Panel

#### 1.1 一键安装脚本

以 root 用户登录服务器，执行以下命令：

```bash
# CentOS/RHEL
curl -sSL https://resource.fit2cloud.com/1panel/package/quick_start.sh -o quick_start.sh && bash quick_start.sh

# Ubuntu/Debian
curl -sSL https://resource.fit2cloud.com/1panel/package/quick_start.sh -o quick_start.sh && sudo bash quick_start.sh
```

#### 1.2 获取登录信息

安装完成后，终端会显示 1Panel 的登录地址、用户名和密码：

```
======================= 1Panel 安装完成 =======================
外网访问地址: http://your-server-ip:10086/xxxxx
内网访问地址: http://localhost:10086/xxxxx
用户名: your-username
密码: your-password
==============================================================
```

> ⚠️ **重要**：请妥善保存登录信息，建议立即修改默认密码。

#### 1.3 登录 1Panel

在浏览器中访问外网地址，使用显示的用户名和密码登录。

---

### 第二步：创建应用

#### 2.1 上传项目文件

**方法一：通过 1Panel 文件管理器**

1. 登录 1Panel，进入左侧菜单 **主机 → 文件**
2. 进入 `/opt` 目录（或你希望部署的目录）
3. 点击 **上传** 按钮，上传 `kec-manager.zip` 压缩包
4. 解压文件：右键压缩包 → **解压**

**方法二：通过 Git 克隆（推荐）**

1. 进入 1Panel **主机 → 终端**
2. 执行以下命令：

```bash
cd /opt
git clone https://github.com/shub2026/kec-manager.git
cd kec-manager
```

#### 2.2 创建 Docker Compose 应用

1. 进入 1Panel 左侧菜单 **应用 → 应用商店 → 我的应用**
2. 点击 **创建应用** 按钮
3. 填写应用信息：

   | 字段 | 值 |
   |------|-----|
   | 应用名称 | `kec-manager` |
   | 应用类型 | 选择 **Docker Compose** |
   | 工作目录 | `/opt/kec-manager` |
   | docker-compose.yml | 系统会自动识别项目根目录下的 `docker-compose.yml` |

4. 点击 **确认** 创建应用

---

### 第三步：配置环境变量

#### 3.1 生成 JWT 密钥

在 1Panel **主机 → 终端** 中执行：

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

复制输出的长字符串（类似 `a3f5b8c2d1e4...`）。

#### 3.2 编辑 .env 文件

1. 进入 1Panel **主机 → 文件**
2. 导航到 `/opt/kec-manager` 目录
3. 找到 `.env.example` 文件，复制一份并重命名为 `.env`
4. 右键 `.env` 文件 → **编辑**
5. 修改以下内容：

```bash
# JWT 密钥（粘贴上一步生成的随机字符串）
JWT_SECRET=a3f5b8c2d1e4...（替换为实际生成的值）

# CORS 允许的源（根据实际访问域名修改）
CORS_ORIGINS=http://your-server-ip,http://your-domain.com
```

6. 点击 **保存**

#### 3.3 检查 docker-compose.yml

确保 `docker-compose.yml` 中的配置正确：

```yaml
version: '3.8'

services:
  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: kec-server
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/data/kec.db
      - PORT=3000
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGINS=${CORS_ORIGINS}
    volumes:
      - sqlite-data:/app/data
      - uploads:/app/uploads
    networks:
      - kec-network

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    container_name: kec-client
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      server:
        condition: service_healthy
    networks:
      - kec-network

volumes:
  sqlite-data:
    driver: local
  uploads:
    driver: local

networks:
  kec-network:
    driver: bridge
```

---

### 第四步：启动服务

#### 4.1 构建并启动

1. 进入 1Panel **应用 → 我的应用**
2. 找到 `kec-manager` 应用
3. 点击 **启动** 按钮
4. 系统会自动执行 `docker compose up -d --build`

#### 4.2 查看启动日志

1. 在应用列表中点击 `kec-manager` 进入详情页
2. 切换到 **日志** 标签页
3. 观察后端和前端容器的启动日志

正常日志示例：

```
# 后端日志
Server running on http://localhost:3000

# 前端日志
/nginx: ready for connections
```

#### 4.3 检查健康状态

在 1Panel **容器 → 容器列表** 中查看：

- `kec-server`: 状态应为 **运行中**，健康检查显示 **健康**
- `kec-client`: 状态应为 **运行中**

---

### 第五步：初始化管理员

#### 5.1 执行种子脚本

1. 进入 1Panel **容器 → 容器列表**
2. 找到 `kec-server` 容器
3. 点击右侧 **终端** 按钮（或进入 **主机 → 终端** 执行命令）
4. 在容器终端中执行：

```bash
npm run db:seed
```

看到以下输出表示成功：

```
✓ 超级管理员账号已创建
  用户名: admin
  密码: admin@123456
  角色: super_admin
```

#### 5.2 访问系统

在浏览器中访问：

| 地址 | 说明 |
|------|------|
| `http://your-server-ip` | 前端管理界面 |
| `http://your-server-ip:3000/api/health` | 后端健康检查 |

使用默认账号登录：

- **用户名**: `admin`
- **密码**: `admin@123456`

> ⚠️ **重要**：首次登录后请立即修改密码！

---

## 域名与 HTTPS 配置

### 方案一：使用 1Panel 网站功能（推荐）

#### 1. 创建网站

1. 进入 1Panel **网站 → 网站**
2. 点击 **创建网站**
3. 选择 **反向代理** 类型
4. 填写配置：

   | 字段 | 值 |
   |------|-----|
   | 主域名 | `kec.your-domain.com` |
   | 代理地址 | `http://127.0.0.1:80` |

5. 点击 **确认**

#### 2. 申请 SSL 证书

1. 在网站列表中找到刚创建的网站
2. 点击 **配置 → SSL**
3. 选择 **Let's Encrypt** 免费证书
4. 填写邮箱，点击 **申请**
5. 申请成功后，开启 **强制 HTTPS**

#### 3. 修改 CORS 配置

编辑 `/opt/kec-manager/.env`：

```bash
CORS_ORIGINS=https://kec.your-domain.com
```

重启服务：

```bash
cd /opt/kec-manager
docker compose restart
```

### 方案二：手动配置 Nginx

如果 1Panel 版本不支持反向代理网站，可以手动配置：

#### 1. 创建 Nginx 配置文件

在 1Panel **主机 → 终端** 中执行：

```bash
cat > /opt/1panel/apps/nginx/openresty/conf/conf.d/kec.conf << 'EOF'
server {
    listen 80;
    server_name kec.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

#### 2. 重载 Nginx

```bash
docker exec 1panel-openresty nginx -s reload
```

---

## 数据备份与恢复

### 自动备份（推荐）

#### 1. 配置 1Panel 计划任务

1. 进入 1Panel **计划任务 → 计划任务**
2. 点击 **创建计划任务**
3. 配置如下：

   | 字段 | 值 |
   |------|-----|
   | 任务类型 | 备份应用数据 |
   | 任务名称 | `KEC数据库备份` |
   | 执行周期 | 每天 02:00 |
   | 备份目标 | 本地磁盘 / OSS / S3 |
   | 保留份数 | 7 天 |

4. 点击 **确认**

### 手动备份

#### 备份数据库

在 1Panel **主机 → 终端** 中执行：

```bash
cd /opt/kec-manager

# 备份 SQLite 数据库
docker compose exec server tar czf /tmp/db-backup-$(date +%Y%m%d).tar.gz -C /app/data .

# 复制到宿主机
docker compose cp server:/tmp/db-backup-$(date +%Y%m%d).tar.gz ./backups/

# 备份上传文件
docker compose exec server tar czf /tmp/uploads-backup-$(date +%Y%m%d).tar.gz -C /app/uploads .
docker compose cp server:/tmp/uploads-backup-$(date +%Y%m%d).tar.gz ./backups/
```

#### 恢复数据库

```bash
cd /opt/kec-manager

# 停止服务
docker compose down

# 恢复数据库
docker compose cp ./backups/db-backup-20260613.tar.gz server:/tmp/restore.tar.gz
docker compose run --rm server tar xzf /tmp/restore.tar.gz -C /app/data

# 启动服务
docker compose up -d
```

### 导出完整应用数据

```bash
cd /opt
tar czf kec-manager-full-backup-$(date +%Y%m%d).tar.gz kec-manager/
```

---

## 常见问题

### Q1: 容器启动失败，日志显示 "Permission denied"

**原因**: 数据目录权限不正确

**解决**:
```bash
cd /opt/kec-manager
chown -R 1000:1000 server/data server/uploads
docker compose up -d
```

### Q2: 前端页面空白，控制台报 404 错误

**原因**: Nginx 配置未正确处理 Vue Router history 模式

**解决**: 检查 `client/nginx.conf` 是否包含：
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

重新构建前端容器：
```bash
docker compose build client
docker compose up -d client
```

### Q3: 后端 API 返回 500 错误

**查看日志**:
```bash
docker compose logs -f server
```

常见原因：
- 数据库文件损坏：删除 `server/data/kec.db` 后重新执行 `npm run db:seed`
- JWT_SECRET 未配置：检查 `.env` 文件
- 端口冲突：修改 `docker-compose.yml` 中的端口映射

### Q4: 如何修改前端访问端口？

编辑 `docker-compose.yml`：
```yaml
services:
  client:
    ports:
      - "8080:80"  # 将宿主机 8080 映射到容器 80
```

重启服务：
```bash
docker compose up -d client
```

### Q5: 如何更新应用到最新版本？

```bash
cd /opt/kec-manager

# 拉取最新代码
git pull

# 重新构建并启动
docker compose up -d --build

# 查看日志确认启动成功
docker compose logs -f
```

### Q6: 如何查看资源使用情况？

在 1Panel **容器 → 容器列表** 中可以查看每个容器的：
- CPU 使用率
- 内存使用量
- 网络流量
- 磁盘 I/O

或者在终端执行：
```bash
docker stats kec-server kec-client
```

### Q7: 忘记 admin 密码怎么办？

**方法一：通过 Prisma Studio**
```bash
docker compose exec server npx prisma studio
```
在浏览器中打开显示的地址，找到 `users` 表，手动修改密码哈希。

**方法二：重置管理员账号**
```bash
# ⚠️ 这会清空所有数据！
docker compose down -v
docker compose up -d --build
docker compose exec server npm run db:seed
```

### Q8: 如何限制容器资源？

编辑 `docker-compose.yml`，添加资源限制：
```yaml
services:
  server:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
  
  client:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
```

重启服务生效：
```bash
docker compose up -d
```

---

## 附录：1Panel 常用操作速查

| 操作 | 路径 |
|------|------|
| 查看容器日志 | 容器 → 容器列表 → 点击容器 → 日志 |
| 进入容器终端 | 容器 → 容器列表 → 点击容器 → 终端 |
| 重启容器 | 容器 → 容器列表 → 选择容器 → 重启 |
| 查看资源占用 | 容器 → 容器列表 → 查看 CPU/内存列 |
| 备份应用数据 | 计划任务 → 创建备份任务 |
| 查看磁盘占用 | 主机 → 磁盘分析 |
| 修改防火墙规则 | 安全 → 防火墙 |

---

<div align="center">

**KEC 课程管理平台** · 1Panel 部署指南

最后更新：2026-06-13

</div>
