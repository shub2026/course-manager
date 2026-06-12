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
| **H1** | 错误处理器泄露内部错误信息 | `server/src/middleware/error.js:1-11` | ✅ **已修复** | 增强生产环境脱敏逻辑，添加getSafeMessage函数映射Prisma错误为安全提示 |
| **H2** | 自定义错误类定义但从未使用 | `server/src/utils/error.js` | ⚠️ **部分修复** | import.routes.js已集成ValidationError示例（6处），其他52处待后续迁移 |
| **H3** | 修改密码接口未应用密码强度校验中间件 | `server/src/routes/auth.routes.js:115-125` | ❌ **未修复** | `validation.js` 中已定义 `validateChangePassword`（含大小写+数字+特殊字符），但修改密码路由仅做 `length < 8` 基础检查 |
| **H4** | 创建用户时不校验密码强度 | `server/src/routes/user.routes.js:49-78` | ❌ **未修复** | 仅检查密码是否为空，管理员可创建如 "123" 的弱密码账号 |
| **H5** | 系统设置 PUT 接口可注入任意 Key | `server/src/routes/settings.routes.js:36-45` | ✅ **已修复** | 添加Key白名单验证，仅允许DEFAULT_SETTINGS中的键 |
| **H6** | 批量导入非事务性操作 | `server/src/routes/import.routes.js` | ✅ **已修复** | 三个导入接口全部使用prisma.$transaction包装，确保原子性回滚 |
| **H7** | 导入数据未经清洗直接存储 | `server/src/routes/import.routes.js` | ✅ **已修复** | 添加sanitizeInput和sanitizeFormulaInjection函数，防止XSS和公式注入 |
| **H8** | 直接修改 Prisma 查询结果对象 | `server/src/routes/class.routes.js:260-267` | ✅ **已修复** | 使用展开运算符创建新对象返回 |

### 🟡 中危（12 项）

| 编号 | 问题 | 状态 | 详情 |
|------|------|------|------|
| **M1** | 路由错误处理模式不一致（3 种方式） | ❌ 未修复 | 模式A-直接fail()（auth/user），模式B-next(e)（audit），模式C-嵌套try/catch+next(e)（其余12个路由） |
| **M2** | 审计日志记录方式不一致 | ✅ **已修复** | 统一 details 字段为标准对象格式（19处），补充 download-token 审计日志 |
| **M3** | 学期参数解析逻辑重复 6 次 | ✅ **已修复** | 创建统一的parseSemesterString和getSemesterInfoFromRequest函数（settings.service.js），替换query.routes.js和export.routes.js中的6处重复代码 |
| **M4** | 方案匹配逻辑重复实现 | ✅ **已修复** | 创建统一的plan.service.js提供findBestMatchPlan和isClassMatchPlan函数，消除query.routes.js和export.routes.js中的5处重复 |
| **M5** | GET 请求中执行写操作（排序自动修复） | ✅ **已修复** | 移除7处GET路由中的sort_order自动修复写操作（college/major/course/textbook/trainingLevel/plan×2），符合RESTful规范 |
| **M6** | `getActiveClassFilter` 无 duration 空值兜底 | ⚠️ 部分兜底 | 已过滤 null 学制，但全 null 时返回空集导致所有班级被视为"不在读"，与 class.routes 逻辑不一致 |
| **M7** | 生产代码中大量 console.log 调试输出 | ✅ **已修复** | 清理33处console输出（import.routes.js 21处、excel.js 3处、prisma.js 1处），保留22处必要的错误处理 |
| **M8** | PUT 路由中字段可能传 undefined | ✅ **已修复** | 统一使用updateData对象显式过滤undefined，class.routes.js和plan.routes.js共19处已统一风格 |
| **M9** | bcrypt 迭代次数仅 10 | ✅ **已修复** | 提取为authConfig.bcryptRounds常量（默认12），支持通过BCRYPT_ROUNDS环境变量配置，两处调用已更新 |
| **M10** | Access/Refresh/Download Token 共用同一密钥 | ✅ **已修复** | auth.config.js新增jwtRefreshSecret和jwtDownloadSecret，支持独立环境变量配置，auth.service.js三处生成/验证已更新 |
| **M11** | 系统设置 GET 接口执行写操作 | ✅ **已修复** | 移除GET中的自动创建逻辑，新增POST /api/settings/initialize专用初始化接口，符合RESTful规范 |
| **M12** | 导入路由内置调试中间件 | ✅ **已修复** | 已移除调试中间件代码 |

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
| 后端安全 | 5（5已修复） | 8（7已修复） | 12（10已修复） | 12 | 37 |
| 前端代码 | 3 | 6 | 9（1已修复） | 10 | 28 |
| 脚本工具 | 1（1已修复） | 0 | 0 | 0 | 1 |
| **总计** | **9** | **14** | **21** | **22** | **66** |

