# 权限管理系统设计方案

## 一、需求分析

### 1.1 当前问题
- 系统完全开放，无任何身份验证
- 任何人都可以访问和修改所有数据
- 无法区分不同操作人的责任和权限
- 存在数据泄露和恶意篡改风险

### 1.2 业务需求

#### 角色定义
1. **管理员（Admin）**
   - 可以登录系统
   - 设置和维护基础信息（专业、学院、培养层次、课程、教材）
   - 管理培养方案
   - 管理班级
   - 系统设置（学期配置、数据重置等）
   - 查看所有页面

2. **访客（Viewer/Guest）**
   - 通过访客登录或免登录访问
   - 只能访问查询页面：
     - 当前学期开课查询
     - 培养方案查询
     - 教材使用查询
   - 其他涉及基本信息维护和系统设置的页面对其不可见
   - 所有只读操作

### 1.3 技术选型建议

**推荐方案：JWT Token + 前端路由守卫 + 后端中间件鉴权**

**优点**：
- 无状态认证，适合前后端分离架构
- 实现简单，成熟稳定
- 易于扩展到多端（Web、移动端）
- 支持角色权限控制

**备选方案**：
- Session/Cookie（需要处理CSRF，不推荐）
- OAuth 2.0（过度设计，不适合内部系统）

---

## 二、数据库设计

### 2.1 用户表设计

```prisma
// server/prisma/schema.prisma

model User {
  id            Int      @id @default(autoincrement())
  username      String   @unique                        // 用户名（唯一）
  password      String                                  // bcrypt加密后的密码
  role          String   @default("viewer")             // 角色：admin | viewer
  realName      String?                                 // 真实姓名
  email         String?                                 // 邮箱
  isActive      Boolean  @default(true)                 // 是否激活
  lastLoginAt   DateTime?                               // 最后登录时间
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  auditLogs     AuditLog[]                              // 关联操作日志

  @@index([username])
  @@index([role])
}
```

### 2.2 操作日志表扩展

```prisma
model AuditLog {
  id          Int      @id @default(autoincrement())
  action      String
  module      String
  operatorId  Int?                                    // 新增：操作人ID
  operator    User?    @relation(fields: [operatorId], references: [id])
  ip          String?
  details     Json?
  result      String
  message     String?
  createdAt   DateTime @default(now())

  @@index([action])
  @@index([module])
  @@index([operatorId])
  @@index([createdAt(sort: Desc)])
}
```

### 2.3 初始化管理员账号

```javascript
// server/prisma/seed.js
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // 检查是否已存在管理员
  const adminExists = await prisma.user.findUnique({
    where: { username: 'admin' }
  })

  if (!adminExists) {
    // 创建默认管理员账号
    const hashedPassword = await bcrypt.hash('admin@123456', 10)

    await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        realName: '系统管理员',
        email: 'admin@example.com'
      }
    })

    console.log('默认管理员账号已创建：')
    console.log('用户名: admin')
    console.log('密码: admin@123456')
    console.log('请及时修改密码！')
  }

  // 创建示例访客账号（可选）
  const viewerExists = await prisma.user.findUnique({
    where: { username: 'guest' }
  })

  if (!viewerExists) {
    const hashedPassword = await bcrypt.hash('guest@123456', 10)

    await prisma.user.create({
      data: {
        username: 'guest',
        password: hashedPassword,
        role: 'viewer',
        realName: '访客',
        email: 'guest@example.com'
      }
    })

    console.log('示例访客账号已创建：')
    console.log('用户名: guest')
    console.log('密码: guest@123456')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

在 `schema.prisma` 中配置 seed：
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ... models ...

// 添加 seed 配置
// 在 package.json 中添加：
// "prisma": {
//   "seed": "node prisma/seed.js"
// }
```

---

## 三、后端实现

### 3.1 安装依赖

```bash
cd server
npm install jsonwebtoken bcryptjs
npm install --save-dev @types/jsonwebtoken @types/bcryptjs
```

### 3.2 JWT配置

```javascript
// server/src/config/auth.config.js
export const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: '24h', // Token有效期24小时
  jwtRefreshExpiresIn: '7d' // Refresh Token有效期7天
}
```

### 3.3 认证服务

