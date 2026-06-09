<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapse ? '64px' : '220px'" class="layout-aside">
      <div class="layout-logo">
        <img src="/icons.svg" alt="Logo" class="logo-icon" />
        <span v-if="!isCollapse">KEC课程管理平台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        router
      >
        <!-- 管理员菜单 -->
        <template v-if="authStore.isAdmin">
          <el-menu-item index="/dashboard">
            <el-icon><HomeFilled /></el-icon>
            <template #title>首页概览</template>
          </el-menu-item>
          <el-sub-menu index="basic">
            <template #title>
              <el-icon><Grid /></el-icon>
              <span>基础数据</span>
            </template>
            <el-menu-item index="/majors">专业管理</el-menu-item>
            <el-menu-item index="/colleges">学院管理</el-menu-item>
            <el-menu-item index="/training-levels">培养层次</el-menu-item>
            <el-menu-item index="/courses">课程管理</el-menu-item>
            <el-menu-item index="/textbooks">教材管理</el-menu-item>
            <el-menu-item index="/classes">班级管理</el-menu-item>
          </el-sub-menu>
          <el-menu-item index="/plans">
            <el-icon><Document /></el-icon>
            <template #title>培养方案</template>
          </el-menu-item>

          <!-- 系统管理菜单（所有管理员可见） -->
          <el-sub-menu index="system">
            <template #title>
              <el-icon><Tools /></el-icon>
              <span>系统管理</span>
            </template>
            <!-- 超级管理员专属 -->
            <template v-if="authStore.userInfo?.role === 'super_admin'">
              <el-menu-item index="/settings">
                <el-icon><Setting /></el-icon>
                <template #title>系统设置</template>
              </el-menu-item>
            </template>
            <!-- admin和super_admin都可以访问 -->
            <el-menu-item index="/users">
              <el-icon><UserFilled /></el-icon>
              <template #title>用户管理</template>
            </el-menu-item>
            <!-- 超级管理员专属 -->
            <template v-if="authStore.userInfo?.role === 'super_admin'">
              <el-menu-item index="/audit-logs">
                <el-icon><DocumentChecked /></el-icon>
                <template #title>操作日志</template>
              </el-menu-item>
            </template>
          </el-sub-menu>
        </template>

        <!-- 查询报表（所有用户可见） -->
        <el-sub-menu index="query">
          <template #title>
            <el-icon><DataAnalysis /></el-icon>
            <span>查询报表</span>
          </template>
          <el-menu-item index="/query/semester">当前开课查询</el-menu-item>
          <el-menu-item index="/query/plan">培养方案查询</el-menu-item>
          <el-menu-item index="/query/textbook">教材使用查询</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="layout-header">
        <div class="layout-header-left">
          <el-icon class="collapse-icon" @click="isCollapse = !isCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <span class="header-title">{{ currentTitle }}</span>
        </div>
        <div class="layout-header-right">
          <el-tag type="info" v-if="semesterLabel">{{ semesterLabel }}</el-tag>
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              {{ authStore.realName || authStore.username }}
              <el-tag size="small" :type="authStore.isAdmin ? 'success' : 'info'" style="margin-left: 5px;">
                {{ authStore.isAdmin ? '管理员' : '访客' }}
              </el-tag>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="layout-main">
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
          placeholder="请输入原密码"
        />
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input
          v-model="passwordForm.newPassword"
          type="password"
          show-password
          placeholder="请输入新密码（至少8位）"
        />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input
          v-model="passwordForm.confirmPassword"
          type="password"
          show-password
          placeholder="请再次输入新密码"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="passwordDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleChangePassword" :loading="changingPassword">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { useAuthStore } from '../stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Tools, UserFilled } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()
const isCollapse = ref(false)

// 修改密码相关
const passwordDialogVisible = ref(false)
const passwordFormRef = ref(null)
const changingPassword = ref(false)
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.value.newPassword) {
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

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || '首页')
const semesterLabel = computed(() => settingsStore.semesterLabel)

onMounted(() => {
  settingsStore.load()
  
  // 检查是否有权限警告
  const warning = sessionStorage.getItem('permissionWarning')
  if (warning) {
    ElMessage.warning(warning)
    sessionStorage.removeItem('permissionWarning')
  }
})

async function handleCommand(command) {
  if (command === 'password') {
    passwordDialogVisible.value = true
    // 重置表单
    passwordForm.value = {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } else if (command === 'logout') {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await authStore.logout()
    ElMessage.success('已退出登录')
  }
}

async function handleChangePassword() {
  if (!passwordFormRef.value) return
  
  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    changingPassword.value = true
    
    try {
      const result = await authStore.changePassword(
        passwordForm.value.oldPassword,
        passwordForm.value.newPassword
      )
      
      if (result.success) {
        ElMessage.success(result.message)
        passwordDialogVisible.value = false
        
        // 清空表单
        passwordForm.value = {
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        }
        
        // 退出登录，让用户重新登录
        await authStore.logout()
        ElMessage.success('密码已修改，请重新登录')
      } else {
        ElMessage.error(result.message)
      }
    } catch (error) {
      ElMessage.error('密码修改失败，请稍后重试')
    } finally {
      changingPassword.value = false
    }
  })
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  overflow: hidden;
  display: flex;
}

.layout-aside {
  transition: width 0.3s;
  background: #304156;
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
}

.layout-logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  border-bottom: 1px solid #3d4c5c;
  flex-shrink: 0;
}

.logo-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e6e6e6;
  background: #fff;
  flex-shrink: 0;
  height: 60px;
}

.layout-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.layout-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapse-icon {
  cursor: pointer;
  font-size: 20px;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
}

.layout-main {
  background: #f5f7fa;
  padding: 20px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
}
</style>