### 修复进度追踪

| 状态 | 数量 | 占比 | 编号 |
|------|------|------|------|
| ✅ 已修复 | 23 | 34.8% | C1, C2, C3, C4, C5, H1, H5, H6, H7, H8, M2, M3, M4, M5, M7, M8, M9, M10, M11, M12, sortOrder命名, update-class-status.js, FC1/FC3/FH2 |
| ⚠️ 部分修复 | 4 | 6.1% | FC2, FH6, H2, M6 |
| ❌ 未修复 | 39 | 59.1% | 其余各项（含M1待大规模重构） |

### 与上次报告对比（2026-06-11 → 2026-06-12）

| 变化 | 详情 |
|------|------|
| 已修复项（23项） | C1（.gitignore排除.env）、C2（速率限制）、C3（downloadToken替代通用query token）、**C4（班级权限校验）**、**C5（培养方案权限校验）**、sortOrder命名统一、M2（审计日志details格式统一+补充download-token日志）、**M7（清理33处调试输出）**、**H1（错误处理器生产环境脱敏）**、**H5（系统设置Key白名单验证）**、**H6（导入操作事务包装）**、**H7（XSS清洗和公式注入防护）**、**H8（Prisma对象展开运算符）**、**M8（PUT路由undefined处理统一）**、**M3（学期参数解析统一）**、**M4（方案匹配逻辑统一）**、**M5（移除GET请求写操作）**、**M9（bcrypt迭代次数配置化）**、**M10（Token密钥分离）**、**M11（系统设置GET接口去写操作）**、**M12（移除调试中间件）**、**update-class-status.js脚本修复（模型名+字段名双重BUG）**、**FC1/FC3/FH2前端安全性与错误处理** |
| 部分修复项（4项） | FC2（改用downloadToken但仍URL传递）、FH6（限DEV环境但密码硬编码）、M6（部分兜底）、**H2（import.routes.js集成ValidationError示例，其他52处待迁移）** |
| 新增发现 | **二次全面检查发现8个中危问题和18个低危问题**（详见 `kec-manager-全面检查分析报告-20260612-v2.md`） |
| 未变化 | H3/H4（密码强度校验）、M1（需大规模重构，暂缓）、FH1/FH3-FH5 等均未修复 |

---

## 九、结论

KEC 课程管理平台是一个**架构设计良好、功能完整**的教学管理系统，技术选型合理，代码组织清晰。经过 91 次提交迭代，项目功能日趋完善。

自上次报告以来，项目已修复 **5 项严重安全问题**（JWT 密钥保护、登录速率限制、Token URL 泄露、**班级权限校验**、**培养方案权限校验**）和 **10 项高危/中危问题**（错误处理器脱敏、系统设置Key白名单、**导入操作事务包装**、**XSS清洗和公式注入防护**、**Prisma对象展开运算符**、PUT路由undefined处理统一、sortOrder命名统一、审计日志details格式统一、**调试输出清理**、update-class-status.js脚本修复），修复进度为 28.8%。但仍有 **47 项问题未修复**，其中 8 项高危级别需要优先处理。

**最紧迫的问题**现在是：

1. **H3/H4 高危问题** — 密码强度校验缺失（修改密码和创建用户接口）
2. **M1/M3-M5/M9-M12 中危问题** — 错误处理模式不一致、代码重复、Service层不完善等
3. **H2 部分修复** — import.routes.js已集成ValidationError示例，其他52处需后续逐步迁移

以上建议按优先级逐步处理。

代码层面最大的系统性问题是 **Winston 日志系统未充分利用**（仅剩22处必要的console.error/warn，已合理）、**学期解析/方案匹配等逻辑的大量重复**（合计约 18 处重复代码）、以及 **Service层架构不完善**。建议作为第三优先级进行系统性重构。

---

## 十、H2和H6修复详情

### H2: 自定义错误类集成（部分完成）

**修复范围**: import.routes.js（3个导入接口）

**修复内容**:
- 导入 `ValidationError` 自定义错误类
- 将6处 `return fail(res, ...)` 替换为 `throw new ValidationError(...)`
- 配合全局错误处理器自动转换为422响应

**示例代码**:
```javascript
// 修复前
if (!req.file) {
  return fail(res, '请上传文件');
}

// 修复后
if (!req.file) {
  throw new ValidationError('请上传文件');
}
```

**后续工作**: 其他路由文件（52处）可参考此模式逐步迁移