```javascript
// server/src/services/auth.service.js
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma.js'
import { authConfig } from '../config/auth.config.js'

export class AuthService {
  /**
   * 用户登录
   */
  static async login(username, password) {
    // 1. 查找用户
    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user) {
      throw new Error('用户名或密码错误')
    }

    // 2. 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      throw new Error('用户名或密码错误')
    }

    // 3. 检查账号是否激活
    if (!user.isActive) {
      throw new Error('账号已被禁用')
    }

    // 4. 生成Token
    const token = this.generateToken(user)
    const refreshToken = this.generateRefreshToken(user)

    // 5. 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // 6. 记录登录日志
    await prisma.auditLog.create({
      data: {
        action: 'login',
        module: 'auth',
        operatorId: user.id,
        result: 'success',
        message: `${user.username} 登录系统`
      }
    })

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        realName: user.realName,
        email: user.email
      },
      token,
      refreshToken
    }
  }

  /**
   * 刷新Token
   */
  static async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, authConfig.jwtSecret)
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      })

      if (!user || !user.isActive) {
        throw new Error('Refresh Token无效')
      }

      const newToken = this.generateToken(user)
      return { token: newToken }
    } catch (error) {
      throw new Error('Refresh Token已过期或无效')
    }
  }

  /**
   * 生成Access Token
   */
  static generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      authConfig.jwtSecret,
      { expiresIn: authConfig.jwtExpiresIn }
    )
  }

  /**
   * 生成Refresh Token
   */
  static generateRefreshToken(user) {
    return jwt.sign(
      {
        id: user.id,
        type: 'refresh'
      },
      authConfig.jwtSecret,
      { expiresIn: authConfig.jwtRefreshExpiresIn }
    )
  }

  /**
   * 验证Token
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, authConfig.jwtSecret)
    } catch (error) {
      return null
    }
  }

  /**
   * 修改密码
   */
  static async changePassword(userId, oldPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    // 验证旧密码
    const isValid = await bcrypt.compare(oldPassword, user.password)
    if (!isValid) {
      throw new Error('原密码错误')
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    })

    return { message: '密码修改成功' }
  }
}
```

### 3.4 认证中间件

```javascript
// server/src/middleware/auth.middleware.js
import { AuthService } from '../services/auth.service.js'

/**
 * 认证中间件 - 验证Token有效性
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '未授权，请先登录'
    })
  }

  const token = authHeader.substring(7)
  const decoded = AuthService.verifyToken(token)

  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Token无效或已过期'
    })
  }

  // 将用户信息附加到请求对象
  req.user = decoded
  next()
}

/**
 * 角色授权中间件 - 验证用户角色
 * @param {String[]} allowedRoles - 允许的角色列表
 */
export function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权'
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      // 记录未授权访问尝试
      console.warn(`用户 ${req.user.username} 尝试访问受限资源`)

      return res.status(403).json({
        success: false,
        message: '权限不足，无法执行此操作'
      })
    }

    next()
  }
}

/**
 * 可选认证中间件 - Token存在则验证，不存在则允许匿名访问
 */
export function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const decoded = AuthService.verifyToken(token)

    if (decoded) {
      req.user = decoded
    }
  }

  next()
}
```

### 3.5 认证路由

```javascript
// server/src/routes/auth.routes.js
import express from 'express'
import { AuthService } from '../services/auth.service.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { success, fail } from '../utils/response.js'

const router = express.Router()

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return fail(res, '请输入用户名和密码')
    }

    const result = await AuthService.login(username, password)
    success(res, result, '登录成功')
  } catch (error) {
    fail(res, error.message)
  }
})

/**
 * POST /api/auth/refresh
 * 刷新Token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return fail(res, '请提供Refresh Token')
    }

    const result = await AuthService.refreshToken(refreshToken)
    success(res, result)
  } catch (error) {
    fail(res, error.message)
  }
})

/**
 * POST /api/auth/logout
 * 用户登出（前端清除Token，后端记录日志）
 */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // 记录登出日志
    await prisma.auditLog.create({
      data: {
        action: 'logout',
        module: 'auth',
        operatorId: req.user.id,
        result: 'success',
        message: `${req.user.username} 登出系统`
      }
    })

    success(res, null, '登出成功')
  } catch (error) {
    fail(res, error.message)
  }
})

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        role: true,
        realName: true,
        email: true,
        lastLoginAt: true,
        createdAt: true
      }
    })

    success(res, user)
  } catch (error) {
    fail(res, error.message)
  }
})

/**
 * PUT /api/auth/password
 * 修改密码
 */
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return fail(res, '请提供原密码和新密码')
    }

    if (newPassword.length < 8) {
      return fail(res, '新密码长度至少8位')
    }

    await AuthService.changePassword(req.user.id, oldPassword, newPassword)
    success(res, null, '密码修改成功')
  } catch (error) {
    fail(res, error.message)
  }
})

export default router
```

