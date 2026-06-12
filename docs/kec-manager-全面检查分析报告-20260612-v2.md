# KEC 课程管理平台 - 全面检查分析报告

**报告版本**: v2  
**检查日期**: 2026年06月12日  
**项目路径**: `C:\Users\80330\Documents\WEB\kec-manager`  
**检查范围**: 后端 (Express + Prisma) / 前端 (Vue 3 + Element Plus)  

---

## 执行摘要

本次检查对 kec-manager 项目进行了全面的安全、代码质量和架构评估。项目整体架构清晰，安全实践较为完善，但仍存在若干需要修复的问题。

### 已修复项（本次报告不再列为问题）

以下问题在之前的审计中已被识别并修复：

| 编号 | 问题描述 | 状态 |
|------|----------|------|
| C1 | JWT密钥硬编码 | 已修复 - 通过环境变量配置 |
| C2 | 密码强度验证缺失 | 已修复 - 添加 express-validator 规则 |
| C3 | SQL注入风险 | 已修复 - 使用 Prisma ORM 参数化查询 |
| C4 | XSS防护不足 | 已修复 - Vue自动转义，无 dangerouslySetInnerHTML |
| C5 | 错误信息泄露 | 已修复 - 生产环境隐藏堆栈和内部详情 |
| M2 | 路由权限校验不完整 | 已修复 - 所有管理路由均受 authMiddleware + roleMiddleware 保护 |
| M7 | sortOrder 命名不一致 | 已修复 - 统一为 snake_case (sort_order) |

---

## 一、后端安全检查

### 1.1 JWT认证和权限控制

#### 发现 S1-LOW: Refresh Token 类型未严格验证

**位置**: `server/src/services/auth.service.js:83-104`

```javascript
static async refreshToken(refreshTokenValue) {
  try {
    const decoded = jwt.verify(refreshTokenValue, authConfig.jwtSecret)

    if (decoded.type !== 'refresh') {  // 仅验证 type 字段
      throw new Error('无效的Token类型')
    }
    // ...
  }
}
```

**问题**: Refresh Token 验证时仅检查 `type` 字段，未验证用户是否仍然有效（如账号被禁用后，旧的 refresh token 仍可使用直到过期）。

**影响**: 低危 - 攻击者若获取到有效的 refresh token，可在用户被禁用后继续使用直到 token 过期（最长7天）。

**修复建议**:
```javascript
// 在 verify 之后增加额外的有效性检查
const user = await prisma.users.findUnique({ where: { id: decoded.id } })
if (!user || !user.is_active) {
  throw new Error('用户不存在或已被禁用')
}
// 可选：实现 token 黑名单机制
```

---

#### 发现 S2-MEDIUM: 下载令牌可通过 URL 参数传递

**位置**: `server/src/middleware/auth.middleware.js:11-22`

```javascript
else if (req.query.downloadToken) {
  const decoded = AuthService.verifyDownloadToken(req.query.downloadToken)
  if (decoded) {
    req.user = decoded
    return next()
  }
  // ...
}
```

**问题**: 下载令牌通过 URL 查询参数传递，可能被浏览器历史记录、服务器日志、Referer 头泄露。虽然令牌有效期仅60秒，但仍然存在一定的安全风险。

**影响**: 中危 - URL 中的 token 可能被记录在多个地方。

**修复建议**:
1. 进一步缩短下载令牌有效期至 15-30 秒
2. 考虑使用一次性令牌（使用后即刻失效）
3. 确保服务器日志不记录完整的 URL（特别是 query string）

---

### 1.2 速率限制

#### 发现 S3-LOW: 缺少全局速率限制

**位置**: `server/src/app.js`

**现状**: 仅在登录 (`/api/auth/login`)、刷新token (`/api/auth/refresh`)、修改密码 (`/api/auth/password`) 三个端点上应用了速率限制。

**问题**: 其他 API 端点（如数据查询、导出等）没有速率限制，可能遭受资源耗尽攻击。

**影响**: 低危 - 对于内部管理系统风险较低，但在公网部署时需注意。

**修复建议**:
```javascript
import rateLimit from 'express-rate-limit'

// 全局速率限制
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 120, // 每分钟最多120次请求
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/', globalLimiter)
```

---

