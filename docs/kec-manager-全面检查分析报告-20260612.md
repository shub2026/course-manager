# KEC 课程管理平台 — 全面检查分析报告

> 分析日期：2026-06-12 | 仓库：github.com/shub2026/kec-manager | 分支：main | 最新提交：2566037 | 提交总数：91

---

## 一、项目概览

| 维度 | 详情 |
|------|------|
| **项目名称** | KEC 课程管理平台 (course-management) |
| **定位** | 面向职业技术院校的轻量级课程管理平台 |
| **架构** | 前后端分离：Vue 3 + Express + Prisma + SQLite |
| **代码规模** | 前端 23 个 Vue 组件 + 15 个 JS 模块，后端 33 个源文件，13 个 Prisma 数据模型 |
| **文档规模** | 2 份文档（含 1 份审计报告），README 完整详尽 |
| **提交历史** | 91 次提交，含多次 Bug 修复和功能迭代 |
| **代码质量** | 整体良好，存在若干关键安全问题待修复 |

---

## 二、技术栈评估

| 层级 | 技术 | 版本 | 评价 |
|------|------|------|------|
| 前端框架 | Vue 3 (Composition API) | 3.5.34 | ✅ 现代写法，`<script setup>` 一致使用 |
| UI 组件库 | Element Plus | 2.14.1 | ✅ 企业级组件，中文国际化适配良好 |
| 构建工具 | Vite | 5.4.21 | ✅ 极速 HMR，配置简洁 |
| 状态管理 | Pinia | 3.0.4 | ✅ Vue 3 官方推荐，使用得当 |
| 后端框架 | Express | 5.1.0 | ✅ ESM 模块化，结构清晰 |
| ORM | Prisma | 6.19.3 | ✅ 类型安全，支持 SQLite/MySQL 切换 |
| 认证 | JWT (jsonwebtoken) | 9.0.3 | ⚠️ 三种 Token 共享同一密钥 |
| 密码加密 | bcryptjs | 3.0.3 | ⚠️ 迭代次数 10（推荐 ≥12），硬编码未提取常量 |
| Excel | ExcelJS | 4.4.0 | ✅ 纯 JS 实现，无系统依赖 |
| 日志 | Winston | 3.19.0 | ❌ 已配置但代码中完全未使用（死代码） |

---

## 三、后端安全分析

### 🔴 严重（5 项）

| 编号 | 问题 | 位置 | 状态 | 详情 |
|------|------|------|------|------|
| **C1** | JWT 密钥明文存储于 `.env` | `server/.env` | ✅ **已修复** | `.gitignore` 已排除 `.env`，密钥不会被提交。建议生产环境使用 Docker secrets 或系统环境变量注入 |
| **C2** | 登录接口无速率限制 | `server/src/routes/auth.routes.js` | ✅ **已修复** | 已添加 `loginLimiter`（10次/15分钟），refresh 接口（30次/15分钟）和修改密码接口（5次/15分钟）均已限制 |
| **C3** | Token 支持 URL 查询参数传递 | `server/src/middleware/auth.middleware.js` | ✅ **已修复** | 已移除通用 `req.query.token`，仅保留短期 `downloadToken`（60s有效），风险可控 |
| **C4** | 班级 POST/PUT/DELETE 缺少角色权限校验 | `server/src/routes/class.routes.js:285,343,408` | ✅ **已修复** | 已添加 `roleMiddleware('admin', 'super_admin')` 到所有写操作路由 |
| **C5** | 培养方案 POST/PUT/DELETE 缺少角色权限校验 | `server/src/routes/plan.routes.js:120,190,295` | ✅ **已修复** | 已添加 `roleMiddleware('admin', 'super_admin')` 到顶级方案路由，与子路由保持一致 |

### 🟠 高危（8 项）