### 3.6 保护现有路由

```javascript
// server/src/app.js
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes.js'
import majorRoutes from './routes/major.routes.js'
import collegeRoutes from './routes/college.routes.js'
import trainingLevelRoutes from './routes/trainingLevel.routes.js'
import courseRoutes from './routes/course.routes.js'
import textbookRoutes from './routes/textbook.routes.js'
import classRoutes from './routes/class.routes.js'
import planRoutes from './routes/plan.routes.js'
import queryRoutes from './routes/query.routes.js'
import importRoutes from './routes/import.routes.js'
import exportRoutes from './routes/export.routes.js'
import settingRoutes from './routes/setting.routes.js'
import auditRoutes from './routes/audit.routes.js'
import { authMiddleware, roleMiddleware } from './middleware/auth.middleware.js'
import { errorHandler } from './middleware/error.middleware.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 公开路由（无需认证）
app.use('/api/auth', authRoutes)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 需要认证的路由
// 查询接口 - 所有登录用户可访问
app.use('/api/query', authMiddleware, queryRoutes)

// 导出接口 - 所有登录用户可访问
app.use('/api/export', authMiddleware, exportRoutes)

// 基础数据管理 - 仅管理员可访问
app.use('/api/majors', authMiddleware, roleMiddleware('admin'), majorRoutes)
app.use('/api/colleges', authMiddleware, roleMiddleware('admin'), collegeRoutes)
app.use('/api/training-levels', authMiddleware, roleMiddleware('admin'), trainingLevelRoutes)
app.use('/api/courses', authMiddleware, roleMiddleware('admin'), courseRoutes)
app.use('/api/textbooks', authMiddleware, roleMiddleware('admin'), textbookRoutes)

// 班级管理 - 仅管理员可访问
app.use('/api/classes', authMiddleware, roleMiddleware('admin'), classRoutes)

// 培养方案管理 - 仅管理员可访问
app.use('/api/plans', authMiddleware, roleMiddleware('admin'), planRoutes)

// 导入接口 - 仅管理员可访问
app.use('/api/import', authMiddleware, roleMiddleware('admin'), importRoutes)

// 系统设置 - 仅管理员可访问
app.use('/api/settings', authMiddleware, roleMiddleware('admin'), settingRoutes)

// 审计日志 - 仅管理员可访问
app.use('/api/audit', authMiddleware, roleMiddleware('admin'), auditRoutes)

// 错误处理中间件
app.use(errorHandler)

export { app }
```

### 3.7 操作日志增强

```javascript
// server/src/services/audit.service.js
import { prisma } from '../lib/prisma.js'

export class AuditService {
  /**
   * 记录操作日志
   */
  static async log(options) {
    const {
      action,
      module,
      operatorId,
      ip,
      details,
      result = 'success',
      message
    } = options

    try {
      await prisma.auditLog.create({
        data: {
          action,
          module,
          operatorId,
          ip,
          details,
          result,
          message
        }
      })
    } catch (error) {
      console.error('记录审计日志失败:', error)
    }
  }

  /**
   * 获取操作日志列表
   */
  static async getLogs(params = {}) {
    const {
      page = 1,
      pageSize = 20,
      action,
      module,
      operatorId,
      startDate,
      endDate
    } = params

    const skip = (page - 1) * pageSize
    const take = pageSize

    const where = {}

    if (action) where.action = action
    if (module) where.module = module
    if (operatorId) where.operatorId = parseInt(operatorId)
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const [list, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          operator: {
            select: {
              id: true,
              username: true,
              realName: true
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ])

    return {
      list,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / pageSize)
    }
  }
}
```

