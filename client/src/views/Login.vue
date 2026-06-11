<template>
  <div class="login-page">
    <!-- 装饰背景 -->
    <div class="login-bg">
      <div class="bg-circle circle-1"></div>
      <div class="bg-circle circle-2"></div>
      <div class="bg-circle circle-3"></div>
      <div class="bg-grid"></div>
    </div>

    <!-- 左侧品牌区 -->
    <div class="login-brand">
      <div class="brand-content">
        <div class="brand-logo">
          <img src="/icons.svg" alt="Logo" />
        </div>
        <h1 class="brand-title">KEC 课程管理平台</h1>
        <p class="brand-subtitle">课程编排 · 培养方案 · 教材管理</p>
        <div class="brand-features">
          <div class="feature-item">
            <div class="feature-icon">
              <el-icon :size="18"><Grid /></el-icon>
            </div>
            <span>基础数据管理</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">
              <el-icon :size="18"><Document /></el-icon>
            </div>
            <span>培养方案编排</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">
              <el-icon :size="18"><DataAnalysis /></el-icon>
            </div>
            <span>多维查询报表</span>
          </div>
        </div>
      </div>
      <div class="brand-footer">
        <span>© 2026 KEC Platform</span>
      </div>
    </div>

    <!-- 右侧登录区 -->
    <div class="login-main">
      <div class="login-card">
        <!-- 卡片头部 -->
        <div class="card-head">
          <div class="head-icon">
            <el-icon :size="24"><UserFilled /></el-icon>
          </div>
          <h2>{{ organizationName }}</h2>
          <p>请登录您的账号以继续</p>
        </div>

        <!-- 登录表单 -->
        <el-form
          ref="formRef"
          :model="loginForm"
          :rules="rules"
          class="login-form"
        >
          <el-form-item prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="请输入用户名"
              :prefix-icon="User"
              size="large"
              clearable
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              size="large"
              show-password
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              class="login-btn"
              @click="handleLogin"
            >
              {{ loading ? '登录中...' : '登 录' }}
            </el-button>
          </el-form-item>
        </el-form>

        <!-- 账号提示（仅开发环境显示） -->
        <div v-if="showTestAccounts" class="account-hint">
          <el-collapse>
            <el-collapse-item title="测试账号" name="1">
              <div class="hint-body">
                <div class="hint-row">
                  <el-tag type="danger" size="small" effect="dark">管理员</el-tag>
                  <code>admin</code>
                  <span>/</span>
                  <code>admin@123456</code>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const formRef = ref(null)
const loading = ref(false)
const organizationName = ref('欢迎回来')
// 仅开发环境显示测试账号提示
const showTestAccounts = import.meta.env.DEV

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

// 加载系统标识
async function loadOrganizationName() {
  try {
    await settingsStore.load()
    
    const orgName = settingsStore.settings.organizationName?.value
    
    // 如果有设置值且不为空，则使用；否则使用默认值
    if (orgName && orgName.trim() !== '') {
      organizationName.value = orgName
    } else {
      organizationName.value = '欢迎回来'
    }
  } catch (e) {
    // 如果加载失败，使用默认值
    console.error('加载系统标识失败:', e)
    organizationName.value = '欢迎回来'
  }
}

onMounted(() => {
  loadOrganizationName()
})
</script>

<style scoped>
/* ==================== 全局布局 ==================== */
.login-page {
  display: flex;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

/* ==================== 装饰背景 ==================== */
.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.08;
}

.circle-1 {
  width: 600px;
  height: 600px;
  background: #409eff;
  top: -200px;
  right: -150px;
}

.circle-2 {
  width: 400px;
  height: 400px;
  background: #764ba2;
  bottom: -150px;
  left: -100px;
}

.circle-3 {
  width: 200px;
  height: 200px;
  background: #67c23a;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(64, 158, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(64, 158, 255, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* ==================== 左侧品牌区 ==================== */
.login-brand {
  flex: 1.618;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  background: linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%);
}

.brand-content {
  text-align: center;
  max-width: 420px;
}

.brand-logo {
  margin-bottom: 32px;
}

.brand-logo img {
  width: 80px;
  height: 80px;
  filter: drop-shadow(0 4px 20px rgba(0, 171, 107, 0.4));
}

.brand-title {
  margin: 0 0 12px;
  font-size: 32px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 2px;
}

.brand-subtitle {
  margin: 0 0 48px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 4px;
}

.brand-features {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 15px;
  transition: all 0.3s ease;
}

.feature-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateX(4px);
}

.feature-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(64, 158, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409eff;
  flex-shrink: 0;
}

.brand-footer {
  position: absolute;
  bottom: 32px;
  color: rgba(255, 255, 255, 0.25);
  font-size: 13px;
}

/* ==================== 右侧登录区 ==================== */
.login-main {
  flex: 1;
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: #f5f7fa;
}

.login-card {
  width: 420px;
  background: #fff;
  border-radius: 16px;
  padding: 48px 40px 36px;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.06),
    0 1px 4px rgba(0, 0, 0, 0.04);
}

.card-head {
  text-align: center;
  margin-bottom: 36px;
}

.head-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-bottom: 20px;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.3);
}

.card-head h2 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: #1d2129;
}

.card-head p {
  margin: 0;
  font-size: 14px;
  color: #86909c;
}

/* ==================== 表单 ==================== */
.login-form {
  margin-bottom: 24px;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  box-shadow: 0 0 0 1px #e5e6eb inset;
  transition: all 0.2s;
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c9cdd4 inset;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2) inset;
}

.login-btn {
  width: 100%;
  height: 46px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 6px;
  margin-top: 8px;
}

/* ==================== 账号提示 ==================== */
.account-hint {
  border-top: 1px solid #f2f3f5;
  padding-top: 16px;
}

.account-hint :deep(.el-collapse) {
  border: none;
}

.account-hint :deep(.el-collapse-item__header) {
  font-size: 13px;
  color: #86909c;
  border: none;
  height: 36px;
  line-height: 36px;
  padding: 0 4px;
}

.account-hint :deep(.el-collapse-item__wrap) {
  border: none;
}

.account-hint :deep(.el-collapse-item__content) {
  padding: 0 4px 8px;
}

.hint-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hint-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #4e5969;
}

.hint-row code {
  background: #f2f3f5;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #1d2129;
}

.hint-warning {
  margin-top: 4px;
}

.hint-warning :deep(.el-alert__title) {
  font-size: 12px;
}

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
  .login-brand {
    display: none;
  }

  .login-main {
    padding: 24px;
  }

  .login-card {
    width: 100%;
    max-width: 400px;
    padding: 36px 24px 28px;
  }

  .card-head h2 {
    font-size: 22px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .login-brand {
    padding: 40px;
  }

  .brand-title {
    font-size: 26px;
  }

  .login-card {
    width: 380px;
  }
}
</style>
