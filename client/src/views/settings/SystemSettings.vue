<template>
  <div class="settings-page">
    <!-- ==================== 区域一：页面标题栏 ==================== -->
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

    <!-- ==================== 区域二：学期配置（常规操作区） ==================== -->
    <el-card class="semester-card" shadow="never">
      <template #header>
        <div class="card-title-row">
          <span class="card-dot dot-blue"></span>
          <span class="card-title-text">学期配置</span>
          <el-tag size="small" type="info" effect="plain">常规设置</el-tag>
        </div>
      </template>

      <div class="semester-body">
        <!-- 左侧：选择器 -->
        <div class="semester-selector">
          <label class="field-label">选择当前学期</label>
          <el-select
            v-model="form.current_semester"
            placeholder="请选择当前学期"
            size="large"
            filterable
            class="semester-select"
          >
            <el-option
              v-for="sem in availableSemesters"
              :key="sem.value"
              :label="sem.label"
              :value="sem.value"
            >
              <div class="semester-option">
                <span class="option-year">{{ sem.label.split('学年')[0] }}学年</span>
                <el-tag size="small" :type="sem.value.includes('-1') ? 'warning' : 'success'" effect="plain">
                  {{ sem.value.includes('-1') ? '秋季' : '春季' }}
                </el-tag>
              </div>
            </el-option>
          </el-select>

          <div class="semester-hint">
            <el-icon><InfoFilled /></el-icon>
            <span>用于计算班级年级、查询当前学期开课情况。建议每学期初更新。</span>
          </div>
        </div>

        <!-- 右侧：学期预览 -->
        <div class="semester-preview" v-if="currentSemesterPreview">
          <div class="preview-badge">当前设置</div>
          <div class="preview-main">
            <div class="preview-year">{{ currentSemesterPreview.yearRange }}</div>
            <div class="preview-detail">
              <el-tag
                :type="currentSemesterPreview.season === '秋季' ? 'warning' : 'success'"
                effect="dark"
                size="large"
                round
              >
                {{ currentSemesterPreview.season }}
              </el-tag>
              <span class="preview-semester-index">第{{ currentSemesterPreview.index }}学期</span>
            </div>
          </div>
          <div class="preview-footer" v-if="!isCurrentSemesterSaved">
            <el-icon><Warning /></el-icon>
            <span>尚未保存</span>
          </div>
          <div class="preview-footer saved" v-else>
            <el-icon><CircleCheck /></el-icon>
            <span>已生效</span>
          </div>
        </div>
        <div class="semester-preview empty" v-else>
          <el-icon :size="48"><Calendar /></el-icon>
          <p>请选择学期后查看预览</p>
        </div>
      </div>

      <div class="semester-actions">
        <el-button type="primary" size="large" @click="handleSave" :loading="saving">
          <el-icon><Check /></el-icon>
          保存设置
        </el-button>
      </div>
    </el-card>

    <!-- ==================== 区域三：数据管理（危险操作区） ==================== -->
    <el-card class="danger-card" shadow="never">
      <template #header>
        <div class="card-title-row">
          <span class="card-dot dot-red"></span>
          <span class="card-title-text danger-text">数据管理</span>
          <el-tag size="small" type="danger" effect="plain">危险操作</el-tag>
        </div>
      </template>

      <!-- 顶部警告横幅 -->
      <div class="danger-banner">
        <div class="banner-icon">
          <el-icon :size="22"><WarningFilled /></el-icon>
        </div>
        <div class="banner-text">
          <strong>以下操作将永久删除数据且不可恢复。</strong>
          <span>请务必提前备份重要数据，按推荐顺序执行清理。</span>
        </div>
      </div>

      <!-- 数据清理分组 Tab -->
      <el-tabs v-model="activeResetTab" class="reset-tabs">
        <!-- Tab 1: 基础数据 -->
        <el-tab-pane name="basic">
          <template #label>
            <span class="tab-label">
              <el-icon><Grid /></el-icon>
              基础数据
            </span>
          </template>

          <div class="reset-group-desc">
            清空基础数据表（班级、课程、教材、专业、学院、层次），请按推荐顺序执行。
          </div>

          <div class="reset-grid">
            <!-- 班级 -->
            <div class="reset-item" :class="{ 'is-primary': true }">
              <div class="reset-item-icon">
                <el-icon :size="22"><User /></el-icon>
              </div>
              <div class="reset-item-info">
                <div class="reset-item-name">清空班级</div>
                <div class="reset-item-desc">仅删除班级数据，不影响其他数据。这是第一步。</div>
              </div>
              <div class="reset-item-action">
                <el-button type="danger" plain size="small" @click="showResetDialog('classes')" :loading="resetting">
                  清空
                </el-button>
              </div>
            </div>

            <!-- 课程 -->
            <div class="reset-item">
              <div class="reset-item-icon">
                <el-icon :size="22"><Reading /></el-icon>
              </div>
              <div class="reset-item-info">
                <div class="reset-item-name">清空课程</div>
                <div class="reset-item-desc">级联清空培养方案中的课程安排</div>
              </div>
              <div class="reset-item-action">
                <el-button type="warning" plain size="small" @click="showResetDialog('courses')" :loading="resetting">
                  清空
                </el-button>
              </div>
            </div>

            <!-- 教材 -->
            <div class="reset-item">
              <div class="reset-item-icon">
                <el-icon :size="22"><Notebook /></el-icon>
              </div>
              <div class="reset-item-info">
                <div class="reset-item-name">清空教材</div>
                <div class="reset-item-desc">级联清空培养方案中的教材关联</div>
              </div>
              <div class="reset-item-action">
                <el-button type="warning" plain size="small" @click="showResetDialog('textbooks')" :loading="resetting">
                  清空
                </el-button>
              </div>
            </div>

            <!-- 专业 -->
            <div class="reset-item">
              <div class="reset-item-icon">
                <el-icon :size="22"><Collection /></el-icon>
              </div>
              <div class="reset-item-info">
                <div class="reset-item-name">清空专业</div>
                <div class="reset-item-desc">需先清空班级。级联清空所有培养方案</div>
              </div>
              <div class="reset-item-action">
                <el-button type="info" plain size="small" @click="showResetDialog('majors')" :loading="resetting">
                  清空
                </el-button>
              </div>
            </div>

            <!-- 学院 -->
            <div class="reset-item">
              <div class="reset-item-icon">
                <el-icon :size="22"><OfficeBuilding /></el-icon>
              </div>
              <div class="reset-item-info">
                <div class="reset-item-name">清空学院</div>
                <div class="reset-item-desc">需先清空班级。级联清空所有培养方案</div>
              </div>
              <div class="reset-item-action">
                <el-button type="info" plain size="small" @click="showResetDialog('colleges')" :loading="resetting">
                  清空
                </el-button>
              </div>
            </div>

            <!-- 层次 -->
            <div class="reset-item">
              <div class="reset-item-icon">
                <el-icon :size="22"><Rank /></el-icon>
              </div>
              <div class="reset-item-info">
                <div class="reset-item-name">清空层次</div>
                <div class="reset-item-desc">需先清空班级。级联清空所有培养方案</div>
              </div>
              <div class="reset-item-action">
                <el-button type="info" plain size="small" @click="showResetDialog('levels')" :loading="resetting">
                  清空
                </el-button>
              </div>
            </div>
          </div>

          <!-- 推荐顺序提示 -->
          <el-alert
            type="info"
            :closable="false"
            show-icon
            class="order-tip"
          >
            <template #title>
              推荐清理顺序：班级 → 课程 / 教材 → 培养方案 → 专业 / 学院 / 层次
            </template>
          </el-alert>
        </el-tab-pane>

        <!-- Tab 2: 培养方案 -->
        <el-tab-pane name="plans">
          <template #label>
            <span class="tab-label">
              <el-icon><Document /></el-icon>
              培养方案
            </span>
          </template>

          <div class="reset-group-desc">
            清空所有培养方案及其关联数据（课程安排、教材关联），不影响基础数据。
          </div>

          <div class="reset-single-card">
            <div class="reset-single-icon">
              <el-icon :size="32"><Delete /></el-icon>
            </div>
            <div class="reset-single-body">
              <h4>清空所有培养方案</h4>
              <p>包括培养方案主表、课程安排、教材关联数据。基础数据（课程/教材/班级等）不受影响。</p>
            </div>
            <div class="reset-single-action">
              <el-button type="danger" @click="showResetDialog('plans')" :loading="resetting">
                <el-icon><Delete /></el-icon>
                清空培养方案
              </el-button>
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab 3: 系统重置 -->
        <el-tab-pane name="system">
          <template #label>
            <span class="tab-label">
              <el-icon><Setting /></el-icon>
              系统重置
            </span>
          </template>

          <div class="reset-group-desc">
            将系统恢复到初始化状态，清空所有业务数据但保留用户账号。此操作不可恢复！
          </div>

          <div class="reset-single-card warning">
            <div class="reset-single-icon">
              <el-icon :size="32"><WarningFilled /></el-icon>
            </div>
            <div class="reset-single-body">
              <h4>系统重置（恢复初始状态）</h4>
              <p>清空所有业务数据（班级、培养方案、课程、教材、专业、学院、培养层次、系统设置、操作日志），仅保留用户账号。</p>
              <p class="highlight-text">适用场景：更换测试环境、重新导入数据、系统初始化调试</p>
            </div>
            <div class="reset-single-action">
              <el-button type="danger" @click="showResetDialog('settings')" :loading="resetting">
                <el-icon><Delete /></el-icon>
                系统重置
              </el-button>
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab 4: 操作日志 -->
        <el-tab-pane name="logs">
          <template #label>
            <span class="tab-label">
              <el-icon><DocumentChecked /></el-icon>
              操作日志
            </span>
          </template>

          <div class="reset-group-desc">
            清空所有操作日志记录，释放存储空间。此操作不影响业务数据。
          </div>

          <div class="reset-single-card">
            <div class="reset-single-icon">
              <el-icon :size="32"><Delete /></el-icon>
            </div>
            <div class="reset-single-body">
              <h4>清空操作日志</h4>
              <p>删除所有审计日志记录。此操作不可恢复，但不会影响任何业务数据。</p>
            </div>
            <div class="reset-single-action">
              <el-button type="danger" @click="showResetDialog('audit-logs')" :loading="resetting">
                <el-icon><Delete /></el-icon>
                清空操作日志
              </el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- ==================== 二次确认弹窗（复杂操作） ==================== -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="480px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="confirm-dialog">
        <!-- 不可恢复警告 -->
        <div class="confirm-alert">
          <el-icon :size="20"><WarningFilled /></el-icon>
          <span>此操作不可恢复，请谨慎执行！</span>
        </div>

        <!-- 操作描述 -->
        <div class="confirm-description">
          <p>{{ confirmText }}</p>
        </div>

        <!-- 级联影响 -->
        <el-alert
          v-if="cascadeInfo"
          :title="'级联影响：' + cascadeInfo"
          type="warning"
          :closable="false"
          show-icon
          class="confirm-cascade"
        />

        <!-- 确认输入 -->
        <div class="confirm-input-area">
          <label>请输入 <strong>{{ expectedConfirmText }}</strong> 以确认操作：</label>
          <el-input
            v-model="confirmInput"
            :placeholder="'请输入：' + expectedConfirmText"
            size="large"
            clearable
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false" size="large">取消</el-button>
        <el-button
          type="danger"
          size="large"
          @click="handleReset"
          :loading="resetting"
          :disabled="!canConfirm"
        >
          <el-icon><WarningFilled /></el-icon>
          确认清空
        </el-button>
      </template>
    </el-dialog>

    <!-- ==================== 清空操作日志确认弹窗（简单） ==================== -->
    <el-dialog
      v-model="clearAuditDialogVisible"
      title="清空操作日志"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-alert
        title="此操作不可恢复！"
        type="error"
        :closable="false"
        show-icon
      />
      <p class="confirm-text">确定要清空所有操作日志吗？此操作将永久删除所有日志记录。</p>
      <template #footer>
        <el-button @click="clearAuditDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleClearAuditLogs" :loading="resetting">
          确认清空
        </el-button>
      </template>
    </el-dialog>

    <!-- ==================== 保存设置确认弹窗 ==================== -->
    <el-dialog
      v-model="saveConfirmVisible"
      title="确认保存"
      width="450px"
      :close-on-click-modal="false"
    >
      <p class="confirm-text">确定要保存当前学期设置吗？</p>
      <template #footer>
        <el-button @click="saveConfirmVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSave" :loading="saving">
          确认保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useSettingsStore } from '../../stores/settings'