### 1.3 输入验证

#### 发现 S4-MEDIUM: 导入功能缺乏文件大小和内容深度验证

**位置**: `server/src/routes/import.routes.js:11-21`

```javascript
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 .xlsx 或 .xls 文件'));
    }
  },
});
```

**问题**:
1. 仅通过文件扩展名验证，未检查 MIME type 或文件魔数（magic number）
2. 10MB 的限制对于 Excel 文件来说较大，可能被用于 DoS 攻击
3. 导入的 Excel 内容未进行充分的 sanitization

**影响**: 中危 - 恶意用户上传特制的 Excel 文件可能导致服务器资源耗尽或公式注入攻击。

**修复建议**:
```javascript
// 1. 验证 MIME type
fileFilter: (req, file, cb) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel' // .xls
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'), false);
  }
}

// 2. 降低文件大小限制
limits: { fileSize: 5 * 1024 * 1024 } // 5MB

// 3. 在 readWorkbook 后对单元格内容进行 sanitization
function sanitizeCellValue(value) {
  if (typeof value === 'string') {
    // 防止公式注入：如果以 =、+、-、@ 开头则添加前缀
    if (/^[=+\-@]/.test(value.trim())) {
      return "'" + value; // 添加单引号前缀使其成为纯文本
    }
  }
  return value;
}
```

---

#### 发现 S5-LOW: 部分路由缺少输入长度限制

**位置**: 多处路由文件

**问题**: 某些字符串字段（如 `description`、`email`、`real_name`）在创建/更新时没有明确的长度限制验证。

**示例**: `server/src/routes/user.routes.js:50-115` - 创建用户时 `real_name` 和 `email` 没有长度验证。

**修复建议**: 在所有 express-validator 规则中添加 `.isLength({ max: N })` 限制。

---

### 1.4 SQL注入/XSS防护

#### 状态: 良好

- **SQL注入**: 项目使用 Prisma ORM，所有数据库操作均为参数化查询，未发现原始 SQL 拼接。唯一使用 `$queryRaw` 的地方是健康检查 (`SELECT 1`)，无注入风险。
- **XSS**: 后端返回 JSON 数据，不直接渲染 HTML。前端 Vue 框架默认对插值进行转义。

---

### 1.5 错误处理和信息泄露

#### 发现 S6-LOW: 开发环境堆栈追踪可能暴露敏感信息

**位置**: `server/src/middleware/error.js:59`

```javascript
res.status(status).json({
  success: false,
  message: isProduction ? getSafeMessage(err) : (err.message || '服务器内部错误'),
  ...(isProduction ? {} : { stack: err.stack }),  // 非生产环境返回堆栈
});
```

**问题**: 在非 `production` 环境下返回完整堆栈追踪。如果 `NODE_ENV` 未正确设置为 `production`，可能泄露内部实现细节。

**影响**: 低危 - 仅在开发/测试环境生效，但需确保生产环境正确设置 `NODE_ENV=production`。

**修复建议**:
1. 在 `.env.example` 中明确标注 `NODE_ENV=production`
2. 添加启动时的环境检查警告

---

#### 发现 S7-LOW: CORS 配置中允许 credentials

**位置**: `server/src/app.js:29-42`

```javascript
app.use(cors({
  origin: function (origin, callback) {
    // ...
  },
  credentials: true  // 允许携带凭证
}));
```

**问题**: `credentials: true` 与动态 origin 函数配合使用时，浏览器要求 origin 不能是通配符 `*`。当前实现正确使用了白名单，但需确保 `CORS_ORIGINS` 环境变量在生产环境中不包含不可信的源。

**影响**: 低危 - 当前实现是正确的，只需注意配置管理。

---

### 1.6 密码安全

#### 状态: 良好

- 使用 `bcryptjs` 进行密码哈希，salt rounds 为 10（合理）
- 密码修改接口有速率限制（5次/15分钟）
- 新密码有最小长度要求（8位）和复杂度要求（大小写+数字+特殊字符）

#### 发现 S8-LOW: bcrypt rounds 可配置化

**位置**: `server/src/services/auth.service.js:176`

```javascript
const hashedPassword = await bcrypt.hash(newPassword, 10)
```

**建议**: 将 bcrypt rounds 提取为环境变量配置，以便根据服务器性能调整。

