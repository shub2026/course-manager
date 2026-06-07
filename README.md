# KEC课程管理系统

面向教学管理人员的轻量级课程管理系统，独立运行，不对接现有教学管理平台。

## 项目概述

本系统解决教学管理中的核心痛点：课程、班级、培养方案和教材信息的统一管理，以及按学期自动查询开课情况和教材使用情况。

### 核心能力

| 能力 | 说明 |
|------|------|
| 课程管理 | 公共基础课与专业课分类管理，体现在培养方案中 |
| 班级管理 | 批量导入班级，设置入学年份、学制、专业类别、人数等 |
| 培养方案 | 按专业类别制定开课计划：开课学期、周课时、学期周数均可调整 |
| 教材管理 | 书名、书号、出版社等基础信息录入，按学期关联到培养方案课程 |
| 开课查询 | 查询当前学期各班级的课程、课时、教材使用情况，导出 Excel |
| 教材查询 | 查询某教材被哪些班级使用、学生人数合计，导出 Excel 用于安排试卷 |

### 业务规则

- 专业类别 3-5 个，覆盖所有班级，班级数量 300 个以内
- 培养方案 3-5 套，分别对应专业类别
- 专业类别关联培养方案，特殊班级可单独指定方案覆盖默认方案
- 每套培养方案中，各科目按学期关联教材
- 按入学时间和当前学期配置，自动推算班级在读年级

## 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Vue 3 + Element Plus + Vite | 轻量高效，Element Plus 表格/表单组件匹配后台管理需求 |
| 后端 | Node.js + Express | 轻量灵活，RESTful API 开发效率高 |
| ORM | Prisma | 原生支持 SQLite 和 MySQL，迁移无缝切换 |
| 数据库 | SQLite（本地）→ MySQL（云端） | 零配置本地运行，后期一行配置迁移到 MySQL |
| Excel | exceljs | 纯 JS 实现，读写 Excel 无需额外依赖 |

## 环境要求

- **Node.js**: 18.x 或 20.x
- **npm**: 8.x+

## 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/shub2026/course-manager.git
cd course-manager

# 2. 安装后端依赖
cd server
npm install
cd ..

# 3. 安装前端依赖
cd client
npm install
cd ..

# 4. 安装根目录依赖（用于同时启动前后端）
npm install

# 5. 初始化数据库
cd server
npx prisma migrate dev
cd ..

# 6. 导入示例数据（可选，包含3个专业、11门课程、6本教材、3套方案、6个班级）
cd server
node prisma/seed.js
cd ..

# 7. 启动项目（同时启动前后端）
npm run dev
```

启动后访问：

- **前端页面**: http://localhost:5173
- **后端 API**: http://localhost:3000
- **API 健康检查**: http://localhost:3000/api/health

### 单独启动

```bash
# 仅启动后端（端口 3000）
cd server && npm run dev

# 仅启动前端（端口 5173，自动代理 /api 到后端）
cd client && npm run dev
```

## 项目结构

```
course-manager/
├── server/                       # 后端
│   ├── prisma/
│   │   ├── schema.prisma         # 数据库模型定义（8张表）
│   │   ├── migrations/           # 数据库迁移文件
│   │   └── seed.js               # 示例数据
│   ├── src/
│   │   ├── app.js                # Express 应用入口
│   │   ├── routes/               # API 路由
│   │   │   ├── major.routes.js   # 专业类别
│   │   │   ├── course.routes.js  # 课程
│   │   │   ├── textbook.routes.js# 教材
│   │   │   ├── class.routes.js   # 班级
│   │   │   ├── plan.routes.js    # 培养方案 + 课程明细 + 教材关联
│   │   │   ├── query.routes.js   # 开课查询 + 教材使用查询
│   │   │   ├── import.routes.js  # Excel 批量导入
│   │   │   ├── export.routes.js  # Excel 导出 + 模板下载
│   │   │   └── settings.routes.js# 系统设置
│   │   ├── middleware/error.js   # 全局错误处理
│   │   └── utils/
│   │       ├── excel.js          # Excel 读写工具
│   │       └── response.js       # 统一响应格式
│   ├── uploads/                  # 文件上传临时目录
│   └── .env                      # 环境变量（数据库连接、端口）
│
├── client/                       # 前端
│   ├── src/
│   │   ├── api/                  # API 调用封装（按模块拆分）
│   │   ├── components/           # 通用组件（Layout 布局框架）
│   │   ├── router/               # 路由配置
│   │   ├── stores/               # Pinia 状态管理
│   │   ├── utils/                # Axios 请求封装
│   │   └── views/                # 页面组件
│   │       ├── Dashboard.vue     # 首页概览（统计数据）
│   │       ├── major/            # 专业管理
│   │       ├── course/           # 课程管理
│   │       ├── textbook/         # 教材管理
│   │       ├── class/            # 班级管理
│   │       ├── plan/             # 培养方案（列表 + 明细编辑）
│   │       ├── query/            # 查询报表（开课 + 教材使用）
│   │       └── settings/         # 系统设置
│   └── vite.config.js            # Vite 配置（含 API 代理）
│
├── docs/
│   └── plan.md                   # 详细设计方案文档
│
└── package.json                  # 根目录脚本（concurrently 同时启动）
```

## 数据库设计

共 8 张表：

| 表名 | 说明 | 预估数据量 |
|------|------|-----------|
| `majors` | 专业类别 | 3-5 条 |
| `courses` | 课程 | 20-50 门 |
| `training_plans` | 培养方案 | 3-5 套 |
| `plan_courses` | 方案课程明细 | ~100 条 |
| `textbooks` | 教材 | 50-100 本 |
| `plan_textbooks` | 方案教材关联 | ~200 条 |
| `classes` | 班级 | ≤300 个 |
| `system_settings` | 系统设置 | 3 条 |

### 数据关系

```
Major(专业) ──1:N── TrainingPlan(培养方案) ──1:N── PlanCourse(方案课程)
PlanCourse ──N:1── Course(课程)
PlanCourse ──1:N── PlanTextbook(教材关联) ──N:1── Textbook(教材)
Class(班级) ──N:1── Major(专业)
Class ──0..1:1── TrainingPlan(特殊指定方案，覆盖默认)
```

## API 接口

### 基础数据 CRUD

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/majors` | 专业类别列表/新增 |
| PUT/DELETE | `/api/majors/:id` | 专业类别编辑/删除 |
| GET/POST | `/api/courses` | 课程列表/新增 |
| PUT/DELETE | `/api/courses/:id` | 课程编辑/删除 |
| GET/POST | `/api/textbooks` | 教材列表/新增 |
| PUT/DELETE | `/api/textbooks/:id` | 教材编辑/删除 |
| GET/POST | `/api/classes` | 班级列表/新增 |
| PUT/DELETE | `/api/classes/:id` | 班级编辑/删除 |