import request from '../../utils/request'

const settingsStore = useSettingsStore()
const saving = ref(false)
const resetting = ref(false)
const form = ref({
  current_semester: '',
})
const activeResetTab = ref('basic')

// 对话框
const dialogVisible = ref(false)
const resetType = ref('')
const confirmInput = ref('')
const clearAuditDialogVisible = ref(false)
const saveConfirmVisible = ref(false)

// 生成可选学期列表
function generateAvailableSemesters() {
  const currentYear = new Date().getFullYear()
  const semesters = []
  for (let y = currentYear - 3; y <= currentYear + 3; y++) {
    semesters.push(
      { value: `${y}-${y + 1}-1`, label: `${y}-${y + 1}学年 秋季(第1学期)` },
      { value: `${y}-${y + 1}-2`, label: `${y}-${y + 1}学年 春季(第2学期)` }
    )
  }
  return semesters
}

const availableSemesters = ref(generateAvailableSemesters())

// 学期预览
const currentSemesterPreview = computed(() => {
  if (!form.value.current_semester) return null
  const parts = form.value.current_semester.split('-')
  const season = parts[2] === '1' ? '秋季' : '春季'
  return {
    yearRange: `${parts[0]} - ${parts[1]} 学年`,
    season,
    index: parts[2]
  }
})