| 编号 | 问题 | 位置 | 状态 | 详情 |
|------|------|------|------|------|
| **H1** | 错误处理器泄露内部错误信息 | `server/src/middleware/error.js:1-11` | ❌ **未修复** | 未区分生产/开发环境，`err.message` 直接返回客户端，可能暴露数据库查询细节 |
| **H2** | 自定义错误类定义但从未使用 | `server/src/utils/error.js` | ❌ **未修复** | 定义了 `AppError`、`NotFoundError`、`ValidationError` 等 6 个类，全项目无任何 import 引用，为死代码 |
| **H3** | 修改密码接口未应用密码强度校验中间件 | `server/src/routes/auth.routes.js:115-125` | ❌ **未修复** | `validation.js` 中已定义 `validateChangePassword`（含大小写+数字+特殊字符），但修改密码路由仅做 `length < 8` 基础检查 |
| **H4** | 创建用户时不校验密码强度 | `server/src/routes/user.routes.js:49-78` | ❌ **未修复** | 仅检查密码是否为空，管理员可创建如 "123" 的弱密码账号 |
| **H5** | 系统设置 PUT 接口可注入任意 Key | `server/src/routes/settings.routes.js:36-45` | ❌ **未修复** | 虽有 `DEFAULT_SETTINGS` 白名单定义，但 PUT 接口未校验请求 key 是否在白名单内。已限 `super_admin` 角色，实际风险有限 |
| **H6** | 批量导入非事务性操作 | `server/src/routes/import.routes.js` | ❌ **未修复** | 三个导入接口（班级、课程、教材）逐行独立操作，未使用 `prisma.$transaction`，部分失败时无法回滚 |
| **H7** | 导入数据未经清洗直接存储 | `server/src/routes/import.routes.js` | ❌ **未修复** | 仅做 `.trim()` 和 `Number()` 类型转换，无 XSS 清洗（未去除 HTML 标签/脚本），存在存储型 XSS 风险 |
| **H8** | 直接修改 Prisma 查询结果对象 | `server/src/routes/class.routes.js:260-267` | ❌ **未修复** | 直接修改 `cls.status` 属性，应使用展开运算符 `{ ...cls, status }` 创建新对象 |

### 🟡 中危（12 项）

| 编号 | 问题 | 状态 | 详情 |
|------|------|------|------|
| **M1** | 路由错误处理模式不一致（3 种方式） | ❌ 未修复 | 模式A-直接fail()（auth/user），模式B-next(e)（audit），模式C-嵌套try/catch+next(e)（其余12个路由） |
| **M2** | 审计日志记录方式不一致 | ✅ **已修复** | 统一 details 字段为标准对象格式（19处），补充 download-token 审计日志 |
| **M3** | 学期参数解析逻辑重复 6 次 | ❌ 未修复 | 相同的 `split('-')` + `Number()` + `isNaN` 校验模式在 export.routes、query.routes、settings.service 中重复 6 次 |
| **M4** | 方案匹配逻辑重复实现 | ❌ 未修复 | `findBestMatchPlan()` 在 2 处重复，`isClassMatchPlan()` 在 3 处重复，逻辑完全一致 |
| **M5** | GET 请求中执行写操作（排序自动修复） | ❌ 未修复 | 7 处 GET 路由包含 `sort_order` 自动修复的 `prisma.update` 操作（college/major/course/textbook/trainingLevel/plan×2） |
| **M6** | `getActiveClassFilter` 无 duration 空值兜底 | ⚠️ 部分兜底 | 已过滤 null 学制，但全 null 时返回空集导致所有班级被视为"不在读"，与 class.routes 逻辑不一致 |
| **M7** | 生产代码中大量 console.log 调试输出 | ❌ 未修复 | **32 处 console.log + 22 处 console.error/warn**，import.routes.js 最严重（21处，含逐行打印原始数据） |
| **M8** | PUT 路由中字段可能传 undefined | ❌ 未修复 | 3 种处理风格混用：直接传递、显式过滤 undefined、三元运算符+undefined |
| **M9** | bcrypt 迭代次数仅 10 | ❌ 未修复 | 两处硬编码 `bcrypt.hash(password, 10)`，值在推荐范围内但未提取为常量 |
| **M10** | Access/Refresh/Download Token 共用同一密钥 | ❌ 未修复 | `auth.config.js` 仅定义一个 `jwtSecret`，三种用途完全不同的 Token 共用同一密钥 |
| **M11** | 系统设置 GET 接口执行写操作 | ❌ 未修复 | 懒初始化模式：GET 时自动创建缺失的默认设置，违反 RESTful 规范 |
| **M12** | 导入路由内置调试中间件 | ❌ 未修复 | `import.routes.js:28-36` 包含纯调试用的内联中间件，打印请求方法/URL/Content-Type/Auth头 |