```javascript
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10)
```

---

### 1.7 Token管理

#### 发现 S9-MEDIUM: Token 未实现黑名单/撤销机制

**位置**: `server/src/services/auth.service.js`

**问题**: 
1. 用户登出时，access token 仍然有效直到自然过期（24小时）
2. 修改密码后，旧的 access token 和 refresh token 仍然有效
3. 用户被禁用后，已有的 token 仍然有效直到过期

**影响**: 中危 - 在用户登出、改密或被禁用后，旧 token 仍可被使用。

**修复建议**:
1. 实现基于 Redis 或数据库的 token 黑名单
2. 在 `authMiddleware` 中检查 token 是否在黑名单中
3. 用户登出/改密/被禁用时将对应 token 加入黑名单

简化方案（无需 Redis）:
```javascript
// 在 users 表中添加 last_token_invalidated_at 字段
// 在 authMiddleware 中验证:
if (decoded.iat < user.last_token_invalidated_at) {
  return res.status(401).json({ message: 'Token已失效' })
}
```

---

## 二、前端安全检查

### 2.1 XSS风险

#### 发现 F1-MEDIUM: dangerouslyUseHTMLString 使用不当

**位置**: `client/src/views/class/ClassList.vue:899-907`

```javascript
ElMessageBox.alert(
  `<div style="max-height: 400px; overflow-y: auto; text-align: left;">${errorListHtml}</div>`,
  `导入失败详情（共${errors.length}条）`,
  {
    dangerouslyUseHTMLString: true,
    // ...
  }
)
```

**问题**: `errorListHtml` 是由导入错误消息拼接而成的 HTML 字符串。虽然错误消息来自服务器响应，但如果服务器返回的内容包含恶意脚本（例如通过导入功能注入），可能导致 XSS。

当前构建方式:
```javascript
const errorListHtml = errors.map((error, index) =>
  `<div class="error-item">
    <strong style="color: #f56c6c;">${index + 1}.</strong> ${error}
  </div>`
).join('')
```

`${error}` 未进行 HTML 转义。

**影响**: 中危 - 如果攻击者能够控制导入错误消息的内容，可能注入恶意脚本。

**修复建议**:
```javascript
// 方法1: 对错误消息进行 HTML 转义
function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

const errorListHtml = errors.map((error, index) =>
  `<div class="error-item">
    <strong style="color: #f56c6c;">${index + 1}.</strong> ${escapeHtml(error)}
  </div>`
).join('')

// 方法2（推荐）: 使用 Vue 组件代替 HTML 字符串
// 将错误列表作为数组传递给子组件，由 Vue 负责渲染
```

---

### 2.2 Token传递方式

#### 状态: 良好

- Token 存储在 `localStorage` 中（标准做法）
- 通过 Axios 请求拦截器自动添加到 `Authorization` 头
- 有 Token 刷新机制

#### 发现 F2-LOW: localStorage 易受 XSS 攻击

**位置**: `client/src/stores/auth.js:7-8`

```javascript
const token = ref(localStorage.getItem('token') || '')
const refreshToken = ref(localStorage.getItem('refreshToken') || '')
```

**问题**: `localStorage` 中的 token 可以被页面中的任何 JavaScript 代码访问。如果页面存在 XSS 漏洞，攻击者可以窃取 token。

**影响**: 低危 - 这是 SPA 应用的常见权衡。HttpOnly Cookie 更安全但实现复杂。

**修复建议**: 
1. 确保无 XSS 漏洞（见 F1 修复）
2. 考虑使用 `sessionStorage` 代替 `localStorage`（关闭标签后自动清除）
3. 长期改进：迁移到 HttpOnly Cookie + CSRF Token 方案

---

### 2.3 敏感信息暴露

#### 发现 F3-LOW: 开发环境显示测试账号

**位置**: `client/src/views/Login.vue:64-78`

```vue
<div v-if="showTestAccounts" class="account-hint">
  <!-- 显示 admin/admin@123456 -->
</div>
```

```javascript
const showTestAccounts = import.meta.env.DEV
```

**问题**: 测试账号仅在 `DEV` 模式下显示，这是正确的。但需确保构建生产版本时 `import.meta.env.DEV` 为 `false`。