const isCurrentSemesterSaved = ref(false)

// 确认文字映射
const confirmTextMap = {
  majors: '将永久删除所有专业数据，级联清空相关培养方案。',
  colleges: '将永久删除所有学院数据，级联清空相关培养方案。',
  levels: '将永久删除所有培养层次数据，级联清空相关培养方案。',
  courses: '将永久删除所有课程数据，级联清空培养方案中的课程安排。',
  textbooks: '将永久删除所有教材数据，级联清空培养方案中的教材关联。',
  classes: '将永久删除所有班级数据。',
  plans: '将永久删除所有培养方案及其课程安排、教材关联数据。',
  settings: '将系统恢复到初始化状态，清空所有业务数据（班级、培养方案、课程、教材、专业、学院、培养层次、系统设置、操作日志），仅保留用户账号。此操作不可恢复！',
  'audit-logs': '将永久删除所有操作日志记录。'
}

const confirmText = computed(() => confirmTextMap[resetType.value] || '')

// 级联影响
const cascadeInfoMap = {
  majors: '清空专业将同时清空所有培养方案，班级数据存在时将阻止操作',
  colleges: '清空学院将同时清空所有培养方案，班级数据存在时将阻止操作',
  levels: '清空层次将同时清空所有培养方案，班级数据存在时将阻止操作',
  courses: '清空课程将同时清空培养方案中的课程安排',
  textbooks: '清空教材将同时清空培养方案中的教材关联',
  classes: null,
  plans: null,
  settings: null,
  'audit-logs': null
}