在路由中使用：
```javascript
// 示例：在创建班级时记录日志
import { AuditService } from '../services/audit.service.js'

router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const classData = await prisma.class.create({
      data: req.body
    })

    // 记录操作日志
    await AuditService.log({
      action: 'create',
      module: 'class',
      operatorId: req.user.id,
      ip: req.ip,
      details: { classId: classData.id, className: classData.name },
      message: `创建班级：${classData.name}`
    })

    success(res, classData, '创建成功')
  } catch (error) {
    fail(res, error.message)
  }
})
```

---

## 四、前端实现

### 4.1 安装依赖

```bash
cd client
npm install pinia vue-router axios
```

### 4.2 创建认证Store

```javascript
// client/src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '@/router'
import axios from 'axios'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref(localStorage.getItem('token') || '')
  const refreshToken = ref(localStorage.getItem('refreshToken') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || 'null'))

  // Getters
  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userInfo.value?.role === 'admin')
  const isViewer = computed(() => userInfo.value?.role === 'viewer')
  const username = computed(() => userInfo.value?.username || '')
  const realName = computed(() => userInfo.value?.realName || '')

  // Actions
  async function login(username, password) {
    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      })

      const { user, token: newToken, refreshToken: newRefreshToken } = response.data.data

      // 保存认证信息
      token.value = newToken
      refreshToken.value = newRefreshToken
      userInfo.value = user

      // 持久化到localStorage
      localStorage.setItem('token', newToken)
      localStorage.setItem('refreshToken', newRefreshToken)
      localStorage.setItem('userInfo', JSON.stringify(user))

      // 设置Axios默认header
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

      // 跳转到首页
      router.push('/')

      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '登录失败'
      }
    }
  }

  async function logout() {
    try {
      // 调用后端登出接口
      await axios.post('/api/auth/logout')
    } catch (error) {
      console.error('登出请求失败:', error)
    } finally {
      // 清除本地认证信息
      clearAuth()
      router.push('/login')
    }
  }

  async function refreshAccessToken() {
    try {
      const response = await axios.post('/api/auth/refresh', {
        refreshToken: refreshToken.value
      })

      const { token: newToken } = response.data.data

      token.value = newToken
      localStorage.setItem('token', newToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

      return true
    } catch (error) {
      // Refresh Token失效，强制重新登录
      clearAuth()
      router.push('/login')
      return false
    }
  }

  async function fetchUserInfo() {
    try {
      const response = await axios.get('/api/auth/me')
      userInfo.value = response.data.data

      localStorage.setItem('userInfo', JSON.stringify(response.data.data))
      return true
    } catch (error) {
      // Token失效，尝试刷新
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        return fetchUserInfo() // 重试
      }
      return false
    }
  }

  async function changePassword(oldPassword, newPassword) {
    try {
      await axios.put('/api/auth/password', {
        oldPassword,
        newPassword
      })
      return { success: true, message: '密码修改成功' }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '密码修改失败'
      }
    }
  }

  function clearAuth() {
    token.value = ''
    refreshToken.value = ''
    userInfo.value = null

    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userInfo')

    delete axios.defaults.headers.common['Authorization']
  }

  // 初始化时恢复登录状态
  function initAuth() {
    if (token.value) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      fetchUserInfo()
    }
  }

  return {
    token,
    refreshToken,
    userInfo,
    isLoggedIn,
    isAdmin,
    isViewer,
    username,
    realName,
    login,
    logout,
    refreshAccessToken,
    fetchUserInfo,
    changePassword,
    clearAuth,
    initAuth
  }
})
```

### 4.3 Axios拦截器优化

