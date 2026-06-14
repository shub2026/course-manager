<template>
  <div class="settings-page">
    <!-- 页面标题栏 -->
    <div class="page-hero">
      <div class="hero-left">
        <div class="hero-icon">
          <el-icon :size="28"><Setting /></el-icon>
        </div>
        <div class="hero-text">
          <h1>系统设置</h1>
          <p>配置学期参数，管理数据重置</p>
        </div>
      </div>
      <div class="hero-actions">
        <router-link to="/audit-logs">
          <el-button plain>
            <el-icon><DocumentChecked /></el-icon>
            操作日志
          </el-button>
        </router-link>
        <router-link to="/users">
          <el-button plain>
            <el-icon><UserFilled /></el-icon>
            用户管理
          </el-button>
        </router-link>
      </div>
    </div>

    <!-- 学期配置组件 -->
    <SemesterConfig
      v-model:form="form"
      v-model:selectedSemester="selectedSemester"
      :saved-semester="savedSemester"
      :saving="saving"
      @save="handleSave"
    />

    <!-- 数据重置组件 -->
    <DataReset
      :resetting="resetting"
      @reset="showResetDialog"
    />

    <!-- 确认对话框组件 -->
    <ConfirmDialog
      v-model:dialog-visible="dialogVisible"
      v-model:simple-dialog-visible="clearAuditDialogVisible"
      v-model:save-dialog-visible="saveConfirmVisible"
      v-model:confirm-input="confirmInput"
      :reset-type="resetType"
      :resetting="resetting"
      :saving="saving"
      @confirm="handleReset"
      @confirm-simple="handleClearAuditLogs"
      @confirm-save="confirmSave"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, DocumentChecked, UserFilled } from '@element-plus/icons-vue'
import { useSettingsStore } from '../../stores/settings'
import request from '../../utils/request'
import SemesterConfig from './components/SemesterConfig.vue'
import DataReset from './components/DataReset.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'

const settingsStore = useSettingsStore()
const saving = ref(false)
const resetting = ref(false)
const form = ref({
  current_semester: '',
  organization_name: '',
})

// 跟踪当前选中的学期和已保存的学期
const selectedSemester = ref('')
const savedSemester = ref('')

// 对话框状态
const dialogVisible = ref(false)
const resetType = ref('')
const confirmInput = ref('')
const clearAuditDialogVisible = ref(false)
const saveConfirmVisible = ref(false)

async function load() {
  await settingsStore.load()
  const s = settingsStore.settings
  const semesterValue = s.currentSemester?.value || ''
  const orgName = s.organizationName?.value || '欢迎回来'
  form.value.current_semester = semesterValue
  form.value.organization_name = orgName
  selectedSemester.value = semesterValue
  savedSemester.value = semesterValue
}

function handleSave() {
  saveConfirmVisible.value = true
}

async function confirmSave() {
  saving.value = true
  try {
    await settingsStore.save(form.value)
    savedSemester.value = form.value.current_semester
    ElMessage.success('学期设置已保存')
    saveConfirmVisible.value = false
  } catch (e) {
    ElMessage.error('保存失败：' + (e.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

function showResetDialog(type) {
  if (type === 'audit-logs') {
    clearAuditDialogVisible.value = true
    return
  }
  
  resetType.value = type
  confirmInput.value = ''
  dialogVisible.value = true
}

async function handleReset() {
  const expectedTextMap = {
    majors: '清空专业',
    colleges: '清空学院',
    levels: '清空层次',
    courses: '清空课程',
    textbooks: '清空教材',
    classes: '清空班级',
    plans: '清空培养方案',
    settings: '系统重置',
  }
  
  if (confirmInput.value !== expectedTextMap[resetType.value]) {
    ElMessage.error('确认文字不正确')
    return
  }

  resetting.value = true
  try {
    const endpoints = {
      majors: '/settings/reset/majors',
      colleges: '/settings/reset/colleges',
      levels: '/settings/reset/levels',
      courses: '/settings/reset/courses',
      textbooks: '/settings/reset/textbooks',
      classes: '/settings/reset/classes',
      plans: '/settings/reset/plans',
      settings: '/settings/reset/settings',
    }

    await request.post(endpoints[resetType.value])
    ElMessage.success(`${expectedTextMap[resetType.value]}成功`)
    dialogVisible.value = false

    if (resetType.value === 'settings') {
      await load()
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    resetting.value = false
  }
}

async function handleClearAuditLogs() {
  resetting.value = true
  try {
    await request.post('/settings/reset/audit-logs')
    ElMessage.success('操作日志已清空')
    clearAuditDialogVisible.value = false
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '清空失败')
  } finally {
    resetting.value = false
  }
}

onMounted(() => {
  load()
})
</script>

<style scoped>
.settings-page {
  padding: 20px;
}

.page-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.hero-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hero-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
}

.hero-text h1 {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
}

.hero-text p {
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
}

.hero-actions {
  display: flex;
  gap: 12px;
}

.hero-actions :deep(.el-button) {
  background: rgba(255, 255, 255, 0.9);
  border-color: transparent;
  color: #667eea;
}

.hero-actions :deep(.el-button:hover) {
  background: white;
  color: #764ba2;
}
</style>