**影响**: 低危 - 当前实现正确，只需注意不要将测试账号硬编码到生产代码中。

---

#### 发现 F4-LOW: 控制台可能输出敏感信息

**位置**: 多处前端代码使用 `console.error`、`console.log`

**问题**: 生产环境中，`console` 输出可能暴露调试信息。

**修复建议**: 在生产构建时移除 console 语句，或使用条件输出:
```javascript
if (import.meta.env.DEV) {
  console.log('Debug info:', data)
}
```

---

### 2.4 API调用安全性

#### 状态: 良好

- 所有 API 请求通过统一的 `request.js` 拦截器
- 自动携带 Authorization 头
- 有完善的错误处理和 Token 刷新逻辑

#### 发现 F5-LOW: 并发请求的 Token 刷新竞态条件

**位置**: `client/src/utils/request.js:29-84`

```javascript
let isRefreshing = false
let failedQueue = []

// ...
if (isRefreshing) {
  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject })
  })
    .then(token => { /* ... */ })
}

isRefreshing = true
const refreshed = await authStore.refreshAccessToken()
isRefreshing = false
```

**问题**: 如果 `refreshAccessToken()` 抛出异常，`isRefreshing` 可能不会被重置为 `false`，导致后续请求永久阻塞。

**修复建议**:
```javascript
try {
  const refreshed = await authStore.refreshAccessToken()
  isRefreshing = false
  if (refreshed) {
    processQueue(null, authStore.token)
    // ...
  } else {
    processQueue(error, null)
    // ...
  }
} catch (refreshError) {
  isRefreshing = false
  processQueue(refreshError, null)
  throw refreshError
}
```

---

## 三、代码质量检查

### 3.1 死代码/未使用代码

#### 发现 Q1-LOW: 未使用的工具函数

**位置**: `server/src/utils/naming.js:68-94`

```javascript
export function shallowSnakeToCamel(obj) { /* ... */ }
export function shallowCamelToSnake(obj) { /* ... */ }
```

**问题**: `shallowSnakeToCamel` 和 `shallowCamelToSnake` 两个函数在整个项目中未被引用。

**修复建议**: 如果确实不需要，删除这些函数以减少维护负担。如果需要保留供未来使用，添加 JSDoc 注释说明用途。

---

#### 发现 Q2-LOW: 未使用的 paginate 函数

**位置**: `server/src/utils/response.js:5-16`

```javascript
export function paginate(res, data, total, page, pageSize) {
  return res.json({
    success: true,
    data: { list: data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}
```

**问题**: `paginate` 函数在整个项目中未被调用。当前的分页响应格式是直接在路由中构造的。

**修复建议**: 要么统一使用此函数，要么删除它。建议统一使用以提高一致性。

---

### 3.2 代码重复

#### 发现 Q3-MEDIUM: 培养方案匹配逻辑重复

**位置**: 多处文件中存在相同的 `findBestMatchPlan` / `isClassMatchPlan` 逻辑

**重复位置**:
- `server/src/routes/export.routes.js:180-203`
- `server/src/routes/query.routes.js:138-160`
- `server/src/routes/export.routes.js:556-567`
- `server/src/routes/query.routes.js:282-293`
- `server/src/routes/query.routes.js:395-406`

**问题**: 相同的班级-培养方案匹配逻辑在多个文件中重复出现，违反了 DRY 原则。

**修复建议**: 将此逻辑提取到 Service 层:
```javascript
// server/src/services/plan.service.js
export function findBestMatchPlan(cls, matchingPlans, classPlanMap) {
  if (cls.custom_plan_id) {
    return classPlanMap?.get(cls.id) || cls.training_plans;
  }
  for (const plan of matchingPlans) {
    if (plan.major_id && plan.major_id === cls.major_id) return plan;
    if (plan.training_level_id && plan.training_level_id === cls.training_level_id) return plan;
  }
  return null;
}

export function isClassMatchPlan(cls, plan) {
  if (cls.custom_plan_id === plan.id) return true;
  if (!cls.custom_plan_id && cls.major_id === plan.major_id) return true;
  if (!cls.custom_plan_id && cls.training_level_id === plan.training_level_id) return true;
  return false;
}
```

---

