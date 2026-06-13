import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../../src/app.js'

/**
 * 测试辅助工具集
 */
export class TestHelper {
  constructor() {
    this.app = app
    this.request = request(app)
    this.users = {}
    this.tokens = {}
  }

  /**
   * 创建认证用户并获取token
   */
  async createAuthenticatedUser(role = 'viewer', userData = {}) {
    const testUser = await global.testUtils.createTestUser({
      role,
      ...userData
    })

    // 生成JWT token（模拟登录流程）
    const accessToken = jwt.sign(
      {
        id: testUser.id,
        username: testUser.username,
        role: testUser.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    )

    const refreshToken = jwt.sign(
      {
        id: testUser.id,
        username: testUser.username,
        role: testUser.role
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    )

    this.users[role] = testUser
    this.tokens[role] = { accessToken, refreshToken }

    return { user: testUser, tokens: { accessToken, refreshToken } }
  }

  /**
   * 获取带认证的请求对象
   */
  authenticatedRequest(role = 'viewer') {
    if (!this.tokens[role]) {
      throw new Error(`未找到${role}角色的认证信息，请先调用createAuthenticatedUser`)
    }

    return this.request
      .clone()
      .set('Authorization', `Bearer ${this.tokens[role].accessToken}`)
  }

  /**
   * 重置所有测试数据
   */
  async reset() {
    await global.testUtils.resetDatabase()
    this.users = {}
    this.tokens = {}
  }

  /**
   * 创建完整的测试场景数据
   */
  async setupCompleteScenario() {
    const testData = await global.testUtils.seedTestData()

    // 创建不同角色的用户
    await this.createAuthenticatedUser('super_admin', {
      username: 'admin_test',
      real_name: '超级管理员'
    })

    await this.createAuthenticatedUser('admin', {
      username: 'normal_admin',
      real_name: '普通管理员'
    })

    await this.createAuthenticatedUser('viewer', {
      username: 'viewer_test',
      real_name: '查看者'
    })

    return testData
  }

  /**
   * 验证响应格式
   */
  static validateResponse(response, expectedStatus = 200) {
    expect(response.status).toBe(expectedStatus)
    expect(response.body).toHaveProperty('success')
    expect(response.body).toHaveProperty('message')
  }

  /**
   * 验证错误响应格式
   */
  static validateErrorResponse(response, expectedStatus = 400) {
    expect(response.status).toBe(expectedStatus)
    expect(response.body).toHaveProperty('success', false)
    expect(response.body).toHaveProperty('error')
  }

  /**
   * 等待异步操作完成
   */
  static async waitForAsyncOperation(operation, timeout = 5000) {
    const startTime = Date.now()
    let result

    while (Date.now() - startTime < timeout) {
      try {
        result = await operation()
        if (result) return result
      } catch (error) {
        // 继续等待
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    throw new Error(`异步操作超时 (${timeout}ms)`)
  }
}

export default TestHelper