```javascript
// client/src/utils/request.js
import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'

const service = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
let isRefreshing = false // 防止重复刷新Token
let failedQueue = [] // 失败的请求队列

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

service.interceptors.response.use(
  response => {
    return response.data
  },
  async error => {
    const originalRequest = error.config
    const authStore = useAuthStore()

    // 处理401未授权
    if (error.response?.status === 401) {
      if (isRefreshing) {
        // 正在刷新Token，将请求加入队列
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return service(originalRequest)
          })
          .catch(err => Promise.reject(err))
      }

      isRefreshing = true

      // 尝试刷新Token
      const refreshed = await authStore.refreshAccessToken()

      isRefreshing = false

      if (refreshed) {
        // 刷新成功，重试失败的请求
        processQueue(null, authStore.token)
        originalRequest.headers.Authorization = `Bearer ${authStore.token}`
        return service(originalRequest)
      } else {
        // 刷新失败，跳转登录页
        processQueue(error, null)
        ElMessage.error('登录已过期，请重新登录')
        authStore.logout()
        return Promise.reject(error)
      }
    }

    // 处理403权限不足
    if (error.response?.status === 403) {
      ElMessage.error('权限不足，无法执行此操作')
      return Promise.reject(error)
    }

    // 处理其他错误
    let message = '请求失败'

    if (error.response) {
      switch (error.response.status) {
        case 400:
          message = error.response.data?.message || '请求参数错误'
          break
        case 404:
          message = '请求的资源不存在'
          break
        case 500:
          message = '服务器内部错误'
          break
        default:
          message = error.response.data?.message || '未知错误'
      }
    } else if (error.code === 'ECONNABORTED') {
      message = '请求超时，请稍后重试'
    } else if (error.code === 'ERR_NETWORK') {
      message = '网络连接失败，请检查网络'
    }

    ElMessage.error({
      message,
      duration: 5000,
      showClose: true
    })

    return Promise.reject(error)
  }
)

export default service
```

### 4.4 路由守卫

```javascript
// client/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/components/Layout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页概览', requiresAdmin: true }
      },
      // ===== 基础数据管理（仅管理员）=====
      {
        path: 'majors',
        name: 'Majors',
        component: () => import('@/views/Majors.vue'),
        meta: { title: '专业管理', requiresAdmin: true }
      },
      {
        path: 'colleges',
        name: 'Colleges',
        component: () => import('@/views/Colleges.vue'),
        meta: { title: '学院管理', requiresAdmin: true }
      },
      {
        path: 'training-levels',
        name: 'TrainingLevels',
        component: () => import('@/views/TrainingLevels.vue'),
        meta: { title: '培养层次', requiresAdmin: true }
      },
      {
        path: 'courses',
        name: 'Courses',
        component: () => import('@/views/Courses.vue'),
        meta: { title: '课程管理', requiresAdmin: true }
      },
      {
        path: 'textbooks',
        name: 'Textbooks',
        component: () => import('@/views/Textbooks.vue'),
        meta: { title: '教材管理', requiresAdmin: true }
      },
      {
        path: 'classes',
        name: 'Classes',
        component: () => import('@/views/Classes.vue'),
        meta: { title: '班级管理', requiresAdmin: true }
      },
      // ===== 培养方案管理（仅管理员）=====
      {
        path: 'plans',
        name: 'Plans',
        component: () => import('@/views/Plans.vue'),
        meta: { title: '培养方案', requiresAdmin: true }
      },
      {
        path: 'plans/:id',
        name: 'PlanDetail',
        component: () => import('@/views/PlanDetail.vue'),
        meta: { title: '方案详情', requiresAdmin: true }
      },
      // ===== 查询报表（所有登录用户可访问）=====
      {
        path: 'query/semester',
        name: 'QuerySemester',
        component: () => import('@/views/QuerySemester.vue'),
        meta: { title: '当前学期开课', requiresAuth: true }
      },
      {
        path: 'query/plan',
        name: 'QueryPlan',
        component: () => import('@/views/QueryPlan.vue'),
        meta: { title: '培养方案查询', requiresAuth: true }
      },
      {
        path: 'query/textbook',
        name: 'QueryTextbook',
        component: () => import('@/views/QueryTextbook.vue'),
        meta: { title: '教材使用查询', requiresAuth: true }
      },
      // ===== 系统设置（仅管理员）=====
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
        meta: { title: '系统设置', requiresAdmin: true }
      },
      {
        path: 'audit-logs',
        name: 'AuditLogs',
        component: () => import('@/views/AuditLogs.vue'),
        meta: { title: '操作日志', requiresAdmin: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - KEC课程管理平台` : 'KEC课程管理平台'

  // 如果访问登录页且已登录，跳转到首页
  if (to.path === '/login') {
    if (authStore.isLoggedIn) {
      next('/')
    } else {
      next()
    }
    return
  }

  // 检查是否需要认证
  if (to.meta.requiresAuth !== false) {
    // 未登录，跳转到登录页
    if (!authStore.isLoggedIn) {
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
      return
    }

    // 确保用户信息已加载
    if (!authStore.userInfo) {
      await authStore.fetchUserInfo()
    }

    // 检查是否需要管理员权限
    if (to.meta.requiresAdmin && !authStore.isAdmin) {
      ElMessage.warning('您没有权限访问此页面')
      next('/query/semester') // 重定向到访客可访问的页面
      return
    }
  }

  next()
})