#### 发现 Q4-MEDIUM: 学期导出逻辑重复

**位置**: `server/src/routes/export.routes.js` 和 `server/src/routes/query.routes.js`

**问题**: 两个文件中都有几乎相同的学期参数解析和 `semesterInfo` 构建逻辑。

**修复建议**: 提取为共享的工具函数:
```javascript
// server/src/utils/semester.js
export function parseSemesterParam(semester) {
  if (!semester) return null;
  const parts = semester.split('-');
  const startYear = Number(parts[0]);
  const endYear = Number(parts[1]);
  const semesterIndex = Number(parts[2]);
  
  if (isNaN(startYear) || isNaN(endYear) || isNaN(semesterIndex)) {
    throw new ValidationError('学期格式错误，应为 YYYY-YYYY-N');
  }
  
  const season = semesterIndex === 1 ? '秋季' : '春季';
  const displayYear = semesterIndex === 1 ? startYear : endYear;
  const label = `${displayYear}年${season}(第${semesterIndex}学期)`;
  
  return { startYear, endYear, semesterIndex, raw: semester, label };
}
```

---

### 3.3 命名一致性

#### 状态: 良好（已修复 M7）

- 数据库字段统一使用 `snake_case`
- 前端接收的数据统一转换为 `camelCase`
- 中间件 `convertRequestNaming` / `convertResponseNaming` 自动处理转换

---

### 3.4 错误处理一致性

#### 发现 Q5-LOW: 错误处理方式不统一

**问题**: 项目中混合使用了多种错误处理方式:
1. 部分路由使用 `try/catch + next(error)` 模式
2. 部分路由直接 `return fail(res, message)` 
3. 部分路由抛出自定义错误类（`NotFoundError` 等）

**示例对比**:
```javascript
// 方式1: 使用 next()
router.get('/', async (req, res, next) => {
  try { /* ... */ } catch (e) { next(e); }
});

// 方式2: 直接返回
router.get('/:id', async (req, res) => {
  const plan = await prisma.training_plans.findUnique(...);
  if (!plan) return fail(res, '培养方案不存在', 404);
});
```

**修复建议**: 统一使用 `try/catch + next(error)` 模式，让 `errorHandler` 中间件统一处理。

---

### 3.5 日志系统使用情况

#### 发现 Q6-MEDIUM: 日志系统未充分利用

**位置**: `server/src/config/logger.js`

**现状**: 
- 项目配置了 Winston 日志系统，有 `error.log`、`combined.log`、`audit.log` 三个文件
- 但大部分代码仍使用 `console.log`、`console.error`、`console.warn`

**使用 console 的位置**:
- `server/src/lib/prisma.js:14,18`
- `server/src/config/auth.config.js:12-22`
- `server/src/server.js:8,12`
- `server/src/app.js:37`
- `server/src/middleware/auth.middleware.js:54`
- `server/src/middleware/error.js:44,53`
- `server/src/services/audit.service.js:28`
- `server/src/services/settings.service.js:10,19`
- `server/src/routes/import.routes.js:229,274,345,461`

**问题**: Winston logger 已配置但未在业务代码中使用，导致日志分散在 console 和 Winston 两个系统中。

**修复建议**:
1. 在所有业务代码中将 `console.*` 替换为 `logger.*`
2. 创建便捷的日志包装器:
```javascript
// server/src/utils/logger.js
import logger from '../config/logger.js';

export const log = {
  info: (msg, meta) => logger.info(msg, meta),
  warn: (msg, meta) => logger.warn(msg, meta),
  error: (msg, meta) => logger.error(msg, meta),
  debug: (msg, meta) => logger.debug(msg, meta),
};
```

---

### 3.6 审计日志完整性

#### 状态: 良好

- 登录/登出、用户 CRUD、班级 CRUD、培养方案 CRUD、导入/导出、系统设置变更等操作均有审计日志
- 审计日志记录操作人 IP、操作详情、结果状态

#### 发现 Q7-LOW: 部分操作缺少审计日志

**缺失审计的操作**:
1. 教材关联/取消关联 (`/api/plans/semesters/:id/textbooks`)
2. 培养方案课程排序更新
3. 学期安排更新

**修复建议**: 在这些操作中添加 `createAuditLog` 调用。

---

## 四、架构评估

