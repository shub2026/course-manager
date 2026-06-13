# KEC 课程管理平台

<div align="center">

**面向教学管理人员的轻量级课程管理系统**

[![Node](https://img.shields.io/badge/node-%3E%3D18.0-green.svg)](https://nodejs.org/)
[![Vue](https://img.shields.io/badge/vue-3.5+-brightgreen.svg)](https://vuejs.org/)
[![Express](https://img.shields.io/badge/express-5.1+-blue.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/prisma-6.19+-blue.svg)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

一站式教学管理解决方案 · 前后端分离架构 · 开箱即用

[快速开始](#-快速开始) · [核心功能](#-核心功能) · [技术架构](#-技术架构) · [生产部署](#-生产部署)

</div>

---

## 项目简介

KEC（Knowledge Education Course）课程管理平台是一套专为中小型教育机构设计的独立教学管理系统，提供从基础数据管理、班级编排、培养方案制定到教材调配的完整业务流程支持。

### 适用场景

- **职业院校**：职业技术学院、技工学校的课程与班级管理
- **培训机构**：培训课程的培养方案与教材管理
- **教务部门**：开课计划制定与教学资源统一调配

### 核心优势

| 优势 | 说明 |
|------|------|
| **零依赖部署** | SQLite 开箱即用，无需安装 MySQL |
| **一键部署** | 提供 `deploy.sh` 自动化部署脚本 |
| **智能自动化** | 年级自动推算、课程矩阵可视化、批量导入导出 |
| **安全可靠** | JWT 双令牌认证、操作审计日志、细粒度权限控制 |
| **灵活扩展** | Prisma ORM 支持无缝切换 MySQL |

---

## 核心功能

### 基础数据管理

- **组织架构**：学院、专业、培养层次三级管理体系
- **用户权限**：超级管理员、管理员、访客三种角色
- **系统配置**：自定义单位名称、学期设置、登录页品牌化

### 班级与课程管理

- **班级管理**：支持 Excel 批量导入，智能年级推算，毕业状态自动标记
- **课程库**：公共基础课与专业课分类管理，周课时灵活配置
- **教材管理**：教材信息维护，与培养方案课程关联绑定

### 培养方案

- **方案制定**：按专业或培养层次制定培养方案，支持多版本管理
- **课程矩阵**：可视化编辑界面，展示课程-学期-周课时分布
- **特殊方案**：支持为特殊班级单独指定自定义培养方案
- **学期查询**：按学期自动查询开课情况，支持多维度筛选

### 查询与导出

- **开课查询**：当前学期和历史学期开课计划查询
- **教材统计**：教材使用情况统计，一键导出 Excel 报表
- **审计日志**：全操作链路记录，支持查询和导出

### 数据导入导出

- **批量导入**：Excel 模板下载，批量导入班级/课程/教材等数据
- **一键导出**：开课计划、教材清单、审计报告等关键数据导出
- **数据校验**：导入时自动校验数据完整性

---

## 技术架构

### 技术栈

```
前端                          后端                        数据库
┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Vue 3.5+     │    │ Express 5.1+     │    │ SQLite (默认)   │
│ Element Plus │◄──►│ Prisma 6.19+     │◄──►│ MySQL (可选)    │
│ Pinia 3.0+   │    │ JWT 9.0+         │    └─────────────────┘
│ Vite 5.4+    │    │ Winston 3.19+    │
└──────────────┘    └──────────────────┘
```

### 核心技术

| 层级 | 技术 | 用途 |
|------|------|------|
| **前端框架** | Vue 3.5 | Composition API + `<script setup>` |
| **UI 组件** | Element Plus 2.14 | 企业级组件库 |
| **构建工具** | Vite 5.4 | 极速 HMR 热更新 |
| **状态管理** | Pinia 3.0 | Vue 3 官方推荐 |
| **HTTP 客户端** | Axios 1.17 | 请求拦截器 + Token 自动刷新 |
| **后端框架** | Express 5.1 | 轻量级 Web 框架 |
| **ORM** | Prisma 6.19 | 类型安全，Schema 驱动 |
| **认证** | JWT 9.0 | Access + Refresh Token 双令牌 |
| **密码加密** | bcryptjs 3.0 | 加盐哈希存储 |
| **Excel** | ExcelJS 4.4 | 纯 JS 实现，无系统依赖 |
| **速率限制** | express-rate-limit 8.5 | API 限流保护 |

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
│  │14个模块│  │认证/审计  │  │Service │  │Prisma ORM │  │
│  └────────┘  └──────────┘  └────────┘  └───────────┘  │
└────────────────────────┬──────────────────────────────┘
                         │ Prisma Client
┌────────────────────────┴──────────────────────────────┐
│                数据库 (SQLite / MySQL)                  │
│  13 张表: users, classes, courses, textbooks, ...      │
└───────────────────────────────────────────────────────┘
```

---

## 环境要求

- **Node.js**: 18.x 或更高版本（推荐 20.x LTS）
- **npm**: 8.x 或更高版本
- **浏览器**: Chrome 90+ / Edge 90+ / Firefox 88+

> 本项目仅需 Node.js 环境，无需安装 MySQL 等数据库（开发环境使用 SQLite）。

---

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/shub2026/kec-manager.git
cd kec-manager
```

### 2. 安装依赖

```bash
# 根目录依赖
npm install

# 后端依赖
cd server && npm install && cd ..

# 前端依赖
cd client && npm install && cd ..
```

### 3. 初始化数据库

```bash
cd server

# 执行数据库迁移（创建表结构）
npx prisma migrate dev --name init

# 生成 Prisma Client
npx prisma generate

# 初始化管理员账号
npm run db:seed

cd ..
```

### 4. 启动开发服务器

```bash
# 同时启动前后端（推荐）
npm run dev

# 或分别启动
npm run dev:server   # 后端：http://localhost:3000
npm run dev:client   # 前端：http://localhost:5173
```

### 5. 访问系统

| 地址 | 说明 |
|------|------|
| http://localhost:5173 | 前端管理界面 |
| http://localhost:3000 | 后端 API 服务 |
| http://localhost:3000/api/health | 健康检查接口 |

**默认管理员账号**：

| 字段 | 值 |
|------|-----|
| 用户名 | `admin` |
| 密码 | `admin@123456` |
| 角色 | `super_admin` |

> 首次登录后请立即修改默认密码。

### 6. 导入基础数据

首次部署后系统为空数据库，请按以下顺序导入：

1. **培养层次** → 中专、大专、高技工等
2. **学院** → 各二级学院
3. **专业** → 各专业类别
4. **课程** → 公共基础课与专业课
5. **教材** → 教材信息
6. **班级** → 班级数据（支持 Excel 批量导入）
7. **培养方案** → 制定各专业的开课计划

---

## 常用命令

### 根目录

```bash
npm run dev              # 同时启动前后端
npm run dev:server       # 仅启动后端（端口 3000）
npm run dev:client       # 仅启动前端（端口 5173）
npm run db:migrate       # 执行数据库迁移
npm run db:generate      # 生成 Prisma Client
```

### 后端 (server/)

```bash
npm run dev              # 启动后端（自动重启模式）
npm start                # 生产模式启动
npm run db:seed          # 初始化管理员（安全，可重复执行）
npm run db:seed:dev      # 开发模式：创建测试数据
npm run db:seed:reset    # ⚠️ 强制重置：清空所有数据
npm run init:settings    # 初始化系统设置（学期、单位名称）
npm run diagnose         # 运行诊断工具
```

### 前端 (client/)

```bash
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run preview          # 预览构建结果
```

---

## 生产部署

项目提供一键部署脚本 `deploy.sh`，自动完成环境检查、代码克隆、依赖安装、数据库初始化、前端构建和服务启动全流程。

### 快速部署

```bash
# 克隆仓库
git clone https://github.com/shub2026/kec-manager.git /tmp/kec-manager

# 执行部署
cd /tmp/kec-manager && bash deploy.sh

# 清理
rm -rf /tmp/kec-manager
```

部署脚本会自动执行 9 个步骤：

```
[1/9] 检查 Git、Node.js 版本
[2/9] 创建部署目录
[3/9] 克隆代码
[4/9] 安装前后端依赖
[5/9] 生成环境变量（JWT 密钥等）
[6/9] 数据库迁移 + Prisma Client + 管理员账号
[7/9] 系统设置初始化
[8/9] 构建前端
[9/9] 启动服务 + 健康检查验证
```

### 部署后配置

1. 编辑 CORS 配置：`vim /opt/1panel/.../kec-manager/server/.env`
2. 配置 Nginx 反向代理
3. 设置 HTTPS 证书（推荐 Let's Encrypt）

### 更新部署

```bash
cd /opt/1panel/www/sites/kec/index/kec-manager
git pull && bash deploy.sh
```

> 详细部署步骤、Nginx 配置、HTTPS 设置和故障排查请参考 [部署指南](docs/DEPLOYMENT_GUIDE.md)。

---

## 项目结构

```
kec-manager/
├── client/                          # 前端应用
│   ├── src/
│   │   ├── api/                     # API 接口封装
│   │   ├── components/              # 公共组件
│   │   ├── router/                  # 路由配置
│   │   ├── stores/                  # Pinia 状态管理
│   │   ├── utils/                   # 工具函数
│   │   └── views/                   # 页面组件（19 个）
│   │       ├── Login.vue            # 登录页
│   │       ├── Dashboard.vue        # 仪表盘
│   │       ├── basicData/           # 基础数据（学院/专业/层次）
│   │       ├── class/               # 班级管理
│   │       ├── course/              # 课程管理
│   │       ├── textbook/            # 教材管理
│   │       ├── plan/                # 培养方案
│   │       ├── query/               # 查询统计（4 个查询页面）
│   │       ├── system/              # 系统管理（用户/审计日志）
│   │       └── settings/            # 系统设置
│   ├── vite.config.js               # Vite 配置
│   └── package.json
│
├── server/                          # 后端服务
│   ├── prisma/
│   │   ├── schema.prisma            # 数据模型（13 个表）
│   │   ├── migrations/              # 数据库迁移
│   │   └── seed.js                  # 种子数据脚本
│   ├── src/
│   │   ├── routes/                  # API 路由（14 个模块）
│   │   ├── services/                # 业务逻辑层
│   │   ├── middleware/              # 中间件（认证/审计/错误处理）
│   │   ├── config/                  # 配置文件
│   │   ├── utils/                   # 工具函数
│   │   ├── lib/                     # 第三方库封装
│   │   ├── app.js                   # Express 应用
│   │   └── server.js                # 服务入口
│   ├── scripts/                     # 运维脚本
│   │   ├── diagnose.js              # 环境诊断工具
│   │   └── init-settings.js         # 系统设置初始化
│   ├── data/                        # SQLite 数据库文件
│   ├── .env                         # 环境变量
│   └── package.json
│
├── deploy.sh                        # 一键部署脚本
├── docs/                            # 项目文档
│   ├── DEPLOYMENT_GUIDE.md          # 生产环境部署指南
│   ├── PRODUCTION_DEPLOYMENT.md     # 部署检查清单
│   └── semester-calculation.md      # 学期计算逻辑
├── package.json                     # 根级脚本
└── README.md                        # 项目说明
```

---

## 数据库模型

系统包含 13 张核心数据表：

| 表名 | 说明 |
|------|------|
| `users` | 用户账号 |
| `colleges` | 学院 |
| `majors` | 专业 |
| `training_levels` | 培养层次 |
| `classes` | 班级 |
| `courses` | 课程 |
| `textbooks` | 教材 |
| `training_plans` | 培养方案 |
| `plan_courses` | 方案课程关联 |
| `plan_course_semesters` | 课程学期分布 |
| `plan_textbooks` | 方案教材关联 |
| `system_settings` | 系统设置 |
| `audit_logs` | 审计日志 |

详细模型定义参见 [`server/prisma/schema.prisma`](server/prisma/schema.prisma)。

---

## 安全特性

### 认证与授权

- **JWT 双令牌**：Access Token（15 分钟）+ Refresh Token（7 天）
- **密码加密**：bcryptjs 加盐哈希存储
- **Token 自动刷新**：前端无感知刷新
- **三级权限**：超级管理员 / 管理员 / 访客，路由级权限控制

### 数据安全

- **SQL 注入防护**：Prisma ORM 参数化查询
- **XSS 防护**：Vue 3 自动转义输出
- **CORS 白名单**：严格限制跨域来源
- **API 限流**：登录等敏感接口速率限制

### 审计追踪

- **全操作记录**：登录、增删改查等关键操作自动记录
- **IP 地址追踪**：记录操作来源 IP
- **日志导出**：支持按时间、用户、操作类型筛选导出

---

## 环境变量

后端配置文件 `server/.env`：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NODE_ENV` | 运行环境 | production |
| `DATABASE_URL` | 数据库连接 | file:./dev.db |
| `PORT` | 后端端口 | 3000 |
| `JWT_SECRET` | JWT 签名密钥 | （自动生成） |
| `JWT_REFRESH_SECRET` | Refresh Token 密钥 | （自动生成） |
| `JWT_DOWNLOAD_SECRET` | 下载 Token 密钥 | （自动生成） |
| `JWT_EXPIRES_IN` | Token 过期时间 | 15m |
| `JWT_REFRESH_EXPIRES_IN` | Refresh Token 过期时间 | 7d |
| `CORS_ORIGINS` | 允许的前端域名 | （部署时配置） |
| `LOG_LEVEL` | 日志级别 | info |
| `MAX_FILE_SIZE` | 上传文件大小限制（MB） | 10 |

---

## 常见问题

### 忘记管理员密码

```bash
cd server

# 方法 1：通过 Prisma Studio 可视化修改
npx prisma studio

# 方法 2：命令行重置
node -e "import('bcryptjs').then(b => b.default.hash('新密码', 10).then(h => console.log(h)))"
# 复制输出的哈希值，在 Prisma Studio 中更新 users 表的 password 字段
```

### 从 SQLite 切换到 MySQL

```bash
# 1. 修改 .env
DATABASE_URL="mysql://user:password@localhost:3306/kec_manager"

# 2. 重新迁移
cd server
npx prisma migrate deploy
npx prisma generate

# 3. 初始化管理员
npm run db:seed
```

### 登录页报 /api/settings 500 错误

```bash
cd server
npm run init:settings
pm2 restart kec-server
```

### 登录报 /api/auth/login 500 错误

```bash
cd server
npm run db:seed
pm2 restart kec-server
```

> 更多故障排查请参考 [部署指南 - 故障排查](docs/DEPLOYMENT_GUIDE.md#四故障排查)。

---

## 相关文档

- [生产环境部署指南](docs/DEPLOYMENT_GUIDE.md) — 完整部署流程、Nginx 配置、HTTPS 设置
- [部署检查清单](docs/PRODUCTION_DEPLOYMENT.md) — 服务器准备、部署步骤、监控维护
- [学期计算逻辑](docs/semester-calculation.md) — 学期自动推算算法说明

---

## 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

---

<div align="center">

**KEC 课程管理平台** © 2026

</div>