### 🔵 低危（12 项）

主要包括：未使用的工具函数/常量、Winston 日志器完全未使用（死代码）、CSS 重复、无障碍缺失、无国际化支持、服务层较薄（大部分业务逻辑直接写在路由中）、服务器关闭时未等待活跃连接等。

---

## 四、前端代码分析

### 🔴 严重（3 项）

| 编号 | 问题 | 位置 | 状态 | 详情 |
|------|------|------|------|------|
| **FC1** | 导入错误对话框使用 `dangerouslyUseHTMLString` | `ClassList.vue:893-907` | ❌ **未修复** | 错误消息通过 HTML 字符串渲染，若 errors 内容含用户可控数据存在 XSS 注入风险 |
| **FC2** | Token 通过 URL 查询参数暴露 | `SemesterQuery.vue:146-160`、`HistoricalSemesterQuery.vue:192-214` | ⚠️ **部分修复** | 已改用一次性 `downloadToken` 替代主 JWT，但仍通过 URL 参数传递，会出现在浏览器历史、服务器日志、Referer 头中 |
| **FC3** | 生产代码残留调试 console.log | `ClassList.vue:784-795` 等 5 处 | ❌ **未修复** | ClassList.vue 打印 token 状态和用户信息；AuditLog.vue 打印 API 响应；CourseMatrix.vue 打印课程数量 |

### 🟠 高危（6 项）

| 编号 | 问题 | 状态 | 详情 |
|------|------|------|------|
| **FH1** | API 响应数据访问方式不一致 | ❌ 未修复 | 大多数视图使用 `res.data`，但 `UserManagement.vue:201` 和 `auth.js` store 使用 `response.data`，拦截器返回 `response.data` 后各组件解包方式不统一 |
| **FH2** | 删除操作缺少组件级错误处理 | ❌ 未修复 | 9 个视图的 `handleDelete` 中 7 个无 try/catch，删除失败时会出现 unhandled rejection 和闪现的成功提示 |
| **FH3** | 批量操作使用逐条 API 调用 | ❌ 未修复 | `ClassList.vue` 批量删除/设置使用 `Promise.all(ids.map(id => deleteXxx(id)))`，100 条记录发出 100 个请求 |
| **FH4** | Token 刷新队列存在竞态条件 | ❌ 未修复 | `isRefreshing` 在 refresh 请求自身 401 时可能永远停留在 true，导致所有后续请求永久排队 |
| **FH5** | 无 CSRF 保护 | ❌ 未修复 | 项目完全依赖 Bearer Token 认证，无 CSRF 机制。当前风险较低，但若增加 Cookie 认证将变得严重 |
| **FH6** | 开发模式暴露测试账号密码 | ⚠️ **部分修复** | 已使用 `import.meta.env.DEV` 限制仅开发环境显示，但硬编码的 `admin@123456` 通过源码审查仍可发现 |

### 🟡 中危（9 项）

| 问题 | 状态 | 详情 |
|------|------|------|
| 表单验证不一致 | ❌ 未修复 | 仅 3 个表单（Login/UserManagement/ChangePassword）使用 `:rules` 声明式验证，其余 8 个依赖手动 if 检查 |
| `sort_order`/`sortOrder` 命名混用 | ✅ **已修复** | 全项目 48 处排序统一使用 `sortOrder`，无 `sort_order` 残留 |
| 缓存无大小限制 | ❌ 未修复 | `utils/cache.js` 使用 Map 存储无 maxSize 限制，仅过期清理，持续增长可能导致内存泄漏 |
| 导出实现模式不一致 | ❌ 未修复 | 部分使用 `window.open`，部分使用 Axios + Blob |
| 缺少加载状态 | ❌ 未修复 | 部分视图缺少 loading 指示器 |
| UserManagement 字段命名 Bug | ❌ **未修复（确认功能Bug）** | `real_name`/`realName` 和 `is_active`/`isActive` 混用，导致创建用户时姓名无法提交、编辑时无法回显、状态按钮显示异常 |
| PlanList 筛选非响应式 | ❌ 未修复 | `filteredlist` 为 `ref` 而非 `computed`，依赖 `@change` 事件触发，数据更新后不自动重新筛选 |
| 上传绕过 Axios 拦截器 | ❌ 未修复 | 文件上传使用独立实例，绕过全局拦截器的 token 注入和错误处理 |
| Token 刷新队列竞态条件 | ❌ 未修复 | 同 FH4 |

