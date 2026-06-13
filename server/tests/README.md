# KEC课程管理平台 - 自动化测试文档

## 📋 测试概览

本项目采用 **Vitest + Supertest** 进行后端API自动化测试，覆盖认证、权限控制、核心业务逻辑和数据验证。

### 测试目标
- ✅ 确保核心功能正确性
- ✅ 验证权限控制有效性
- ✅ 检测数据边界条件
- ✅ 防止回归错误
- ✅ 提供60%+代码覆盖率

## 🚀 快速开始

### 安装依赖
```bash
cd server
npm install
```

### 运行测试

```bash
# 运行所有测试（监视模式）
npm test

# 运行所有测试（单次执行）
npm run test:run

# 生成覆盖率报告
npm run test:coverage

# 运行特定测试文件
npx vitest tests/auth.test.js

# 运行特定测试套件
npx vitest tests/auth.test.js -t "用户登录"
```

### 查看覆盖率报告
```bash
npm run test:coverage
# 报告生成在 coverage/index.html
open coverage/index.html
```

## 📁 测试文件结构

```
tests/
├── setup.js                    # 测试环境初始化
├── teardown.js                 # 测试清理
├── utils/
│   └── testHelpers.js          # 测试辅助工具
├── auth.test.js                # 认证模块测试
├── rbac.test.js                # 权限控制测试
├── business.test.js            # 核心业务测试
└── validation.test.js          # 数据验证测试
```

## 🧪 测试分类

### 1. 认证模块测试 (`auth.test.js`)
- ✅ 用户登录（成功/失败场景）
- ✅ Token刷新机制
- ✅ 获取当前用户信息
- ✅ 修改密码
- ✅ 登出功能
- ✅ 速率限制

**覆盖率**: 登录、Token管理、审计日志

### 2. 权限控制测试 (`rbac.test.js`)
- ✅ Super Admin权限
- ✅ Admin权限
- ✅ Viewer权限
- ✅ 无权限访问拦截
- ✅ Token失效处理

**测试角色**: `super_admin`, `admin`, `viewer`

### 3. 核心业务测试 (`business.test.js`)
- ✅ 学院管理 (CRUD)
- ✅ 专业管理 (含外键关联)
- ✅ 课程管理 (类型筛选)
- ✅ 班级管理 (状态流转、毕业计算)
- ✅ 培养计划 (版本管理、课程矩阵)
- ✅ 教材管理 (激活/禁用)
- ✅ 查询功能 (学期、历史数据)

**关键场景**: 数据关联完整性、级联操作

### 4. 数据验证测试 (`validation.test.js`)
- ✅ 输入长度限制
- ✅ 数值范围验证
- ✅ 必填字段检查
- ✅ 数据类型转换
- ✅ 唯一性约束
- ✅ 外键约束
- ✅ 边界值测试
- ✅ 特殊字符处理 (SQL注入、XSS、Unicode)
- ✅ 分页和排序
- ✅ 批量操作

## 🔧 测试工具

### TestHelper类
```javascript
import { TestHelper } from './utils/testHelpers.js'

const helper = new TestHelper()

// 创建认证用户
await helper.createAuthenticatedUser('admin')

// 获取带认证的请求
const response = await helper.authenticatedRequest('admin')
  .post('/api/colleges')
  .send({ name: '测试学院' })

// 重置测试数据
await helper.reset()
```

### 全局测试工具
```javascript
// 在setup.js中定义的全局工具
await global.testUtils.resetDatabase()
await global.testUtils.createTestUser({ role: 'admin' })
const testData = await global.testUtils.seedTestData()
```

## 📊 测试覆盖率目标

| 指标 | 目标 | 当前 |
|------|------|------|
| 语句覆盖率 | 60%+ | 待测量 |
| 分支覆盖率 | 60%+ | 待测量 |
| 函数覆盖率 | 60%+ | 待测量 |
| 行覆盖率 | 60%+ | 待测量 |

## 🎯 测试最佳实践

### 1. 测试命名规范
```javascript
it('应该成功登录并返回tokens', async () => { ... })
it('用户名错误应该返回401', async () => { ... })
it('禁用的用户应该拒绝登录', async () => { ... })
```

### 2. 测试数据隔离
```javascript
beforeEach(async () => {
  // 每个测试前重置数据库
  await global.testUtils.resetDatabase()
})
```

### 3. 断言清晰明确
```javascript
expect(response.status).toBe(200)
expect(response.body.success).toBe(true)
expect(response.body.data).toHaveProperty('accessToken')
```

### 4. 测试独立性和可重复性
- 每个测试用例独立运行
- 不依赖其他测试的状态
- 使用beforeEach/afterEach清理环境

## ⚠️ 注意事项

### 数据库隔离
- 测试使用独立的 `test-kec.db` 数据库
- 每个测试套件前自动重置
- 测试结束后自动清理

### 环境变量
测试环境使用固定JWT密钥：
```bash
JWT_SECRET=test-jwt-secret-for-testing-only
JWT_REFRESH_SECRET=test-refresh-secret
JWT_DOWNLOAD_SECRET=test-download-secret
```

### 速率限制
- 登录测试注意速率限制（15分钟内10次）
- 测试中使用不同的IP或等待重置

### Mock和Stub
当前实现使用真实数据库，未来可考虑：
- Mock外部服务（邮件、文件存储）
- Stub耗时操作（Excel导入导出）

## 🔍 调试测试

### 查看详细输出
```bash
npx vitest --reporter=verbose
```

### 运行单个测试
```bash
npx vitest tests/auth.test.js -t "应该成功登录"
```

### 调试模式
```bash
npx vitest --inspect-brk
```

## 📈 CI/CD集成

### GitHub Actions
推送代码到 `main` 或 `develop` 分支时自动运行：
- ✅ Node.js 18.x 和 20.x 双版本测试
- ✅ 覆盖率报告上传Codecov
- ✅ 安全漏洞扫描
- ✅ 前端构建验证

### 本地预检
```bash
# 提交前运行完整测试
npm run test:coverage
npm audit
```

## 🚨 常见问题

### Q: 测试运行缓慢？
A: 检查数据库重置逻辑，考虑减少beforeEach中的数据量

### Q: 测试间相互影响？
A: 确保每个测试独立，正确使用beforeEach/afterEach

### Q: 覆盖率报告不准确？
A: 检查vitest.config.js中的exclude配置

### Q: Token过期导致测试失败？
A: 使用TestHelper生成新token，避免硬编码

## 📝 添加新测试

### 步骤
1. 在对应测试文件中添加 `describe` 块
2. 编写 `it` 测试用例
3. 使用 `expect` 断言
4. 运行测试验证

### 示例
```javascript
describe('新功能模块', () => {
  it('应该正确处理正常输入', async () => {
    const response = await request(app)
      .post('/api/new-feature')
      .set('Authorization', `Bearer ${token}`)
      .send({ field: 'value' })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
  })

  it('应该拒绝无效输入', async () => {
    const response = await request(app)
      .post('/api/new-feature')
      .set('Authorization', `Bearer ${token}`)
      .send({ field: '' })

    expect(response.status).toBe(400)
  })
})
```

## 🎓 学习资源

- [Vitest官方文档](https://vitest.dev/)
- [Supertest GitHub](https://github.com/ladjs/supertest)
- [Jest断言参考](https://jestjs.io/docs/expect)
- [测试金字塔](https://martinfowler.com/articles/practical-test-pyramid.html)

---

**最后更新**: 2026-06-13
**维护者**: KEC开发团队