const cascadeInfo = computed(() => cascadeInfoMap[resetType.value] || null)

// 期望的确认文字
const expectedTextMap = {
  majors: '清空专业',
  colleges: '清空学院',
  levels: '清空层次',
  courses: '清空课程',
  textbooks: '清空教材',
  classes: '清空班级',
  plans: '清空培养方案',
  settings: '系统重置',
  'audit-logs': '清空操作日志'
}

const expectedConfirmText = computed(() => expectedTextMap[resetType.value] || '')
const dialogTitle = computed(() => `确认 ${expectedConfirmText.value}`)

const canConfirm = computed(() => {
  return confirmInput.value === expectedConfirmText.value
})

async function load() {
  await settingsStore.load()
  const s = settingsStore.settings
  form.value.current_semester = s.current_semester?.value || ''
  isCurrentSemesterSaved.value = !!form.value.current_semester
}

function handleSave() {
  saveConfirmVisible.value = true
}

async function confirmSave() {
  saving.value = true
  try {
    await settingsStore.save(form.value)
    isCurrentSemesterSaved.value = true
    ElMessage.success('学期设置已保存')
    saveConfirmVisible.value = false
  } catch (e) {
    ElMessage.error('保存失败：' + (e.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

function showResetDialog(type) {
  // 操作日志使用简单对话框
  if (type === 'audit-logs') {
    clearAuditDialogVisible.value = true
    return
  }
  
  resetType.value = type
  confirmInput.value = ''
  dialogVisible.value = true
}

async function handleReset() {
  if (!canConfirm.value) {
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
      'audit-logs': '/settings/reset/audit-logs'
    }

    await request.post(endpoints[resetType.value])
    ElMessage.success(`${expectedConfirmText.value}成功`)
    dialogVisible.value = false

    if (resetType.value === 'settings') {
      await load()
    }
  } catch (error) {
    ElMessage.error('操作失败：' + (error.message || '未知错误'))
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
    ElMessage.error('清空操作日志失败：' + (error.message || '未知错误'))
  } finally {
    resetting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
/* ==================== 全局 ==================== */
.settings-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ==================== 区域一：页面标题栏 ==================== */
.page-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.hero-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hero-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.hero-text h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1d2129;
  line-height: 1.3;
}

.hero-text p {
  margin: 4px 0 0;
  font-size: 14px;
  color: #86909c;
}

.hero-actions {
  display: flex;
  gap: 10px;
}

/* ==================== 通用卡片样式 ==================== */
.card-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-blue {
  background: #409eff;
  box-shadow: 0 0 6px rgba(64, 158, 255, 0.4);
}

.dot-red {
  background: #f56c6c;
  box-shadow: 0 0 6px rgba(245, 108, 108, 0.4);
}

.card-title-text {
  font-size: 16px;
  font-weight: 700;
  color: #1d2129;
}

.card-title-text.danger-text {
  color: #f56c6c;
}

/* ==================== 区域二：学期配置 ==================== */
.semester-card {
  border: 1px solid #e5e6eb;
  border-radius: 12px;
}

.semester-card :deep(.el-card__header) {
  padding: 16px 24px;
  border-bottom: 1px solid #f2f3f5;
  background: #fafbfc;
}

.semester-card :deep(.el-card__body) {
  padding: 0;
}

.semester-body {
  display: flex;
  gap: 32px;
  padding: 24px;
}

.semester-selector {
  flex: 1;
  min-width: 0;
}

.field-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 10px;
}

.semester-select {
  width: 100%;
}

.semester-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.option-year {
  font-weight: 500;
}

.semester-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 14px;
  padding: 12px 14px;
  background: #f0f7ff;
  border-radius: 8px;
  font-size: 13px;
  color: #4e5969;
  line-height: 1.6;
}

.semester-hint .el-icon {
  color: #409eff;
  flex-shrink: 0;
  margin-top: 1px;
}

/* 学期预览卡片 */
.semester-preview {
  width: 240px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #ecf5ff 0%, #d9ecff 100%);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px dashed #409eff;
  position: relative;
}

.semester-preview.empty {
  background: #f7f8fa;
  border-color: #e5e6eb;
  color: #c9cdd4;
}

.semester-preview.empty p {
  margin: 0;
  font-size: 13px;
}

.preview-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: #409eff;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 12px;
  border-radius: 10px;
}

.preview-main {
  text-align: center;
}

.preview-year {
  font-size: 18px;
  font-weight: 700;
  color: #1d2129;
  margin-bottom: 8px;
}

.preview-detail {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-semester-index {
  font-size: 13px;
  color: #86909c;
}

.preview-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #e6a23c;
}

.preview-footer.saved {
  color: #67c23a;
}

.semester-actions {
  padding: 0 24px 20px;
}

/* ==================== 区域三：数据管理 ==================== */
.danger-card {
  border: 1px solid #fde2e2;
  border-radius: 12px;
}

.danger-card :deep(.el-card__header) {
  padding: 16px 24px;
  border-bottom: 1px solid #fde2e2;
  background: #fef8f8;
}

.danger-card :deep(.el-card__body) {
  padding: 0;
}

/* 顶部警告横幅 */
.danger-banner {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 24px;
  background: linear-gradient(135deg, #fef0f0 0%, #fde8e8 100%);
  border-bottom: 1px solid #fde2e2;
}

.banner-icon {
  color: #f56c6c;
  flex-shrink: 0;
  margin-top: 1px;
}

.banner-text {
  font-size: 14px;
  color: #4e5969;
  line-height: 1.7;
}

.banner-text strong {
  color: #f56c6c;
  display: block;
  margin-bottom: 2px;
}

/* Tab 样式 */
.reset-tabs {
  padding: 0 24px;
}

.reset-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.reset-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.reset-group-desc {
  padding: 16px 0 8px;
  font-size: 14px;
  color: #86909c;
  line-height: 1.6;
}

/* 重置项网格（基础数据） */
.reset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px 0;
}

.reset-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #fafbfc;
  border: 1px solid #f2f3f5;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.reset-item:hover {
  background: #fff;
  border-color: #e5e6eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.reset-item.is-primary {
  background: #f0f7ff;
  border-color: #c9e0ff;
}