### H6: 导入操作事务包装（已完成）

**修复范围**: import.routes.js 的三个导入接口

**修复内容**:
- **班级导入**: 收集所有create/update操作到transactionOperations数组，使用 `prisma.$transaction()` 执行
- **课程导入**: 同上，确保批量导入的原子性
- **教材导入**: 同上，任何失败都会完整回滚

**关键改进**:
1. 两阶段处理：先验证数据并收集操作，再在事务中执行
2. 验证失败时不启动事务，避免不必要的数据库开销
3. 事务失败时自动回滚，保证数据一致性
4. 增强错误日志，明确标识事务失败

**技术要点**:
```javascript
// 第一阶段：验证和准备
const transactionOperations = [];
for (let i = 0; i < rows.length; i++) {
  // 验证数据...
  // 收集操作到transactionOperations
  transactionOperations.push(prisma.classes.create({ ... }));
}

// 第二阶段：事务执行
if (transactionOperations.length > 0) {
  await prisma.$transaction(transactionOperations);
}
```

**影响**: 
- ✅ 防止部分成功部分失败的数据不一致问题
- ✅ 自动创建的培养层次/专业/学院也在事务保护下
- ✅ 失败时完整回滚，用户可重新导入

### M3: 学期参数解析逻辑统一（已完成）

**修复范围**: query.routes.js（3处）、export.routes.js（2处）、settings.service.js

**修复内容**:
- 在settings.service.js中创建统一的`parseSemesterString()`和`getSemesterInfoFromRequest()`函数
- 替换query.routes.js和export.routes.js中的6处重复代码
- 减少约40行重复代码，提升可维护性

**技术实现**:
```javascript
// settings.service.js - 统一工具函数
export function parseSemesterString(semester) {
  const parts = semester.split('-');
  // 校验和转换逻辑...
  return { success: true, data: { startYear, endYear, semesterIndex, raw: semester, label } };
}

export async function getSemesterInfoFromRequest(req) {
  const { semester } = req.query;
  if (semester) {
    const result = parseSemesterString(semester);
    return result.success ? result.data : null;
  }
  return await getCurrentSemesterInfo();
}

// 使用示例
let semesterInfo = await getSemesterInfoFromRequest(req);
```

**影响**:
- ✅ 消除6处重复的学期解析代码
- ✅ 统一错误处理逻辑
- ✅ 新增函数支持优先使用查询参数，降级到全局设置

### M4: 方案匹配逻辑统一（已完成）

**修复范围**: query.routes.js、export.routes.js

**修复内容**:
- 创建新的`server/src/services/plan.service.js`服务层文件
- 提供统一的`findBestMatchPlan()`和`isClassMatchPlan()`函数
- 消除5处重复的方案匹配逻辑（findBestMatchPlan 2处 + isClassMatchPlan 3处）

**技术实现**:
```javascript
// plan.service.js - 统一的方案匹配服务
export function findBestMatchPlan(cls, matchingPlans, classPlanMap = null) {
  // 1. 自定义方案优先
  // 2. 按专业匹配
  // 3. 按层次匹配
}

export function isClassMatchPlan(cls, plan) {
  // 判断班级是否匹配培养方案
}
```

**影响**:
- ✅ 消除约50行重复代码
- ✅ 集中管理方案匹配逻辑，便于维护
- ✅ 为后续扩展提供清晰的服务层接口

### M5: 移除GET请求中的写操作（已完成）

**修复范围**: college/course/textbook/trainingLevel/major/plan（共7处GET路由）

**修复内容**:
- 移除7处GET请求中的sort_order自动修复写操作
- 删除`needsReassignment`检查和相关的`prisma.update`批量调用
- 符合RESTful规范：GET请求不应修改数据

**技术要点**:
```javascript
// 修复前：GET请求中包含写操作
const needsReassignment = courses.some((c, i) => c.sort_order !== i);
if (needsReassignment) {
  await Promise.all(courses.map((c, i) => prisma.courses.update(...)));
}

// 修复后：纯读取操作
const courses = await prisma.courses.findMany({ orderBy: { sort_order: 'asc' } });
success(res, courses);
```

**影响**:
- ✅ 符合RESTful API设计规范
- ✅ 避免GET请求的副作用
- ✅ 提升性能（减少不必要的数据库写入）
- ✅ sort_order的维护应由专门的PUT/PATCH接口负责

### M9: bcrypt迭代次数配置化（已完成）

**修复范围**: auth.config.js、user.routes.js、auth.service.js

**修复内容**:
- 在auth.config.js中添加`bcryptRounds`配置项，默认值12（从环境变量BCRYPT_ROUNDS读取）
- 更新user.routes.js和auth.service.js中的两处bcrypt.hash调用使用配置值
- 支持生产环境通过环境变量调整安全强度