export default router
```

### 4.5 登录页面

```vue
<!-- client/src/views/Login.vue -->
<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <h2>KEC课程管理平台</h2>
      </template>

      <el-form
        ref="formRef"
        :model="loginForm"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            prefix-icon="User"
            clearable
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            style="width: 100%"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="tips">
        <el-alert
          title="提示"
          type="info"
          :closable="false"
        >
          <p>管理员账号：admin / admin@123456</p>
          <p>访客账号：guest / guest@123456</p>
          <p>请及时修改默认密码！</p>
        </el-alert>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ]
}

async function handleLogin() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true

    try {
      const result = await authStore.login(loginForm.username, loginForm.password)

      if (result.success) {
        ElMessage.success('登录成功')

        // 跳转到之前访问的页面或首页
        const redirect = route.query.redirect || '/'
        router.push(redirect)
      } else {
        ElMessage.error(result.message)
      }
    } catch (error) {
      ElMessage.error('登录失败，请稍后重试')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 450px;
}

.login-card h2 {
  text-align: center;
  margin: 0;
  color: #333;
}

.tips {
  margin-top: 20px;
}

.tips p {
  margin: 5px 0;
  font-size: 14px;
}
</style>
```

### 4.6 Layout组件优化

```vue
<!-- client/src/components/Layout.vue -->
<template>
  <el-container style="height: 100vh">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '200px'" class="sidebar">
      <div class="logo">
        <span v-if="!isCollapse">KEC课程管理</span>
        <span v-else>KEC</span>
      </div>

      <el-menu
        :collapse="isCollapse"
        :default-active="$route.path"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <!-- 管理员菜单 -->
        <template v-if="authStore.isAdmin">
          <el-sub-menu index="basic">
            <template #title>
              <el-icon><School /></el-icon>
              <span>基础数据</span>
            </template>
            <el-menu-item index="/majors">专业管理</el-menu-item>
            <el-menu-item index="/colleges">学院管理</el-menu-item>
            <el-menu-item index="/training-levels">培养层次</el-menu-item>
            <el-menu-item index="/courses">课程管理</el-menu-item>
            <el-menu-item index="/textbooks">教材管理</el-menu-item>
            <el-menu-item index="/classes">班级管理</el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="plan">
            <template #title>
              <el-icon><Document /></el-icon>
              <span>培养方案</span>
            </template>
            <el-menu-item index="/plans">方案列表</el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="system">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>系统管理</span>
            </template>
            <el-menu-item index="/settings">系统设置</el-menu-item>
            <el-menu-item index="/audit-logs">操作日志</el-menu-item>
          </el-sub-menu>
        </template>

        <!-- 查询报表（所有用户可见） -->
        <el-sub-menu index="query">
          <template #title>
            <el-icon><Search /></el-icon>
            <span>查询报表</span>
          </template>
          <el-menu-item index="/query/semester">当前学期开课</el-menu-item>
          <el-menu-item index="/query/plan">培养方案查询</el-menu-item>
          <el-menu-item index="/query/textbook">教材使用查询</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶栏 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon
            class="collapse-btn"
            @click="toggleCollapse"
          >
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <h2>{{ $route.meta.title }}</h2>
        </div>

        <div class="header-right">
          <el-tag size="small">{{ settingsStore.semesterLabel }}</el-tag>

          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              {{ authStore.realName || authStore.username }}
              <el-tag size="small" type="success" v-if="authStore.isAdmin">
                管理员
              </el-tag>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <!-- 修改密码对话框 -->
  <el-dialog
    v-model="passwordDialogVisible"
    title="修改密码"
    width="500px"
  >
    <el-form
      ref="passwordFormRef"
      :model="passwordForm"
      :rules="passwordRules"
      label-width="100px"
    >
      <el-form-item label="原密码" prop="oldPassword">
        <el-input
          v-model="passwordForm.oldPassword"
          type="password"
          show-password
        />
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input
          v-model="passwordForm.newPassword"
          type="password"
          show-password
        />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input
          v-model="passwordForm.confirmPassword"
          type="password"
          show-password
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="passwordDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleChangePassword">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  School, Document, Setting, Search, User, Fold, Expand
} from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const isCollapse = ref(false)
const passwordDialogVisible = ref(false)
const passwordFormRef = ref(null)

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  oldPassword: [
    { required: true, message: '请输入原密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, message: '密码长度至少8位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

function toggleCollapse() {
  isCollapse.value = !isCollapse.value
}

function handleCommand(command) {
  switch (command) {
    case 'profile':
      ElMessage.info('个人信息功能开发中')
      break
    case 'password':
      passwordDialogVisible.value = true
      break
    case 'logout':
      handleLogout()
      break
  }
}

async function handleLogout() {
  await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })

  await authStore.logout()
  ElMessage.success('已退出登录')
}