### 🔵 低危（10 项）

主要包括：无障碍缺失（无 ARIA 标签）、无国际化支持、空函数残留、CSS 重复、版权信息含个人邮箱、settings store 无格式校验、组件间样式不统一等。

---

## 五、脚本与工具检查

### ❌ update-class-status.js 致命 Bug

| 问题 | 详情 |
|------|------|
| **模型名错误** | 使用 `prisma.class.findMany()`，正确应为 `prisma.classes.findMany()` |
| **字段名错误** | 使用 `cls.enrollmentYear`、`cls.durationYears`（camelCase），正确应为 `cls.enrollment_year`、`cls.duration_years`（snake_case） |
| **影响** | 此脚本**完全无法运行**，执行时会在第一个查询就报错 |

---

## 六、代码架构评价

### ✅ 优点

1. **前后端分离架构清晰**：14 个路由模块、9 个 API 模块，职责分明
2. **命名转换中间件设计优雅**：`snake_case` ↔ `camelCase` 自动转换，解耦前后端
3. **Token 刷新队列机制**：`failedQueue` 模式防止并发刷新（尽管存在竞态条件）
4. **Prisma ORM 使用得当**：有效防止 SQL 注入，支持数据库切换
5. **课程矩阵组件设计良好**：`CourseMatrix.vue` 作为可复用组件，props/emits/expose 完整
6. **数据重置功能设计周全**：三级级联策略 + "输入确认" 防止误操作
7. **README 文档详尽**：覆盖快速开始、API 文档、部署指南、FAQ
8. **JWT 密钥启动校验**：缺失时立即报错，防止不安全运行
9. **速率限制已完善**：登录、刷新Token、修改密码三个关键接口均已添加速率限制

### ⚠️ 需改进

1. **权限校验不完整**：C4/C5 已修复，但其他路由的细粒度权限控制仍需加强
2. **大量死代码**：错误类（6个）、Winston 日志配置、验证器等已定义但从未集成
3. **日志系统虚设**：Winston 已配置但全项目 54 处 console 输出无一使用 logger
4. **导入操作非事务性**：大数据量导入缺乏原子性保证
5. **代码重复严重**：学期解析 6 处、方案匹配 5 处、排序修复 7 处
6. **UserManagement 功能 Bug**：字段命名不一致导致实际功能异常

---

## 七、修复优先级建议

### 第一优先级（立即修复）

| 序号 | 问题 | 预计工时 | 与上次对比 |
|------|------|----------|-----------|
| 1 | 为 class.routes.js 和 plan.routes.js 添加 `roleMiddleware('admin')` | 0.5h | 未变 |
| 2 | 修复 `update-class-status.js` 模型名和字段名 | 0.2h | 未变 |
| 3 | 修复 UserManagement 字段命名 Bug（real_name/realName、is_active/isActive） | 0.5h | 未变 |
| 4 | 错误处理器区分生产和开发环境 | 0.5h | 未变 |

### 第二优先级（本周内）

| 序号 | 问题 | 预计工时 | 与上次对比 |
|------|------|----------|-----------|
| 5 | 修改密码接口应用 `validateChangePassword` 中间件 | 0.3h | 未变 |
| 6 | 创建用户时校验密码强度 | 0.3h | 未变 |
| 7 | 系统设置 PUT 添加 Key 白名单 | 0.5h | 未变 |
| 8 | 导入操作包装为事务 | 2h | 未变 |
| 9 | 移除生产代码中的调试 console.log（54处） | 1.5h | 未变 |
| 10 | 移除导入路由的调试中间件 | 0.1h | 未变 |
| 11 | 导入数据添加 XSS 清洗 | 1h | 未变 |