### 培养方案

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/plans` | 方案列表/新增 |
| PUT/DELETE | `/api/plans/:id` | 方案编辑/删除 |
| GET/POST | `/api/plans/:id/courses` | 方案课程列表/添加课程 |
| PUT/DELETE | `/api/plans/courses/:id` | 编辑/删除方案课程 |
| POST | `/api/plans/courses/:id/textbooks` | 关联教材 |
| DELETE | `/api/plans/textbooks/:id` | 取消教材关联 |

### 查询与导出

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/query/semester` | 当前学期开课查询 |
| GET | `/api/query/textbook/:id` | 教材使用情况查询 |
| GET | `/api/query/textbooks` | 所有教材使用概览 |
| GET | `/api/export/semester` | 导出开课情况 Excel |
| GET | `/api/export/textbook/:id` | 导出教材使用情况 Excel |
| GET | `/api/export/template/:type` | 下载导入模板（classes/courses/textbooks） |
| POST | `/api/import/classes` | 批量导入班级 Excel |
| POST | `/api/import/courses` | 批量导入课程 Excel |
| POST | `/api/import/textbooks` | 批量导入教材 Excel |

### 系统设置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/settings` | 获取所有设置 |
| PUT | `/api/settings` | 更新设置 |

设置项：`current_semester`（当前学期）、`semester_start_date`（开学日期）、`weeks_per_semester_default`（默认周数）

## 验证结果

### 数据库验证

- 8 张表全部创建成功
- 迁移文件正常生成（`prisma/migrations/`）
- 种子数据导入成功：3 个专业、11 门课程、6 本教材、3 套培养方案、6 个班级

### 后端 API 验证

| 接口 | 结果 | 说明 |
|------|------|------|
| `GET /api/health` | 通过 | 服务健康检查正常 |
| `GET /api/majors` | 通过 | 返回 3 个专业，含班级数和方案数统计 |
| `GET /api/query/semester` | 通过 | 返回 6 个在读班级的当前学期开课信息 |
| `GET /api/query/textbook/1` | 通过 | 返回"大学语文"的使用班级（1个班，48人） |
| 前端构建 `vite build` | 通过 | 所有页面组件编译成功，无错误 |

### 年级推算验证

当前学期设置为 `2025-2026-2`（2025-2026学年第2学期）：
- 2024 年入学 → 2 年级 → 第 4 学期
- 2025 年入学 → 1 年级 → 第 2 学期

验证结果与预期一致。

## 部署到阿里云

### 1. 切换到 MySQL

修改 `server/.env`：

```env
DATABASE_URL="mysql://用户名:密码@数据库地址:3306/course_management"
PORT=3000
```

### 2. 数据库迁移

```bash
cd server
npx prisma migrate deploy
node prisma/seed.js   # 可选：导入示例数据
```

### 3. 构建前端

```bash
cd client
npm run build    # 产出 dist/ 目录
```

### 4. Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 5. 后端进程管理

推荐使用 PM2：

```bash
npm install -g pm2
cd server
pm2 start src/app.js --name course-management
pm2 save
pm2 startup
```

## 常见问题

**Q: 学期格式是什么？**
A: 格式为 `起始学年-结束学年-学期序号`，如 `2025-2026-2` 表示 2025-2026 学年第 2 学期。在"系统设置"中配置。

**Q: 如何批量导入班级？**
A: 在班级管理页面点击"下载模板"获取 Excel 模板，按格式填写后点击"导入Excel"。模板列：班级名称、入学年份、学制(年)、专业类别、班级人数。

**Q: 特殊班级的培养方案怎么设置？**
A: 编辑班级时，在"特殊方案"下拉框中选择指定的培养方案。未指定时默认使用该专业关联的方案。

**Q: 如何从 SQLite 迁移到 MySQL？**
A: 只需修改 `.env` 中的 `DATABASE_URL` 为 MySQL 连接字符串，然后运行 `npx prisma migrate deploy`。Prisma 会自动处理差异。