### 4.1 路由权限校验完整性

#### 状态: 良好

| 路由前缀 | 认证要求 | 角色要求 | 状态 |
|----------|----------|----------|------|
| `/api/auth/*` | 公开 | 无 | 正确 |
| `/api/health` | 公开 | 无 | 正确 |
| `/api/settings GET` | 公开 | 无 | 正确（登录页需要） |
| `/api/settings PUT/POST` | 需要 | super_admin | 正确 |
| `/api/query/*` | 需要 | 任意登录用户 | 正确 |
| `/api/export/*` | 需要 | 任意登录用户 | 正确 |
| `/api/users/*` | 需要 | admin, super_admin | 正确 |
| `/api/import/*` | 需要 | admin, super_admin | 正确 |
| `/api/audit/*` | 需要 | super_admin | 正确 |
| `/api/majors, /api/colleges, etc.` | 需要 | GET: 任意；POST/PUT/DELETE: admin 在路由内控制 | 正确 |

**备注**: 基础数据管理路由（majors, colleges, courses, textbooks, classes, plans, training-levels）在 `app.js` 中只应用了 `authMiddleware`，具体的写操作权限在各路由文件内部通过 `roleMiddleware` 控制。这种设计是合理的。

---

### 4.2 Service层使用情况

#### 发现 A1-MEDIUM: Service 层不够完善

**现状**:
- 已有 Service: `auth.service.js`, `audit.service.js`, `settings.service.js`, `class.service.js`
- 缺失 Service: 用户管理、班级管理（CRUD）、培养方案管理、导入/导出等业务逻辑直接在路由中实现

**问题**: 
1. 路由文件过于臃肿（如 `plan.routes.js` 有 831 行，`export.routes.js` 有 647 行）
2. 业务逻辑与 HTTP 层耦合，难以单元测试
3. 代码重复（见 Q3）

**修复建议**:
逐步将业务逻辑抽取到 Service 层:
```
server/src/services/
  ├── auth.service.js        (已有)
  ├── audit.service.js       (已有)
  ├── settings.service.js    (已有)
  ├── class.service.js       (已有，仅 getActiveClassFilter)
  ├── user.service.js        (新建)
  ├── plan.service.js        (新建)
  ├── import.service.js      (新建)
  ├── export.service.js      (新建)
  ├── course.service.js      (新建)
  ├── textbook.service.js    (新建)
  └── major.service.js       (新建)
```

---

### 4.3 中间件设计

#### 状态: 良好

| 中间件 | 功能 | 位置 |
|--------|------|------|
| `authMiddleware` | JWT 验证 | `middleware/auth.middleware.js` |
| `roleMiddleware` | 角色权限检查 | `middleware/auth.middleware.js` |
| `convertRequestNaming` | 请求体 camelCase -> snake_case | `middleware/naming.middleware.js` |
| `convertResponseNaming` | 响应体 snake_case -> camelCase | `middleware/naming.middleware.js` |
| `validatePagination` | 分页参数验证 | `middleware/pagination.js` |
| `handleValidationErrors` | express-validator 结果处理 | `middleware/validation.js` |
| `errorHandler` | 统一错误处理 | `middleware/error.js` |

**发现 A2-LOW: 缺少请求日志中间件**

**问题**: 没有记录每个请求的中间件，不利于问题排查和审计。

**修复建议**:
```javascript
// middleware/requestLogger.js
import logger from '../config/logger.js';

export function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('User-Agent'),
    });
  });
  
  next();
}
```

---

### 4.4 数据验证

#### 状态: 良好

- 使用 `express-validator` 进行输入验证
- 验证规则集中在 `middleware/validation.js`
- 覆盖主要实体：班级、用户、专业、课程、教材

#### 发现 A3-LOW: 部分路由未使用验证中间件

**问题**: 很多 POST/PUT 路由直接在 handler 中进行手动验证，而非使用 `express-validator`。

**示例**: `server/src/routes/class.routes.js:285-341`
```javascript
router.post('/', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { name, enrollment_year, duration_years, ... } = req.body;
    if (!name || !enrollment_year || !duration_years || !training_level_id) {
      throw new ValidationError('班级名称、入学年份、学制、培养层次为必填项');
    }
    // ...
  }
});
```