async function handleChangePassword() {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return

    const result = await authStore.changePassword(
      passwordForm.oldPassword,
      passwordForm.newPassword
    )

    if (result.success) {
      ElMessage.success(result.message)
      passwordDialogVisible.value = false

      // 清空表单
      passwordForm.oldPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''

      // 退出登录
      await authStore.logout()
      ElMessage.success('密码已修改，请重新登录')
    } else {
      ElMessage.error(result.message)
    }
  })
}

// 初始化
settingsStore.load()
</script>

<style scoped>
.sidebar {
  background-color: #304156;
  box-shadow: 2px 0 6px rgba(0, 21, 41, 0.35);
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  background-color: #2b3a4b;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  border-bottom: 1px solid #dfe6ec;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  transition: color 0.3s;
}

.collapse-btn:hover {
  color: #409eff;
}

.header-left h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f7fa;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
}
</style>
```

### 4.7 路由级别权限控制（高级）

如果需要更细粒度的权限控制，可以创建权限指令：

```javascript
// client/src/directives/permission.js
import { useAuthStore } from '@/stores/auth'

export const permission = {
  mounted(el, binding) {
    const { value } = binding
    const authStore = useAuthStore()

    if (value && typeof value === 'string') {
      const roles = value.split(',')

      if (roles.length && !roles.includes(authStore.userInfo?.role)) {
        el.parentNode?.removeChild(el)
      }
    } else {
      throw new Error('need roles! Like v-permission="\'admin,viewer\'"')
    }
  }
}
```

在组件中使用：
```vue
<template>
  <!-- 只有管理员可见 -->
  <el-button v-permission="'admin'" @click="handleEdit">编辑</el-button>

  <!-- 管理员和访客都可见 -->
  <el-button v-permission="'admin,viewer'" @click="handleView">查看</el-button>
