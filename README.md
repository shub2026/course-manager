# KEC 课程管理平台

<div align="center">

**面向教学管理人员的轻量级课程管理系统**

[![Node](https://img.shields.io/badge/node-%3E%3D18.0-green.svg)](https://nodejs.org/)
[![Vue](https://img.shields.io/badge/vue-3.5+-brightgreen.svg)](https://vuejs.org/)
[![Express](https://img.shields.io/badge/express-5.1+-blue.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/prisma-6.19+-blue.svg)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

一站式教学管理解决方案 · 前后端分离架构 · 开箱即用

[快速开始](#-快速开始) · [功能特性](#-核心功能) · [技术文档](#-技术架构) · [常见问题](#-常见问题)

</div>

---

## 📋 项目简介

KEC（Knowledge Education Course）课程管理平台是一套专为中小型教育机构设计的独立教学管理系统。平台提供从基础数据管理、班级编排、培养方案制定到教材调配的完整业务流程支持，帮助教务人员高效管理教学资源。

### 🎯 适用场景

- **职业院校**：职业技术学院、技工学校的课程与班级管理
- **培训机构**：培训课程的培养方案与教材管理
- **教务部门**：开课计划制定与教学资源统一调配

### ✨ 核心优势

| 优势 | 说明 |
|------|------|
| **零依赖部署** | SQLite 数据库开箱即用，无需额外安装 MySQL |
| **智能自动化** | 年级自动推算、课程矩阵可视化、批量导入导出 |
| **安全可靠** | JWT 双令牌认证、操作审计日志、细粒度权限控制 |
| **灵活扩展** | Prisma ORM 支持无缝切换 MySQL，满足业务增长需求 |

---

## 🚀 核心功能

### 📊 基础数据管理

- **组织架构**：学院、专业、培养层次三级管理体系
- **用户权限**：超级管理员、管理员、访客三种角色，精细化权限控制
- **系统配置**：自定义单位名称、学期设置、登录页品牌化

### 🏫 班级与课程管理

- **班级管理**：支持 Excel 批量导入，智能年级推算，毕业状态自动标记
- **课程库**：公共基础课与专业课分类管理，周课时灵活配置
- **教材管理**：教材信息维护，与课程关联绑定

### 📚 培养方案

- **方案制定**：按专业或培养层次制定培养方案，支持多版本管理
- **课程矩阵**：可视化编辑界面，直观展示课程-学期分布
- **特殊方案**：支持为特殊班级单独指定自定义培养方案
- **历史查询**：支持查询历史学期的培养方案和开课情况

### 📈 查询与统计

- **开课查询**：按学期自动查询开课情况，支持多维度筛选
- **教材统计**：教材使用情况统计，一键导出 Excel 报表
- **历史数据**：支持查询历史学期的开课和教材使用情况
- **审计日志**：全操作链路记录，支持查询和导出，便于安全审计

### 📤 数据导入导出

- **批量导入**：Excel 模板下载，批量导入班级/课程/教材数据
- **一键导出**：开课计划、教材清单、审计报告等关键数据导出
- **数据校验**：导入时自动校验数据完整性，错误提示清晰明确

---

## 🛠️ 技术架构

### 技术栈

```
前端                          后端                        数据库
┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Vue 3.5+     │    │ Express 5.1+     │    │ SQLite (开发)   │
│ Element Plus │◄──►│ Prisma 6.19+     │◄──►│ MySQL (生产)    │
│ Pinia 3.0+   │    │ JWT 9.0+         │    └─────────────────┘
│ Vite 5.4+    │    │ Winston 3.19+    │
└──────────────┘    └──────────────────┘
```

### 核心技术选型

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **前端框架** | Vue 3 | 3.5+ | Composition API + `<script setup>` |
| **UI 组件** | Element Plus | 2.14+ | 企业级组件库，中文国际化 |
| **图标库** | Element Plus Icons | 2.3+ | 丰富的图标资源 |
| **构建工具** | Vite | 5.4+ | 极速 HMR，秒级热更新 |
| **状态管理** | Pinia | 3.0+ | Vue 3 官方推荐，类型安全 |
| **路由** | Vue Router | 4.6+ | 前端路由管理 |
| **HTTP 客户端** | Axios | 1.17+ | 请求拦截器，Token 自动刷新 |
| **排序** | SortableJS | 1.15+ | 拖拽排序功能 |
| **后端框架** | Express | 5.1+ | 轻量级，中间件生态丰富 |
| **ORM** | Prisma | 6.19+ | 类型安全，Schema 驱动开发 |
| **认证** | JWT | 9.0+ | Access + Refresh Token 双令牌 |
| **密码加密** | bcryptjs | 3.0+ | 安全的密码哈希存储 |
| **日志** | Winston | 3.19+ | 结构化日志，文件滚动存储 |
| **Excel** | ExcelJS | 4.4+ | 纯 JS 实现，无系统依赖 |
| **文件上传** | Multer | 2.0+ |  multipart/form-data 处理 |
| **参数校验** | express-validator | 7.3+ | 请求参数验证 |
| **速率限制** | express-rate-limit | 8.5+ | API 限流保护 |
| **跨域** | CORS | 2.8+ | 跨域资源共享配置 |

### 系统架构

```
┌───────────────────────────────────────────────────────┐
│                   浏览器客户端                          │
│  Vue 3 + Element Plus + Pinia + Vue Router            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ 基础数据  │ │ 班级管理  │ │ 培养方案  │ │ 查询报表  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└────────────────────────┬──────────────────────────────┘
                         │ REST API + JWT Bearer Token
┌────────────────────────┴──────────────────────────────┐
│                  Express 后端服务                       │
│  ┌────────┐  ┌──────────┐  ┌────────┐  ┌───────────┐  │
│  │ 路由层  │→│ 中间件链  │→│ 业务层  │→│ 数据访问层 │  │
│  │15个模块│  │认证/审计  │  │Service │  │Prisma ORM │  │
│  └────────┘  └──────────┘  └────────┘  └───────────┘  │
└────────────────────────┬──────────────────────────────┘
                         │ Prisma Client
┌────────────────────────┴──────────────────────────────┐
│                数据库 (SQLite / MySQL)                  │
│  12 张表: users, classes, courses, textbooks, ...      │
└───────────────────────────────────────────────────────┘
```

---

## 📦 环境要求

- **Node.js**: 18.x 或更高版本（LTS 推荐）
- **npm**: 8.x 或更高版本
- **操作系统**: Windows 10+ / macOS 10.15+ / Linux
- **浏览器**: Chrome 90+ / Edge 90+ / Firefox 88+（仅前端使用）

> 💡 **提示**：本项目仅需 Node.js 环境，无需安装 MySQL 等数据库软件（开发环境使用 SQLite）。

---

## ⚡ 快速开始

### 1️⃣ 克隆项目

```bash
git clone https://github.com/shub2026/kec-manager.git
cd kec-manager
```

### 2️⃣ 安装依赖

```bash
# 安装根目录依赖（包含 concurrently 用于同时启动）
npm install

# 安装后端依赖
cd server && npm install && cd ..

# 安装前端依赖
cd client && npm install && cd ..
```

### 3️⃣ 初始化数据库

```bash
cd server

# 执行数据库迁移（创建表结构）
npx prisma migrate dev --name init

# 生成 Prisma Client
npx prisma generate

cd ..
```

### 4️⃣ 创建管理员账号

```bash
cd server
npm run db:seed
cd ..
```

**默认管理员账号**：

| 字段 | 值 |
|------|-----|
| 用户名 | `admin` |
| 密码 | `admin@123456` |
| 角色 | `super_admin` |

> ⚠️ **重要**：首次登录后请立即修改默认密码！详细登录指南参见 [LOGIN_GUIDE.md](LOGIN_GUIDE.md)

**种子数据安全特性**：
- ✅ 智能检查：只在不存在时创建 admin，不会覆盖已有账号
- ✅ 生产保护：默认不清空业务数据，可安全重复执行
- ✅ 多种模式：支持开发测试和强制重置场景

详细用法参见 [种子数据使用指南](server/prisma/SEED_USAGE.md)

### 5️⃣ 启动开发服务器

```bash
# 同时启动前后端（推荐）
npm run dev
```

或者分别启动：

```bash
# 仅启动后端
npm run dev:server

# 仅启动前端
npm run dev:client
```

### 6️⃣ 访问系统

启动成功后，在浏览器中访问：

| 地址 | 说明 |
|------|------|
| http://localhost:5173 | 前端管理界面（如端口被占用，Vite 会自动选择其他端口） |
| http://localhost:3000 | 后端 API 服务 |
| http://localhost:3000/api/health | 健康检查接口 |

使用 admin 账号登录系统。

**默认管理员账号**：

| 字段 | 值 |
|------|-----|
| 用户名 | `admin` |
| 密码 | `admin@123456` |
| 角色 | `super_admin` |

> ⚠️ **重要**：首次登录后请立即修改默认密码！详细登录指南参见 [LOGIN_GUIDE.md](LOGIN_GUIDE.md)

### 7️⃣ 导入基础数据

首次部署后，系统为空数据库。请按以下顺序导入基础数据：

1. **培养层次** → 中专、大专、高技工等
2. **学院** → 各二级学院
3. **专业** → 各专业类别
4. **课程** → 公共基础课与专业课（支持 Excel 批量导入）
5. **教材** → 教材信息（支持 Excel 批量导入）
6. **班级** → 班级数据（支持 Excel 批量导入）
7. **培养方案** → 制定各专业的开课计划

---

## 📁 项目结构

```
kec-manager/
├── client/                      # 前端应用
│   ├── src/
│   │   ├── api/                 # API 接口封装（15个模块）
│   │   │   ├── audit.js         # 审计日志 API
│   │   │   ├── auth.js          # 认证 API
│   │   │   ├── class.js         # 班级管理 API
│   │   │   ├── college.js       # 学院管理 API
│   │   │   ├── course.js        # 课程管理 API
│   │   │   ├── major.js         # 专业管理 API
│   │   │   ├── plan.js          # 培养方案 API
│   │   │   ├── textbook.js      # 教材管理 API
│   │   │   ├── trainingLevel.js # 培养层次 API
│   │   │   ├── user.js          # 用户管理 API
│   │   │   └── ...              # 其他业务模块
│   │   ├── components/          # 公共组件
│   │   ├── router/              # 路由配置
│   │   ├── stores/              # Pinia 状态管理
│   │   │   ├── auth.js          # 认证状态
│   │   │   └── settings.js      # 系统设置
│   │   ├── utils/               # 工具函数
│   │   │   ├── request.js       # Axios 封装
│   │   │   └── cache.js         # 缓存工具
│   │   ├── views/               # 页面组件（18个页面）
│   │   │   ├── Login.vue        # 登录页
│   │   │   ├── Dashboard.vue    # 仪表盘
│   │   │   ├── NotFound.vue     # 404页面
│   │   │   ├── basicData/       # 基础数据管理
│   │   │   ├── class/           # 班级管理
│   │   │   ├── course/          # 课程管理
│   │   │   ├── textbook/        # 教材管理
│   │   │   ├── plan/            # 培养方案
│   │   │   ├── query/           # 查询统计
│   │   │   └── system/          # 系统管理
│   │   ├── App.vue              # 根组件
│   │   └── main.js              # 入口文件
│   ├── index.html               # HTML 模板
│   ├── vite.config.js           # Vite 配置
│   └── package.json             # 前端依赖
│
├── server/                      # 后端服务
│   ├── prisma/
│   │   ├── schema.prisma        # 数据模型定义（12个模型）
│   │   ├── migrations/          # 数据库迁移文件
│   │   ├── seed.js              # 种子数据脚本
│   │   └── SEED_USAGE.md        # 种子数据使用指南
│   ├── src/
│   │   ├── routes/              # API 路由（15个模块）
│   │   │   ├── auth.routes.js   # 认证路由
│   │   │   ├── user.routes.js   # 用户管理
│   │   │   ├── class.routes.js  # 班级管理
│   │   │   ├── course.routes.js # 课程管理
│   │   │   ├── plan.routes.js   # 培养方案
│   │   │   ├── export.routes.js # 数据导出
│   │   │   ├── import.routes.js # 数据导入
│   │   │   ├── audit.routes.js  # 审计日志
│   │   │   └── ...              # 其他业务路由
│   │   ├── services/            # 业务逻辑层
│   │   ├── middleware/          # 中间件
│   │   │   ├── auth.middleware.js  # JWT 认证
│   │   │   ├── audit.js         # 审计日志
│   │   │   ├── validation.js    # 参数校验
│   │   │   └── error.js         # 错误处理
│   │   ├── config/              # 配置文件
│   │   ├── utils/               # 工具函数
│   │   │   └── response.js      # 统一响应格式
│   │   ├── lib/                 # 第三方库封装
│   │   ├── app.js               # Express 应用
│   │   └── server.js            # 服务入口
│   ├── uploads/                 # 文件上传目录
│   ├── .env                     # 环境变量
│   ├── .env.example             # 环境变量示例
│   └── package.json             # 后端依赖
│
├── docs/                        # 项目文档
│   ├── semester-calculation.md  # 学期计算逻辑说明
│   ├── kec-manager-全面检查分析报告*.md  # 项目检查报告
│   └── ...                      # 其他技术文档
│
├── LOGIN_GUIDE.md               # 登录指南
├── package.json                 # 根级别脚本
└── README.md                    # 项目说明文档
```

---

## 🔧 配置说明

### 环境变量

后端配置文件：`server/.env`

```bash
# 数据库配置
# 开发环境使用 SQLite（默认）
DATABASE_URL="file:./dev.db"

# 生产环境切换到 MySQL
# DATABASE_URL="mysql://user:password@localhost:3306/kec_manager"

# JWT 密钥（生产环境请修改为强随机字符串）
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"

# JWT 过期时间
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# 服务器端口
PORT=3000

# 日志级别：error, warn, info, debug
LOG_LEVEL="info"

# 文件上传大小限制（MB）
MAX_FILE_SIZE=10
```

### 前端代理配置

前端开发环境通过 Vite 代理转发 API 请求到后端：

```javascript
// client/vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

---

## 📝 常用命令

### 根目录

```bash
npm run dev              # 同时启动前后端开发服务器（推荐）
npm run dev:server       # 仅启动后端（端口 3000）
npm run dev:client       # 仅启动前端（端口 5173，如被占用会自动切换）
npm run db:migrate       # 执行数据库迁移
npm run db:generate      # 生成 Prisma Client
```

### 后端 (server/)

```bash
npm run dev              # 启动后端（--watch 模式，自动重启）
npm start                # 启动后端（生产模式）
npm run db:migrate       # 执行 Prisma 迁移
npm run db:generate      # 生成 Prisma Client
npm run db:seed          # 初始化超级管理员（安全，可重复执行）
npm run db:seed:dev      # 开发模式：清空数据 + 创建测试数据
npm run db:seed:reset    # ⚠️ 强制重置：清空所有数据（危险！）
```

### 前端 (client/)

```bash
npm run dev              # 启动 Vite 开发服务器
npm run build            # 构建生产版本
npm run preview          # 预览构建结果
```

---

## 🗄️ 数据库模型

系统包含 12 张核心数据表：

| 表名 | 说明 | 主要字段 |
|------|------|---------|
| `users` | 用户账号 | username, password, role, real_name |
| `colleges` | 学院 | name, code, description |
| `training_levels` | 培养层次 | name, duration_years |
| `majors` | 专业 | name, code, college_id, training_level_id |
| `courses` | 课程 | name, code, type, total_hours |
| `textbooks` | 教材 | name, isbn, publisher, author |
| `classes` | 班级 | name, major_id, enrollment_year, grade |
| `training_plans` | 培养方案 | name, major_id, training_level_id |
| `plan_courses` | 方案课程关联 | plan_id, course_id, semester, weekly_hours |
| `plan_textbooks` | 方案教材关联 | plan_course_id, textbook_id |
| `system_settings` | 系统设置 | key, value, description |
| `audit_logs` | 审计日志 | user_id, action, resource, ip_address |

详细模型定义参见：[`server/prisma/schema.prisma`](server/prisma/schema.prisma)

---

## 🔐 安全特性

### 认证与授权

- **JWT 双令牌机制**：Access Token（15分钟）+ Refresh Token（7天）
- **密码加密存储**：bcryptjs 加盐哈希，10轮迭代
- **Token 自动刷新**：前端无感知刷新，用户体验流畅
- **细粒度权限控制**：基于角色的路由守卫和操作权限校验

### 数据安全

- **SQL 注入防护**：Prisma ORM 参数化查询，杜绝 SQL 注入
- **XSS 防护**：Vue 3 自动转义输出，Element Plus 组件安全渲染
- **CORS 配置**：严格限制跨域来源，生产环境需配置白名单
- **文件上传校验**：文件类型、大小双重校验，防止恶意上传

### 审计追踪

- **全操作记录**：登录、增删改查等关键操作自动记录
- **IP 地址追踪**：记录操作来源 IP，便于安全审计
- **日志导出功能**：支持按时间、用户、操作类型筛选导出

---

## 🚢 生产部署

### 方式一：传统部署（推荐中小规模）

#### 1. 准备服务器

- 操作系统：Ubuntu 20.04 LTS / CentOS 8 / Windows Server 2019
- 配置建议：2核 CPU / 4GB 内存 / 50GB 硬盘
- 软件要求：Node.js 18+ / Nginx / PM2

#### 2. 后端部署

```bash
# 克隆代码
git clone https://github.com/shub2026/kec-manager.git
cd kec-manager/server

# 安装依赖
npm install --production

# 配置生产环境变量
cp .env.example .env
vim .env  # 修改 DATABASE_URL 为 MySQL 连接字符串

# 执行数据库迁移
npx prisma migrate deploy
npx prisma generate

# 创建管理员账号
npm run db:seed

# 使用 PM2 启动服务
npm install -g pm2
pm2 start src/server.js --name kec-server
pm2 save
pm2 startup
```

#### 3. 前端部署

```bash
cd ../client

# 安装依赖
npm install

# 构建生产版本
npm run build

# dist 目录部署到 Nginx
sudo cp -r dist/* /var/www/kec-manager/
```

#### 4. Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/kec-manager;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 反向代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 方式二：Docker Compose 部署（推荐）

本项目提供完整的容器化部署方案，使用 Docker Compose 一键启动前后端服务。

#### 前置要求

- **Docker**: 20.10+ 
- **Docker Compose**: v2.0+

检查安装：
```bash
docker --version
docker compose version
```

#### 快速启动

**1. 克隆项目并进入目录**
```bash
git clone https://github.com/shub2026/kec-manager.git
cd kec-manager
```

**2. 配置环境变量**
```bash
# 复制环境变量示例文件
cp .env.example .env

# 生成安全的 JWT 密钥
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 编辑 .env 文件，填入生成的密钥
vim .env
```

**3. 构建并启动服务**
```bash
# 首次启动（构建镜像）
docker compose up -d --build

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

**4. 初始化管理员账号**
```bash
# 在后端容器中执行种子脚本
docker compose exec server npm run db:seed
```

**5. 访问系统**

| 地址 | 说明 |
|------|------|
| http://localhost | 前端管理界面 |
| http://localhost:3000 | 后端 API 服务 |
| http://localhost:3000/api/health | 健康检查接口 |

默认管理员账号：`admin` / `admin@123456`

#### 常用命令

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看日志
docker compose logs -f server    # 仅后端
docker compose logs -f client    # 仅前端

# 进入容器 Shell
docker compose exec server sh
docker compose exec client sh

# 重新构建镜像
docker compose build --no-cache

# 更新服务
git pull
docker compose up -d --build

# 清理（删除容器、网络、卷）
docker compose down -v
```

#### 数据持久化

Docker Compose 配置中使用了命名卷来持久化数据：

- **sqlite-data**: SQLite 数据库文件（位于 `/app/data/kec.db`）
- **uploads**: 用户上传的文件（Excel、图片等）

查看卷信息：
```bash
docker volume ls | grep kec
docker volume inspect kec-manager_sqlite-data
```

备份数据：
```bash
# 备份数据库
docker compose exec server tar czf /tmp/db-backup.tar.gz -C /app/data .
docker compose cp server:/tmp/db-backup.tar.gz ./backup-$(date +%Y%m%d).tar.gz

# 恢复数据库
docker compose cp ./backup-20260613.tar.gz server:/tmp/restore.tar.gz
docker compose exec server tar xzf /tmp/restore.tar.gz -C /app/data
```

#### 生产环境部署

**1. 修改 docker-compose.yml**

```yaml
services:
  client:
    ports:
      - "80:80"  # 根据实际需求修改端口

  server:
    environment:
      - NODE_ENV=production
      - CORS_ORIGINS=https://your-domain.com  # 修改为实际域名
```

**2. 配置 HTTPS（使用 Nginx 反向代理）**

创建 `nginx-proxy.conf`：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**3. 使用 PM2 管理 Docker Compose**

创建 `ecosystem.config.js`：
```javascript
module.exports = {
  apps: [
    {
      name: 'kec-manager',
      script: 'docker compose up -d'
    }
  ]
};
```

#### 故障排查

**问题1：容器启动失败**
```bash
# 查看详细日志
docker compose logs server

# 检查健康状态
docker compose ps

# 重新构建并启动
docker compose up -d --build --force-recreate
```

**问题2：数据库连接错误**
```bash
# 检查数据卷权限
docker compose exec server ls -la /app/data

# 重置数据库（⚠️ 会丢失所有数据）
docker compose down -v
docker compose up -d --build
docker compose exec server npm run db:seed
```

**问题3：前端无法访问后端 API**
```bash
# 检查 CORS 配置
docker compose exec server env | grep CORS

# 检查网络连接
docker compose exec client ping server
```

**问题4：端口被占用**
```bash
# 修改 docker-compose.yml 中的端口映射
ports:
  - "8080:80"  # 将宿主机 8080 映射到容器 80
```

#### 性能优化

**1. 多阶段构建减小镜像体积**
```bash
# 查看镜像大小
docker images | grep kec

# 前端约 50MB，后端约 150MB（基于 Alpine Linux）
```

**2. 资源限制**
在 `docker-compose.yml` 中添加：
```yaml
services:
  server:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

**3. 日志轮转**
```yaml
services:
  server:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

---

## ❓ 常见问题

### 一般问题

<details>
<summary><strong>Q: 忘记了 admin 密码怎么办？</strong></summary>

**A**: 不要重新执行种子脚本（会清空数据）！有两种方法：

1. **通过数据库直接重置**（推荐）：
   ```bash
   # 进入 server 目录
   cd server

   # 使用 Prisma Studio（可视化数据库管理工具）
   npx prisma studio
   # 在浏览器中找到 users 表，手动修改密码哈希值
   ```

2. **生成新的密码哈希并更新**：
   ```javascript
   // 在 server 目录下执行
   node -e "import('bcryptjs').then(b => b.default.hash('新密码', 10).then(h => console.log(h)))"

   # 复制输出的哈希值，通过 Prisma Studio 或数据库工具更新
   ```
</details>

<details>
<summary><strong>Q: 如何从 SQLite 切换到 MySQL？</strong></summary>

**A**: 三步完成切换：

1. 修改 `server/.env`：
   ```bash
   DATABASE_URL="mysql://user:password@localhost:3306/kec_manager"
   ```

2. 执行迁移：
   ```bash
   cd server
   npx prisma migrate deploy
   npx prisma generate
   ```

3. 初始化管理员：
   ```bash
   npm run db:seed
   ```

Prisma 会自动处理数据库差异，无需手动建表。
</details>

<details>
<summary><strong>Q: 生产环境执行种子脚本会删除我的数据吗？</strong></summary>

**A**: **不会！** 重构后的种子脚本具有生产环境保护机制：

- 默认模式（`npm run db:seed`）：**不清空任何数据**，仅检查并创建 admin（如果不存在）
- 多次执行完全安全，不会覆盖已有账号
- 只有显式使用 `FORCE_RESET=true` 才会清空数据

详细参见：[种子数据使用指南](server/prisma/SEED_USAGE.md)
</details>

<details>
<summary><strong>Q: 如何备份数据库？</strong></summary>

**A**: 

**SQLite 备份**：
```bash
# 直接复制数据库文件
cp server/dev.db server/dev.db.backup.$(date +%Y%m%d)
```

**MySQL 备份**：
```bash
mysqldump -u username -p kec_manager > backup_$(date +%Y%m%d).sql

# 恢复
mysql -u username -p kec_manager < backup_20260611.sql
```
</details>

### 技术问题

<details>
<summary><strong>Q: 启动时报错 "Prisma Client not generated"</strong></summary>

**A**: 需要生成 Prisma Client：

```bash
cd server
npx prisma generate
```
</details>

<details>
<summary><strong>Q: 前端访问后端 API 报 CORS 错误</strong></summary>

**A**: 检查后端 CORS 配置：

```javascript
// server/src/app.js
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}))
```

生产环境需配置正确的域名。
</details>

<details>
<summary><strong>Q: Excel 导入失败，提示格式错误</strong></summary>

**A**: 请确保：

1. 使用系统提供的最新模板（可能字段有更新）
2. 必填字段不能为空
3. 日期格式正确（YYYY-MM-DD）
4. 外键关联的数据已存在（如学院、专业等）

查看后端日志获取详细错误信息。
</details>

更多问题参见：[完整 FAQ 文档](docs/FAQ.md)（待完善）和 [登录指南](LOGIN_GUIDE.md)

---

## 📚 开发文档

### 后端开发

- [API 接口文档](docs/API.md) - RESTful API 详细说明（待完善）
- [数据模型设计](docs/DATABASE.md) - Prisma Schema 设计思路（待完善）
- [中间件开发](docs/MIDDLEWARE.md) - 自定义中间件指南（待完善）
- [种子数据管理](server/prisma/SEED_USAGE.md) - 测试数据管理
- [学期计算逻辑](docs/semester-calculation.md) - 学期自动推算算法说明

### 前端开发

- [组件开发规范](docs/COMPONENTS.md) - Vue 组件最佳实践（待完善）
- [状态管理](docs/STATE.md) - Pinia Store 使用指南（待完善）
- [API 调用封装](docs/API_CLIENT.md) - Axios 拦截器配置（待完善）

### 部署运维

- [生产部署指南](docs/DEPLOYMENT.md) - 详细部署步骤（待完善）
- [性能优化](docs/PERFORMANCE.md) - 前后端性能调优（待完善）
- [监控与日志](docs/MONITORING.md) - 系统监控方案（待完善）

### 项目报告

- [全面检查分析报告](docs/kec-manager-全面检查分析报告-20260612-v2.md) - 项目质量评估报告

---

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出新功能建议！

### 提交 Issue

- 🐛 **Bug 报告**：详细描述问题、复现步骤、预期行为
- 💡 **功能建议**：说明使用场景和期望效果
- 📖 **文档改进**：指出文档不清晰或错误的地方

### 提交 PR

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add some amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

### 代码规范

- 遵循 ESLint 和 Prettier 配置（待配置）
- 提交前检查代码风格
- 为新功能编写测试（待完善）
- 更新相关文档

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 🙏 致谢

感谢以下开源项目为本平台提供支持：

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Element Plus](https://element-plus.org/) - Vue 3 组件库
- [Express](https://expressjs.com/) - Node.js Web 框架
- [Prisma](https://www.prisma.io/) - 下一代 ORM
- [Vite](https://vitejs.dev/) - 下一代前端构建工具

---

<div align="center">

**KEC 课程管理平台** © 2026

Made with ❤️ for educators

</div>
