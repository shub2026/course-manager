<template>
  <div class="settings-container">
    <!-- 左侧功能模块 -->
    <div class="left-column">
      <!-- 左上：系统设置 -->
      <el-card class="settings-card">
        <template #header>
          <div class="card-header-with-action">
            <span><el-icon><Setting /></el-icon> 系统设置</span>
            <router-link to="/audit-logs">
              <el-button type="primary" size="small">
                <el-icon><DocumentChecked /></el-icon> 查看操作日志
              </el-button>
            </router-link>
          </div>
        </template>
        <el-form :model="form" label-width="140px" class="settings-form">
          <el-form-item label="当前学期">
            <el-select v-model="form.current_semester" placeholder="请选择当前学期" class="full-width">
              <el-option 
                v-for="sem in availableSemesters" 
                :key="sem.value" 
                :label="sem.label" 
                :value="sem.value" 
              />
            </el-select>
            <div class="form-hint">
              <el-icon><InfoFilled /></el-icon>
              用于计算班级年级和查询当前学期开课情况
            </div>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSave" :loading="saving">
              <el-icon><Check /></el-icon> 保存设置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 左下：重置系统 -->
      <el-card class="reset-card">
        <template #header>
          <span class="danger-header"><el-icon><WarningFilled /></el-icon> 重置系统</span>
        </template>
        
        <div class="reset-warning">
          <el-alert
            title="警告：以下操作将永久删除数据，操作前请确保已备份重要数据！"
            type="error"
            :closable="false"
            show-icon
          />
        </div>

        <!-- 基础数据清空区域 -->
        <div class="reset-group">
          <h4 class="reset-group-title">清空基础数据</h4>
          <div class="reset-buttons">
            <el-button type="danger" plain @click="showResetDialog('classes')" :loading="resetting">
              <el-icon><Delete /></el-icon> 清空班级
            </el-button>
            <el-button type="warning" plain @click="showResetDialog('courses')" :loading="resetting">
              <el-icon><Delete /></el-icon> 清空课程
            </el-button>
            <el-button type="warning" plain @click="showResetDialog('textbooks')" :loading="resetting">
              <el-icon><Delete /></el-icon> 清空教材
            </el-button>
            <el-button type="info" plain @click="showResetDialog('majors')" :loading="resetting">
              <el-icon><Delete /></el-icon> 清空专业
            </el-button>
            <el-button type="info" plain @click="showResetDialog('colleges')" :loading="resetting">
              <el-icon><Delete /></el-icon> 清空学院
            </el-button>
            <el-button type="info" plain @click="showResetDialog('levels')" :loading="resetting">
              <el-icon><Delete /></el-icon> 清空层次
            </el-button>
          </div>
        </div>

        <el-divider />

        <!-- 培养方案清空 -->
        <div class="reset-group">
          <h4 class="reset-group-title">清空培养方案</h4>
          <div class="reset-buttons">
            <el-button type="danger" plain @click="showResetDialog('plans')" :loading="resetting">
              <el-icon><Delete /></el-icon> 清空培养方案
            </el-button>
          </div>
        </div>

        <el-divider />

        <!-- 系统设置清空 -->
        <div class="reset-group">
          <h4 class="reset-group-title">清空系统设置</h4>
          <div class="reset-buttons">
            <el-button type="danger" plain @click="showResetDialog('settings')" :loading="resetting">
              <el-icon><Delete /></el-icon> 清空系统设置
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 右侧操作指南 -->
    <div class="right-column">
      <!-- 右上：系统设置说明 -->
      <el-card class="guide-card semester-guide">
        <template #header>
          <span class="guide-header"><el-icon><Reading /></el-icon> 系统设置说明</span>
        </template>

        <div class="guide-content">
          <div class="tip-item tip-primary">
            <div class="tip-icon">📅</div>
            <div class="tip-content">
              <strong>当前学期设置说明</strong>
              <p>系统设置中的"当前学期"用于：</p>
              <ul class="feature-list">
                <li>自动计算班级的在读年级和学期</li>
                <li>确定培养方案中哪些课程在当前学期开课</li>
                <li>查询和导出当前学期的开课情况和教材使用情况</li>
              </ul>
              <p class="highlight-tip">建议每学期开始时更新此设置，确保数据准确。</p>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 右下：重置系统说明 -->
      <el-card class="guide-card reset-guide">
        <template #header>
          <span class="guide-header"><el-icon><Reading /></el-icon> 重置系统说明</span>
        </template>

        <div class="guide-content">
          <div class="tip-item tip-warning">
            <div class="tip-icon">⚠️</div>
            <div class="tip-content">
              <strong>重要提醒</strong>
              <p>所有清空操作都不可恢复，请务必提前备份重要数据！</p>
            </div>
          </div>

          <div class="tip-item">
            <div class="tip-icon">📋</div>
            <div class="tip-content">
              <strong>前置条件检查</strong>
              <p>清空专业、学院或层次前，必须先清空班级数据，否则操作将被阻止。</p>
            </div>
          </div>

          <div class="tip-item">
            <div class="tip-icon">🔢</div>
            <div class="tip-content">
              <strong>推荐的清空顺序</strong>
              <ol class="reset-order">
                <li><span class="step-highlight">清空班级</span>（最底层，无依赖）</li>
                <li><span class="step-highlight">清空课程 / 教材</span>（独立于班级）</li>
                <li><span class="step-highlight">清空培养方案</span></li>
                <li><span class="step-highlight">清空专业 / 学院 / 层次</span>（此时已无班级依赖）</li>
              </ol>
            </div>
          </div>

          <div class="tip-item">
            <div class="tip-icon">ℹ️</div>
            <div class="tip-content">
              <strong>按钮颜色说明</strong>
              <ul class="color-legend">
                <li><span class="color-dot color-danger"></span>红色：最高优先级，建议最先操作</li>
                <li><span class="color-dot color-warning"></span>橙色：中等优先级，可独立操作</li>
                <li><span class="color-dot color-info"></span>灰色：需要满足前置条件</li>
              </ul>
            </div>
          </div>

          <div class="tip-item tip-info">
            <div class="tip-icon">💡</div>
            <div class="tip-content">
              <strong>级联影响</strong>
              <p>清空课程时会同时清空培养方案中的课程安排；清空教材时会清空培养方案中的教材关联。</p>
            </div>
          </div>

          <div class="tip-item tip-success">
            <div class="tip-icon">✅</div>
            <div class="tip-content">
              <strong>操作日志</strong>
              <p>所有重置操作都会记录在操作日志中，可在<router-link to="/audit-logs">操作日志</router-link>页面查看历史记录。</p>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>

  <!-- 二次确认对话框 -->
  <el-dialog
    v-model="dialogVisible"
    title="确认重置操作"
    width="500px"
    :close-on-click-modal="false"
  >
    <div class="dialog-content">
      <el-alert
        title="此操作不可恢复！"
        type="error"
        :closable="false"
        show-icon
      />
      <p class="confirm-text">{{ confirmText }}</p>
      
      <!-- 级联影响提示 -->
      <el-alert
        v-if="cascadeInfo"
        :title="cascadeInfo"
        type="warning"
        :closable="false"
        show-icon
        class="cascade-alert"
      />
      
      <el-input
        v-model="confirmInput"
        placeholder="请输入确认文字"
        class="confirm-input"
      />
    </div>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button 
        type="danger" 
        @click="handleReset"
        :loading="resetting"
        :disabled="!canConfirm"
      >
        确认重置
      </el-button>
    </template>
  </el-dialog>
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