.reset-item-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #f2f3f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #86909c;
  flex-shrink: 0;
}

.reset-item.is-primary .reset-item-icon {
  background: #e8f3ff;
  color: #409eff;
}

.reset-item-info {
  flex: 1;
  min-width: 0;
}

.reset-item-name {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 4px;
}

.reset-item-desc {
  font-size: 12px;
  color: #86909c;
  line-height: 1.5;
}

.reset-item-action {
  flex-shrink: 0;
}

/* 推荐顺序提示 */
.order-tip {
  margin: 4px 0 20px;
}

/* 单项重置卡片（培养方案、系统设置、日志） */
.reset-single-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  margin: 16px 0 8px;
  background: #fafbfc;
  border: 1px solid #f2f3f5;
  border-radius: 12px;
}

.reset-single-card.warning {
  background: #fff7e6;
  border-color: #ffd591;
}

.reset-single-icon {
  width: 60px;
  height: 60px;
  border-radius: 14px;
  background: #fef0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f56c6c;
  flex-shrink: 0;
}

.reset-single-body {
  flex: 1;
}

.reset-single-body h4 {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
}

.reset-single-body p {
  margin: 0;
  font-size: 13px;
  color: #86909c;
  line-height: 1.6;
}

.reset-single-body p.highlight-text {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(255, 107, 107, 0.1);
  border-left: 3px solid #ff6b6b;
  color: #ff6b6b;
  font-weight: 500;
  font-size: 12px;
}

