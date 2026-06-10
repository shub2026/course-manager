# KEC课程管理平台 - 代码优化报告

生成时间：2026-06-10  
项目路径：`c:/Users/YANG/Documents/kec-manager`

---

## 目录

- [一、安全性问题（高优先级）](#一安全性问题高优先级)
- [二、代码质量问题（中优先级）](#二代码质量问题中优先级)
- [三、性能优化（中优先级）](#三性能优化中优先级)
- [四、可维护性问题（低优先级）](#四可维护性问题低优先级)
- [五、优先级总结](#五优先级总结)
- [六、推荐实施顺序](#六推荐实施顺序)

---

## 一、安全性问题（高优先级）

### 1. JWT密钥硬编码

**位置**: `server/src/config/auth.config.js:2`

**问题**: 
```javascript
jwtSecret: process.env.JWT_SECRET || 'kec-course-management-secret-key-2026'
```

**风险**: 生产环境使用默认密钥，容易被攻击者利用

**建议**: 
- 移除默认值，强制要求配置环境变量
- 在 `.env` 文件中添加强随机密钥
- 添加启动时检查，如果未配置JWT_SECRET则拒绝启动

**修复示例**:
```javascript
// server/src/config/auth.config.js
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('ERROR: JWT_SECRET environment variable is required');
  process.exit(1);
}

export const authConfig = {
  jwtSecret,
  jwtExpiresIn: '24h',
  jwtRefreshExpiresIn: '7d'
}
```

---

### 2. 密码策略薄弱

**位置**: `server/src/routes/auth.routes.js:86`

**问题**: 仅要求8位长度，无复杂度要求

**建议**: 
```javascript
// 增强密码验证
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[a-zA-Z\d@$!%*?&]{8,}$/;
if (!passwordRegex.test(newPassword)) {
  return fail(res, '密码必须包含大小写字母、数字和特殊字符');
}
```

---

### 3. 缺少速率限制

**位置**: `server/src/app.js`

**问题**: 登录接口无限次尝试，存在暴力破解风险

**建议**: 
```bash
npm install express-rate-limit
```

```javascript
// server/src/app.js
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次
  message: '登录尝试次数过多，请稍后再试'
});

app.use('/api/auth/login', loginLimiter);
```

---

### 4. SQL注入防护（潜在风险）

**位置**: 多处路由文件

**问题**: 虽然Prisma提供了参数化查询保护，但用户输入验证不足

**建议**: 添加输入验证中间件（如 `express-validator`）

---

## 二、代码质量问题（中优先级）

### 5. 重复的审计日志代码

**位置**: 所有路由文件

**问题**: 每个路由都手动编写审计日志代码，违反DRY原则

**当前代码**:
```javascript
await createAuditLog({
  action: 'create',
  module: 'major',
  userId: req.user?.id,
  ip: req.ip,
  details: { id: major.id, name },
  result: 'success',
  message: `创建专业：${name}`
});
```

**建议**: 创建审计日志中间件或装饰器
```javascript
// middleware/audit.js
export function auditLog(action, module, getMessage) {
  return async (req, res, next) => {
    const originalSend = res.send;
    res.send = async function(data) {
      const parsed = JSON.parse(data);
      await createAuditLog({
        action,
        module,
        userId: req.user?.id,
        ip: req.ip,
        details: parsed.data,
        result: parsed.success ? 'success' : 'failed',
        message: getMessage(req, parsed)
      });
      originalSend.call(this, data);
    };
    next();
  };
}
```

---

### 6. 不一致的错误处理

**位置**: 多个路由文件

**问题**: 
- 有些用 `try-catch + next(e)`
- 有些直接返回错误
- 错误信息格式不统一

**建议**: 统一错误处理方式
```javascript
// utils/error.js
export class AppError extends Error {
  constructor(message, statusCode = 400, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

// 使用示例
throw new AppError('班级不存在', 404, 'CLASS_NOT_FOUND');
```

---

### 7. 缺少输入验证

**位置**: `server/src/routes/class.routes.js:194`

**问题**: 
```javascript
const { name, enrollmentYear, durationYears, ... } = req.body;
// 直接使用，没有验证类型和范围
```

**建议**: 
```javascript
import { body, validationResult } from 'express-validator';

router.post('/', [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('enrollmentYear').isInt({ min: 2000, max: 2100 }),
  body('durationYears').isInt({ min: 1, max: 10 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return fail(res, errors.array()[0].msg);
  }
  // ...
});
```

---

### 8. 魔法数字和字符串

**位置**: 多处代码

**问题**: 
```javascript
return grade <= durationYears ? 'active' : 'graduated';
const skip = (page - 1) * pageSize;
```

**建议**: 定义常量
```javascript
// constants/index.js
export const CLASS_STATUS = {
  ACTIVE: 'active',
  GRADUATED: 'graduated'
};

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};
```

---

## 三、性能优化（中优先级）

### 9. N+1查询问题

**位置**: `server/src/routes/class.routes.js:175`

**问题**: 
```javascript
const classes = await prisma.classes.findMany({
  include: {
    majors: true,
    colleges: true,
    training_levels: true,
    training_plans: true,
  }
});
```

**建议**: 确保使用 `include` 而非多次单独查询（当前代码已正确使用Prisma的关系加载）

---

### 10. 缺少数据库索引

**位置**: `server/prisma/schema.prisma`

**问题**: 部分常用查询字段缺少索引

**建议**:
```prisma
model classes {
  // ...
  @@index([status])
  @@index([enrollment_year])
  @@index([major_id, status])
  @@index([training_level_id])
}
```

---

### 11. 前端API调用未做防抖

**位置**: `client/src/views/Dashboard.vue:59`

**问题**: 页面加载时同时发起5个并行请求

**建议**: 
```javascript
// 添加缓存
import { ref } from 'vue'
const cache = new Map()

export async function getWithCache(apiCall, key, ttl = 60000) {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data
  }
  const data = await apiCall()
  cache.set(key, { data, timestamp: Date.now() })
  return data
}
```

---

### 12. 前端组件过大

**位置**: `client/src/components/Layout.vue` (354行)

**问题**: 布局组件包含了修改密码的逻辑，应该拆分

**建议**: 
```vue
<!-- Layout.vue -->
<template>
  <!-- ... -->
  <ChangePasswordDialog v-model="passwordDialogVisible" />
</template>

<script setup>
import ChangePasswordDialog from './ChangePasswordDialog.vue'
</script>
```

---

## 四、可维护性问题（低优先级）

### 13. 缺少API文档

**问题**: 没有Swagger/OpenAPI文档

**建议**: 
```bash
npm install swagger-jsdoc swagger-ui-express
```

---

### 14. 缺少单元测试

**问题**: 项目中没有任何测试文件

**建议**: 至少为核心功能添加测试
```javascript
// tests/auth.test.js
import { describe, it, expect } from 'vitest'

describe('Auth API', () => {
  it('should login with valid credentials', async () => {
    // ...
  })
})
```

---

### 15. 日志记录不规范

**位置**: 多处代码

**问题**: 
```javascript
console.log('[班级导入] 请求收到:', ...)
console.error(err.message)
```

**建议**: 使用专业日志库
```bash
npm install winston
```

```javascript
// config/logger.js
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
})
```

---

### 16. 前端路由守卫中的全局变量

**位置**: `client/src/router/index.js:15`

**问题**: 
```javascript
const authStore = window.__authStoreForRedirect
```

**建议**: 使用Pinia的storeToRefs或改进初始化逻辑

---

### 17. 数据库连接池配置缺失

**位置**: `server/src/lib/prisma.js`

**问题**: 使用默认Prisma Client配置

**建议**: 
```javascript
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
})
```

---

### 18. 缺少健康检查详细信息

**位置**: `server/src/app.js:34`

**当前**: 仅返回状态和时间戳

**建议**: 
```javascript
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime()
    })
  } catch (e) {
    res.status(503).json({ 
      status: 'error', 
      database: 'disconnected' 
    })
  }
})
```

---

## 五、优先级总结

| 优先级 | 问题数量 | 主要关注点 |
|--------|----------|------------|
| **高** | 4项 | 安全性问题，需立即修复 |
| **中** | 8项 | 代码质量和性能优化 |
| **低** | 6项 | 可维护性改进 |

---

## 六、推荐实施顺序

### 第一阶段（安全加固）
1. 修复JWT密钥硬编码
2. 添加登录速率限制
3. 增强密码策略
4. 添加输入验证

### 第二阶段（代码质量）
1. 统一错误处理
2. 重构审计日志代码
3. 添加数据库索引
4. 规范化日志记录

### 第三阶段（性能和可维护性）
1. 拆分大型组件
2. 添加API缓存
3. 编写核心功能测试
4. 添加API文档

---

## 附录：相关文件清单

### 后端核心文件
- `server/src/config/auth.config.js` - JWT配置
- `server/src/app.js` - Express应用配置
- `server/src/middleware/auth.middleware.js` - 认证中间件
- `server/src/middleware/error.js` - 错误处理中间件
- `server/src/utils/response.js` - 响应工具函数
- `server/src/services/audit.service.js` - 审计服务
- `server/prisma/schema.prisma` - 数据库Schema

### 前端核心文件
- `client/src/components/Layout.vue` - 主布局组件
- `client/src/views/Dashboard.vue` - 仪表板页面
- `client/src/router/index.js` - 路由配置
- `client/src/stores/auth.js` - 认证状态管理
- `client/src/utils/request.js` - HTTP请求封装

---

*本报告由Qoder AI助手自动生成*

>除了第一阶段（安全加固），其余已经全部调整优化