// 对话框相关
const dialogVisible = ref(false)
const resetType = ref('')
const confirmInput = ref('')

// 生成可选学期列表(前后各3年)
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

// 确认文字映射
const confirmTextMap = {
  majors: '请输入"清空专业"以确认操作',
  colleges: '请输入"清空学院"以确认操作',
  levels: '请输入"清空层次"以确认操作',
  courses: '请输入"清空课程"以确认操作',
  textbooks: '请输入"清空教材"以确认操作',
  classes: '请输入"清空班级"以确认操作',
  plans: '请输入"清空培养方案"以确认操作',
  settings: '请输入"清空系统设置"以确认操作'
}

const confirmText = computed(() => confirmTextMap[resetType.value] || '')

// 级联影响说明
const cascadeInfoMap = {
  majors: '此操作将同时清空所有培养方案，如果存在班级数据将阻止操作',
  colleges: '此操作将同时清空所有培养方案，如果存在班级数据将阻止操作',
  levels: '此操作将同时清空所有培养方案，如果存在班级数据将阻止操作',
  courses: '此操作将同时清空培养方案中的课程安排',
  textbooks: '此操作将同时清空培养方案中的教材关联',
  classes: '此操作仅清空班级数据，不影响其他数据',
  plans: '此操作仅清空培养方案，不影响基础数据',
  settings: '此操作仅清空系统设置，清空后需要重新配置'
}

const cascadeInfo = computed(() => cascadeInfoMap[resetType.value] || '')