.reset-single-action {
  flex-shrink: 0;
}

/* ==================== 简单确认文本 ==================== */
.confirm-text {
  margin: 16px 0 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

/* ==================== 确认弹窗 ==================== */
.confirm-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.confirm-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 8px;
  color: #f56c6c;
  font-size: 14px;
  font-weight: 600;
}

.confirm-description p {
  margin: 0;
  font-size: 14px;
  color: #4e5969;
  line-height: 1.6;
}

.confirm-cascade {
  margin: 0;
}

.confirm-input-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.confirm-input-area label {
  font-size: 13px;
  color: #4e5969;
}

.confirm-input-area strong {
  color: #f56c6c;
}

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
  .settings-page {
    padding: 16px;
    gap: 16px;
  }

  .page-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-actions {
    width: 100%;
  }

  .hero-actions a {
    flex: 1;
  }

  .hero-actions .el-button {
    width: 100%;
  }

  .semester-body {
    flex-direction: column;
    padding: 16px;
  }

  .semester-preview {
    width: 100%;
  }

  .semester-actions {
    padding: 0 16px 16px;
  }

  .reset-grid {
    grid-template-columns: 1fr;
  }

  .reset-single-card {
    flex-direction: column;
    text-align: center;
  }

  .reset-single-action {
    width: 100%;
  }

  .reset-single-action .el-button {
    width: 100%;
  }

  .reset-tabs {
    padding: 0 12px;
  }

  .danger-banner {
    padding: 12px 16px;
  }
}

@media (max-width: 992px) and (min-width: 769px) {
  .reset-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