</template>
```

---

## 五、实施步骤

### 5.1 第一阶段：数据库准备（1天）

1. 更新 `schema.prisma`，添加 `User` 表和扩展 `AuditLog`
2. 运行 `npx prisma migrate dev` 应用迁移
3. 创建 `seed.js` 脚本，初始化管理员账号
4. 运行 `npx prisma db seed` 填充初始数据

### 5.2 第二阶段：后端开发（2-3天）

1. 安装依赖：`jsonwebtoken`, `bcryptjs`
2. 创建 `auth.config.js` 配置文件
3. 实现 `auth.service.js` 认证服务
4. 创建 `auth.middleware.js` 中间件
5. 创建 `auth.routes.js` 认证路由
6. 修改 `app.js`，保护现有路由
7. 增强 `audit.service.js`，记录操作人

### 5.3 第三阶段：前端开发（2-3天）

1. 创建 `auth.js` Store
2. 优化 `request.js` 拦截器，处理Token刷新
3. 创建 `Login.vue` 登录页面
4. 修改 `router/index.js`，添加路由守卫
5. 优化 `Layout.vue`，根据角色显示菜单
6. 添加修改密码功能
7. 测试各种场景

### 5.4 第四阶段：测试与优化（1-2天）

1. 单元测试：认证服务、中间件
2. 集成测试：登录、Token刷新、权限控制
3. 端到端测试：完整业务流程
4. 安全测试：SQL注入、XSS、暴力破解防护
5. 性能测试：并发登录、Token验证

### 5.5 第五阶段：部署与文档（1天）

1. 更新 `.env.example`，添加 `JWT_SECRET`
2. 编写部署文档
3. 编写用户使用手册
4. 培训管理员如何使用系统

---

## 六、安全注意事项

### 6.1 密码安全

- 使用bcrypt加密，salt rounds设为10
- 密码长度至少8位
- 建议定期更换密码
- 不要使用常见密码

### 6.2 Token安全

- JWT Secret必须足够复杂，不要硬编码在代码中
- Access Token有效期不宜过长（建议24小时）
- Refresh Token妥善存储，避免XSS攻击
- HTTPS环境下传输（生产环境必须）

### 6.3 防护措施

- 限制登录尝试次数（防止暴力破解）
- 记录登录日志，监控异常行为
- 启用CORS，限制跨域请求
- 输入验证，防止SQL注入和XSS

### 6.4 环境变量

```bash
# server/.env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-key-at-least-32-characters-long"
PORT=3000
NODE_ENV=development
```

**重要**：`JWT_SECRET` 应该：
- 至少32个字符
- 包含大小写字母、数字、特殊字符
- 不要提交到版本控制系统
- 生产环境使用不同的密钥

---

## 七、常见问题FAQ

### Q1: Token过期怎么办？
A: 系统会自动尝试使用Refresh Token刷新Access Token。如果Refresh Token也过期，会跳转到登录页要求重新登录。

### Q2: 忘记密码怎么办？
A: 当前版本不支持自助重置密码。请联系管理员在数据库中手动重置密码：
```sql
UPDATE users SET password = '$2b$10$...' WHERE username = 'admin';
```
或使用bcrypt生成新密码哈希。

### Q3: 如何添加新用户？
A: 当前版本需要通过API或数据库直接添加。后续可扩展为用户管理功能：
```javascript
POST /api/users
{
  "username": "newuser",
  "password": "password123",
  "role": "viewer",
  "realName": "张三"
}
```

### Q4: 访客是否需要登录？
A: 根据需求，有两种方案：
1. **免登录访问**：查询接口允许匿名访问（不推荐，安全性低）
2. **访客账号登录**：创建viewer角色的账号，登录后只能访问查询页面（推荐）

当前设计采用方案2，更安全。

### Q5: 如何防止同一账号多地登录？
A: 可以在User表中添加 `currentSessionId` 字段，每次登录时更新。验证Token时检查sessionId是否匹配。但考虑到这是内部系统，暂时不需要此功能。

---

## 八、后续扩展

### 8.1 用户管理功能
- 管理员可以创建、编辑、删除用户
- 批量导入用户
- 用户角色分配
- 账号启用/禁用

### 8.2 细粒度权限控制
- 基于资源的权限（如：只能管理自己创建的班级）
- 操作级别的权限（如：只能查看不能编辑）
- 数据范围权限（如：只能查看本学院的数据）

### 8.3 双因素认证（2FA）
- 短信验证码
- 邮箱验证码
- TOTP（Google Authenticator）

### 8.4 单点登录（SSO）
- 集成学校统一身份认证
- OAuth 2.0 / SAML

### 8.5 审计增强
- 操作日志导出
- 异常行为检测
- 登录IP白名单

---

## 九、总结

本权限管理系统设计方案基于JWT Token实现，具有以下特点：

**优点**：
1. ✅ 实现简单，成熟稳定
2. ✅ 前后端分离友好
3. ✅ 支持角色权限控制
4. ✅ 无状态认证，易于扩展
5. ✅ Token自动刷新，用户体验好

**适用场景**：
- 内部管理系统
- 小型团队使用
- 对安全性要求中等
- 用户数量较少（<1000）

**不适用场景**：
- 大规模分布式系统（建议使用OAuth 2.0 + API Gateway）
- 超高安全性要求（建议使用硬件Token + 生物识别）
- 需要第三方应用集成（建议使用OIDC）

对于当前的KEC课程管理平台，本方案完全满足需求，且留有扩展空间。