const canConfirm = computed(() => {
  const expectedText = {
    majors: '清空专业',
    colleges: '清空学院',
    levels: '清空层次',
    courses: '清空课程',
    textbooks: '清空教材',
    classes: '清空班级',
    plans: '清空培养方案',
    settings: '清空系统设置'
  }
  return confirmInput.value === expectedText[resetType.value]
})

async function load() {
  await settingsStore.load()
  const s = settingsStore.settings
  form.value.current_semester = s.current_semester?.value || ''
}

async function handleSave() {
  saving.value = true
  try {
    await settingsStore.save(form.value)
    ElMessage.success('设置已保存')
  } finally {
    saving.value = false
  }
}

function showResetDialog(type) {
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
      settings: '/settings/reset/settings'
    }

    await request.post(endpoints[resetType.value])
    ElMessage.success('重置成功')
    dialogVisible.value = false

    // 如果是清空设置，需要重新加载
    if (resetType.value === 'settings') {
      await load()
    }
  } catch (error) {
    ElMessage.error('重置失败：' + (error.message || '未知错误'))
  } finally {
    resetting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
/* 主容器：田字格布局 */
.settings-container {
  display: grid;
  grid-template-columns: 60% 40%;
  gap: 20px;
  align-items: start;
}

/* 左侧列 */
.left-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 右侧列 */
.right-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 卡片头部带操作按钮 */
.card-header-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

/* 系统设置表单 */
.settings-form {
  max-width: 100%;
}

.form-hint {
  color: #909399;
  font-size: 13px;
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.full-width {
  width: 100%;
}

/* 重置系统警告 */
.reset-warning {
  margin-bottom: 20px;
}

.danger-header {
  color: #f56c6c;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 重置分组 */
.reset-group {
  margin: 16px 0;
}

.reset-group-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
  padding-left: 8px;
  border-left: 3px solid #409eff;
}

.reset-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* 右侧指南卡片 */
.guide-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.guide-card.semester-guide {
  min-height: 280px;
}

.guide-card.reset-guide {
  min-height: 500px;
}

.guide-header {
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 6px;
}

.guide-content {
  flex: 1;
  overflow-y: auto;
}

.tip-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  margin-bottom: 12px;
  background: #fff;
  border-radius: 6px;
  border-left: 3px solid #409eff;
  transition: all 0.3s ease;
}

.tip-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transform: translateX(2px);
}

.tip-item.tip-warning {
  border-left-color: #e6a23c;
  background: #fdf6ec;
}

.tip-item.tip-info {
  border-left-color: #909399;
}

.tip-item.tip-success {
  border-left-color: #67c23a;
  background: #f0f9ff;
}

.tip-item.tip-primary {
  border-left-color: #409eff;
  background: #ecf5ff;
}

.tip-icon {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
}

.tip-content {
  flex: 1;
}

.tip-content strong {
  display: block;
  font-size: 14px;
  color: #303133;
  margin-bottom: 6px;
}

.tip-content p {
  margin: 4px 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

/* 清空顺序列表 */
.reset-order {
  margin: 8px 0 0 0;
  padding: 0;
  list-style: none;
}

.reset-order li {
  padding: 4px 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}

.step-highlight {
  display: inline-block;
  padding: 2px 8px;
  background: #ecf5ff;
  border-radius: 3px;
  color: #409eff;
  font-weight: 500;
  margin-right: 4px;
}

/* 功能列表 */
.feature-list {
  margin: 8px 0;
  padding: 0 0 0 18px;
  list-style: disc;
}

.feature-list li {
  padding: 3px 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.highlight-tip {
  margin-top: 8px;
  padding: 8px 12px;
  background: #fef0f0;
  border-left: 3px solid #f56c6c;
  border-radius: 4px;
  color: #f56c6c;
  font-weight: 500;
  font-size: 13px;
}

/* 颜色图例 */
.color-legend {
  margin: 8px 0 0 0;
  padding: 0;
  list-style: none;
}

.color-legend li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
  color: #606266;
}

.color-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}

.color-danger {
  background: #f56c6c;
}

.color-warning {
  background: #e6a23c;
}

.color-info {
  background: #909399;
}

/* 对话框样式 */
.dialog-content {
  padding: 10px 0;
}

.confirm-text {
  margin: 20px 0 10px;
  color: #606266;
  font-size: 14px;
}

.cascade-alert {
  margin: 15px 0;
}

.confirm-input {
  margin-top: 10px;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .settings-container {
    grid-template-columns: 1fr;
  }
  
  .left-column,
  .right-column {
    width: 100%;
  }
}
</style>