**修复建议**: 为所有 POST/PUT 路由添加对应的 validator 中间件:
```javascript
import { validateClass } from '../middleware/validation.js';

router.post('/', roleMiddleware('admin', 'super_admin'), validateClass, async (req, res, next) => {
  // 此时 req.body 已经过验证
});
```

---

## 五、脚本和工具检查

### 5.1 更新脚本

#### 发现 T1-MEDIUM: update-class-status.js 使用错误的模型名称

**位置**: `server/scripts/update-class-status.js`

```javascript
const allClasses = await prisma.class.findMany({  // 错误：应该是 classes
  select: {
    id: true,
    name: true,
    enrollmentYear: true,   // 错误：应该是 enrollment_year
    durationYears: true,    // 错误：应该是 duration_years
    status: true,
  },
});

await prisma.class.update({  // 错误：应该是 classes
  where: { id: cls.id },
  data: { status: expectedStatus },
});
```

**问题**: 
1. Prisma 模型名称应为 `classes`（复数），而非 `class`
2. 字段名应为 `snake_case`（`enrollment_year`, `duration_years`），而非 `camelCase`

**影响**: 该脚本无法正常运行。

**修复建议**:
```javascript
const allClasses = await prisma.classes.findMany({
  select: {
    id: true,
    name: true,
    enrollment_year: true,
    duration_years: true,
    status: true,
  },
});

for (const cls of allClasses) {
  const grade = semesterInfo.startYear - cls.enrollment_year + 1;
  const expectedStatus = grade <= cls.duration_years ? 'active' : 'graduated';
  
  if (cls.status !== expectedStatus) {
    await prisma.classes.update({
      where: { id: cls.id },
      data: { status: expectedStatus },
    });
  }
}
```

**注意**: 实际上，班级状态现在是动态计算的（在 `class.routes.js` 的 `calculateClassStatus` 函数中），不再依赖数据库中的 `status` 字段。此脚本可能已过时，建议删除或更新注释说明。

---

### 5.2 工具函数

#### 状态: 良好

- `naming.js`: 驼峰/下划线转换工具完善
- `excel.js`: Excel 读写工具完善，有单元格值规范化处理
- `response.js`: 统一响应格式工具
- `error.js`: 自定义错误类完善

#### 发现 T2-LOW: excel.js 中 normalizeCellValue 可增强

**位置**: `server/src/utils/excel.js:30-59`

**建议**: 增加对富文本、超链接等 Excel 特殊内容的处理:
```javascript
function normalizeCellValue(value) {
  // ... 现有逻辑
  
  // 处理 RichText
  if (value?.richText) {
    return value.richText.map(rt => rt.text || '').join('');
  }
  
  // 处理 Hyperlink
  if (value?.hyperlink) {
    return value.hyperlink;
  }
  
  // ...
}
```

---

## 六、其他发现

### 6.1 数据库相关

#### 发现 O1-LOW: SQLite 不适合生产环境

**位置**: `server/prisma/schema.prisma:6`

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

**问题**: SQLite 是文件型数据库，不支持并发写入，不适合多用户同时访问的生产环境。

**修复建议**: 迁移到 MySQL 或 PostgreSQL:
```prisma
datasource db {
  provider = "mysql"  // 或 "postgresql"
  url      = env("DATABASE_URL")
}
```

```env
# .env
DATABASE_URL="mysql://user:password@localhost:3306/kec_course_platform"
```

---

#### 发现 O2-LOW: schema 中有待完善的字段注释

**位置**: `server/prisma/schema.prisma:133-147`

```prisma
model plan_textbooks {
  // updated_at 字段需要在下次系统重置时添加
  // updated_at            DateTime              @updatedAt
}

model system_settings {
  // 注意：created_at 和 updated_at 字段需要在下次系统重置时添加
  // created_at  DateTime @default(now())
  // updated_at  DateTime @updatedAt
}
```

**问题**: 这些注释表明数据结构尚未完全定型。

**修复建议**: 在下次系统重置时取消注释并运行 migration。

---

### 6.2 配置文件

#### 发现 O3-MEDIUM: .env 文件包含真实密钥

**位置**: `server/.env:3`