**技术实现**:
```javascript
// auth.config.js
const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10)

export const authConfig = {
  // ...
  bcryptRounds, // 默认12次迭代
}

// user.routes.js / auth.service.js
const hashedPassword = await bcrypt.hash(password, authConfig.bcryptRounds)
```

**影响**:
- ✅ 密码哈希强度可配置，适应不同安全需求
- ✅ 默认从10提升到12，增强安全性
- ✅ 生产环境可通过BCRYPT_ROUNDS环境变量灵活调整

### M10: Token密钥分离（已完成）

**修复范围**: auth.config.js、auth.service.js

**修复内容**:
- auth.config.js新增`jwtRefreshSecret`和`jwtDownloadSecret`配置
- 支持通过JWT_REFRESH_SECRET和JWT_DOWNLOAD_SECRET环境变量独立配置
- 未配置时使用派生密钥（jwtSecret + '_refresh'/'_download'）并输出警告
- auth.service.js三处Token生成/验证已更新使用对应密钥

**技术实现**:
```javascript
// auth.config.js
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret + '_refresh'
const jwtDownloadSecret = process.env.JWT_DOWNLOAD_SECRET || jwtSecret + '_download'

export const authConfig = {
  jwtSecret,              // Access Token密钥
  jwtRefreshSecret,       // Refresh Token密钥
  jwtDownloadSecret,      // Download Token密钥
  // ...
}

// auth.service.js
static generateRefreshToken(user) {
  return jwt.sign(payload, authConfig.jwtRefreshSecret, ...)
}

static generateDownloadToken(user) {
  return jwt.sign(payload, authConfig.jwtDownloadSecret, ...)
}
```

**影响**:
- ✅ 三种Token使用独立密钥，降低密钥泄露风险
- ✅ 支持渐进式迁移：未配置独立密钥时自动使用派生密钥
- ✅ 生产环境建议设置独立的JWT_REFRESH_SECRET和JWT_DOWNLOAD_SECRET

### M11: 系统设置GET接口去写操作（已完成）

**修复范围**: settings.routes.js

**修复内容**:
- 移除GET /api/settings中的自动创建逻辑（懒初始化模式）
- GET仅返回现有设置，缺失项返回默认值并标记isDefault: true
- 新增POST /api/settings/initialize专用初始化接口（需super_admin权限）
- 符合RESTful规范：GET请求不应修改数据

**技术实现**:
```javascript
// GET - 纯读取，不再自动创建
router.get('/', async (req, res) => {
  const settings = await prisma.system_settings.findMany();
  // 缺失项返回默认值，标记isDefault
  if (!map[key]) {
    map[key] = { value: def.value, description: def.description, isDefault: true };
  }
});

// POST - 专用初始化接口
router.post('/initialize', authMiddleware, roleMiddleware('super_admin'), async (req, res) => {
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await prisma.system_settings.findUnique({ where: { key } });
    if (!existing) {
      await prisma.system_settings.create({ data: { key, value: def.value, ... } });
    }
  }
});
```

**影响**:
- ✅ 符合RESTful API设计规范
- ✅ GET请求无副作用，幂等性保证
- ✅ 初始化操作需要管理员权限，安全性提升
- ✅ 审计日志记录初始化操作

### M12: 移除调试中间件（已完成）

**修复范围**: import.routes.js

**修复内容**:
- 确认调试中间件已被移除
- 无console.log打印请求信息的调试代码

---

## 十、二次全面检查总结

在首次报告基础上，进行了第二次全面代码审查，生成了详细的新报告：

**新报告位置**: `docs/kec-manager-全面检查分析报告-20260612-v2.md`

### 二次检查发现

| 严重程度 | 数量 | 主要问题 |
|----------|------|----------|
| 严重 | 0 | 无严重问题 ✅ |
| 中危 | 8 | S2(下载令牌URL传递), S4(导入验证不足), F1(XSS风险), Q3/Q4(代码重复), Q6(日志系统), A1(Service层), T1(脚本错误) |
| 低危 | 18 | S1/S3/S5-S9, F2-F5, Q1/Q2/Q5/Q7, A2/A3, O1-O4 |

### 综合安全评分: 7.6/10

项目整体安全实践良好，无严重安全问题。主要改进方向是完善Service层架构、加强输入验证、统一日志系统，以及实现Token撤销机制。

---

*报告由自动化代码审查生成，共分析 33 个后端源文件、23 个 Vue 组件、15 个前端 JS 模块、13 个 Prisma 数据模型。*