### 第三优先级（迭代优化）

| 序号 | 问题 | 预计工时 | 与上次对比 |
|------|------|----------|-----------|
| 12 | 统一错误处理模式 | 2h | 未变 |
| 13 | 整合自定义错误类到路由 | 3h | 未变 |
| 14 | 启用 Winston 日志替换 console | 2h | 未变 |
| 15 | 提取学期解析/方案匹配为共享工具函数 | 2h | 未变 |
| 16 | 统一审计日志记录方式 | 1h | 未变 |
| 17 | Access/Refresh/Download Token 使用不同密钥 | 1h | 未变 |
| 18 | 批量操作改用批量 API 端点 | 2h | 未变 |
| 19 | PlanList 筛选改为 computed | 0.3h | 未变 |
| 20 | 前端导出统一使用 fetch + blob | 1h | 未变 |
| 21 | GET 路由中的排序修复改为 POST/PATCH | 1h | 未变 |

---

## 八、统计数据总览

| 维度 | 严重 | 高危 | 中危 | 低危 | 合计 |
|------|------|------|------|------|------|
| 后端安全 | 5（5已修复） | 8 | 12（1已修复） | 12 | 37 |
| 前端代码 | 3 | 6 | 9（1已修复） | 10 | 28 |
| 脚本工具 | 1 | 0 | 0 | 0 | 1 |
| **总计** | **9** | **14** | **21** | **22** | **66** |

### 修复进度追踪

| 状态 | 数量 | 占比 | 编号 |
|------|------|------|------|
| ✅ 已修复 | 7 | 10.6% | C1, C2, C3, C4, C5, sortOrder 命名, M2 |
| ⚠️ 部分修复 | 3 | 4.5% | FC2, FH6, M6 |
| ❌ 未修复 | 56 | 84.9% | 其余各项 |

### 与上次报告对比（2026-06-11 → 2026-06-12）

| 变化 | 详情 |
|------|------|
| 已修复项（7项） | C1（.gitignore排除.env）、C2（速率限制）、C3（downloadToken替代通用query token）、**C4（班级权限校验）**、**C5（培养方案权限校验）**、sortOrder命名统一、M2（审计日志details格式统一+补充download-token日志） |
| 部分修复项（3项） | FC2（改用downloadToken但仍URL传递）、FH6（限DEV环境但密码硬编码）、M6（部分兜底） |
| 新增发现 | `update-class-status.js` 脚本致命 Bug（模型名+字段名双重错误） |
| 未变化 | H1-H8, M1, M3-M5, M7-M12, FC1, FC3, FH1-FH5 等均未修复 |

---

## 九、结论

KEC 课程管理平台是一个**架构设计良好、功能完整**的教学管理系统，技术选型合理，代码组织清晰。经过 91 次提交迭代，项目功能日趋完善。

自上次报告以来，项目已修复 **5 项严重安全问题**（JWT 密钥保护、登录速率限制、Token URL 泄露、**班级权限校验**、**培养方案权限校验**）和 **2 项中危问题**（sortOrder命名统一、审计日志details格式统一），修复进度为 10.6%。但仍有 **56 项问题未修复**，其中 8 项高危级别需要优先处理。

**最紧迫的问题**现在是：

1. **H1-H8 高危问题** — 特别是错误处理器信息泄露（H1）、自定义错误类未使用（H2）、密码强度校验缺失（H3/H4）等
2. **update-class-status.js 脚本完全无法运行** — 修复成本 0.2h
3. **UserManagement 字段命名 Bug 导致功能异常** — 修复成本 0.5h

以上三项合计仅需约 1.2 个工时，建议立即处理。

代码层面最大的系统性问题是 **54 处 console 输出** 和 **Winston 日志完全未启用**，以及 **学期解析/方案匹配等逻辑的大量重复**（合计约 18 处重复代码）。建议作为第三优先级进行系统性重构。

---

*报告由自动化代码审查生成，共分析 33 个后端源文件、23 个 Vue 组件、15 个前端 JS 模块、13 个 Prisma 数据模型。*