```env
JWT_SECRET=3438c076ef5f6b364f316923f661999f80e42556b46d1fe455231960be1683e52751b575df10e78cde1f61fd6b9cba9011a2508b5100b43b90816351ee3ef675
```

**问题**: `.env` 文件包含真实的 JWT 密钥。虽然 `.gitignore` 已排除 `.env`，但需确保：
1. `.env` 从未被提交到 Git
2. 不同环境使用不同的密钥
3. 密钥定期轮换

**修复建议**:
1. 确认 `.gitignore` 包含 `.env`
2. 在团队文档中说明密钥管理规范
3. 考虑使用密钥管理服务（如 HashiCorp Vault）

---

### 6.3 空文件

#### 发现 O4-LOW: 存在空文件 nul

**位置**: `C:\Users\80330\Documents\WEB\kec-manager\nul`

**问题**: 项目根目录存在一个名为 `nul` 的空文件（可能是 Windows 下的误创建）。

**修复建议**: 删除该文件。

```bash
rm nul
```

---

## 七、问题汇总

### 按严重程度分类

| 严重程度 | 数量 | 问题编号 |
|----------|------|----------|
| 严重 | 0 | 无 |
| 中危 | 8 | S2, S4, F1, Q3, Q4, Q6, A1, T1 |
| 低危 | 18 | S1, S3, S5, S6, S7, S8, S9, F2, F3, F4, F5, Q1, Q2, Q5, Q7, A2, A3, O1-O4 |

### 优先级修复建议

#### 第一优先级（中危，建议尽快修复）

1. **S2**: 下载令牌 URL 参数传递风险 - 缩短有效期或实现一次性令牌
2. **S4**: 导入功能文件验证不足 - 添加 MIME type 检查和公式注入防护
3. **F1**: dangerouslyUseHTMLString XSS 风险 - 对错误消息进行 HTML 转义
4. **Q3/Q4**: 代码重复 - 提取共享逻辑到 Service 层
5. **Q6**: 日志系统未充分利用 - 统一使用 Winston logger
6. **A1**: Service 层不完善 - 逐步抽取业务逻辑
7. **T1**: 更新脚本错误 - 修复模型和字段名称

#### 第二优先级（低危，建议计划内修复）

1. **S9**: Token 黑名单机制 - 实现 token 撤销功能
2. **S1**: Refresh Token 验证增强
3. **S3**: 全局速率限制
4. **F5**: Token 刷新竞态条件修复
5. **Q5**: 错误处理方式统一
6. **A2**: 添加请求日志中间件
7. **O1**: 数据库迁移到 MySQL/PostgreSQL
8. **O3**: .env 密钥管理规范

---

## 八、总体评价

### 优点

1. **安全实践良好**: JWT 密钥通过环境变量配置，密码使用 bcrypt 哈希，有速率限制保护
2. **权限控制完善**: 基于角色的访问控制（RBAC）实现完整，所有管理路由均有权限校验
3. **ORM 使用正确**: Prisma 参数化查询杜绝了 SQL 注入风险
4. **审计日志完整**: 关键操作均有审计日志记录
5. **命名规范统一**: 前后端命名转换中间件设计优雅
6. **错误处理友好**: 生产环境隐藏内部错误详情

### 需要改进的方面

1. **Service 层架构**: 业务逻辑过多地放在路由层，需要抽取到 Service 层
2. **代码复用**: 多处存在重复逻辑，需要提取共享函数
3. **日志系统**: Winston 已配置但未充分利用
4. **Token 管理**: 缺少 token 撤销/黑名单机制
5. **数据库选型**: SQLite 不适合生产环境的并发场景

### 安全评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 认证授权 | 8/10 | JWT + RBAC 实现完善，缺少 token 撤销 |
| 输入验证 | 7/10 | express-validator 使用良好，导入功能需加强 |
| 数据安全 | 8/10 | Prisma 防 SQL 注入，密码哈希正确 |
| 错误处理 | 8/10 | 生产环境隐藏详情，但需确保 NODE_ENV 正确设置 |
| 日志审计 | 7/10 | 审计日志完整，但应用日志未充分利用 Winston |
| **综合评分** | **7.6/10** | **良好，有改进空间** |

---

**报告生成时间**: 2026年06月12日  
**下次审查建议**: 修复第一优先级问题后重新评估
