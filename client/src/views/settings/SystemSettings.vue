<template>
  <div class="settings-page">
    <!-- 顶部标题栏 -->
    <div class="page-header">
      <h2><el-icon><Setting /></el-icon> 系统设置</h2>
      <router-link to="/audit-logs">
        <el-button type="primary" plain>
          <el-icon><DocumentChecked /></el-icon> 查看操作日志
        </el-button>
      </router-link>
    </div>

    <!-- 主内容区：左右分栏 -->
    <div class="settings-layout">
      <!-- 左侧：功能配置区 -->
      <div class="config-section">
        <!-- 当前学期设置 -->
        <el-card class="config-card semester-config">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon"><Calendar /></el-icon>
              <span>当前学期配置</span>
            </div>
          </template>
          
          <div class="semester-form">
            <div class="form-row">
              <label class="form-label">选择学期</label>
              <el-select 
                v-model="form.current_semester" 
                placeholder="请选择当前学期"
                class="semester-select"
              >
                <el-option 
                  v-for="sem in availableSemesters" 
                  :key="sem.value" 
                  :label="sem.label" 
                  :value="sem.value" 
                />
              </el-select>
            </div>
            
            <div class="form-tip">
              <el-icon><InfoFilled /></el-icon>
              <span>用于计算班级年级和查询当前学期开课情况</span>
            </div>
            
            <div class="form-actions">
              <el-button type="primary" @click="handleSave" :loading="saving">
                <el-icon><Check /></el-icon> 保存设置
              </el-button>
            </div>
          </div>
        </el-card>

        <!-- 重置系统 -->
        <el-card class="config-card reset-config">
          <template #header>
            <div class="card-header danger">
              <el-icon class="header-icon"><WarningFilled /></el-icon>
              <span>重置系统数据</span>
            </div>
          </template>

          <el-alert
            title="警告：以下操作将永久删除数据且不可恢复！"
            type="error"
            :closable="false"
            show-icon
            class="reset-alert"
          />

          <!-- 清空基础数据 -->
          <div class="reset-section">
            <h4 class="section-title">清空基础数据</h4>
            <div class="reset-grid">
              <el-button type="danger" plain @click="showResetDialog('classes')" :loading="resetting">
                <el-icon><Delete /></el-icon>
                <span>清空班级</span>
              </el-button>
              <el-button type="warning" plain @click="showResetDialog('courses')" :loading="resetting">
                <el-icon><Delete /></el-icon>
                <span>清空课程</span>
              </el-button>
              <el-button type="warning" plain @click="showResetDialog('textbooks')" :loading="resetting">
                <el-icon><Delete /></el-icon>
                <span>清空教材</span>
              </el-button>
              <el-button type="info" plain @click="showResetDialog('majors')" :loading="resetting">
                <el-icon><Delete /></el-icon>
                <span>清空专业</span>
              </el-button>
              <el-button type="info" plain @click="showResetDialog('colleges')" :loading="resetting">
                <el-icon><Delete /></el-icon>
                <span>清空学院</span>
              </el-button>
              <el-button type="info" plain @click="showResetDialog('levels')" :loading="resetting">
                <el-icon><Delete /></el-icon>
                <span>清空层次</span>
              </el-button>
            </div>
          </div>

          <el-divider />

          <!-- 清空培养方案 -->
          <div class="reset-section">
            <h4 class="section-title">清空培养方案</h4>
            <div class="reset-single">
              <el-button type="danger" plain @click="showResetDialog('plans')" :loading="resetting">
                <el-icon><Delete /></el-icon>
                <span>清空培养方案</span>
              </el-button>
            </div>
          </div>

          <el-divider />

          <!-- 清空系统设置 -->
          <div class="reset-section">
            <h4 class="section-title">清空系统设置</h4>
            <div class="reset-single">
              <el-button type="danger" plain @click="showResetDialog('settings')" :loading="resetting">
                <el-icon><Delete /></el-icon>
                <span>清空系统设置</span>
              </el-button>
            </div>
          </div>

          <el-divider />

          <!-- 清空操作日志 -->
          <div class="reset-section">
            <h4 class="section-title">清空操作日志</h4>
            <div class="reset-single">
              <el-button type="danger" plain @click="showResetDialog('audit-logs')" :loading="resetting">
                <el-icon><Delete /></el-icon>
                <span>清空操作日志</span>
              </el-button>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 右侧：帮助说明区 -->
      <div class="help-section">
        <el-tabs v-model="activeHelpTab" class="help-tabs">
          <!-- 学期设置说明 -->
          <el-tab-pane label="学期设置" name="semester">
            <div class="help-content">
              <div class="help-item highlight">
                <div class="help-icon">📅</div>
                <div class="help-text">
                  <h4>当前学期的作用</h4>
                  <ul>
                    <li>自动计算班级的在读年级和学期</li>
                    <li>确定培养方案中哪些课程在当前学期开课</li>
                    <li>查询和导出当前学期的开课情况和教材使用情况</li>
                  </ul>
                  <p class="tip-warning">建议每学期开始时更新此设置</p>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 重置系统说明 -->
          <el-tab-pane label="重置说明" name="reset">
            <div class="help-content">
              <div class="help-item warning">
                <div class="help-icon">⚠️</div>
                <div class="help-text">
                  <h4>重要提醒</h4>
                  <p>所有清空操作都不可恢复，请务必提前备份重要数据！</p>
                </div>
              </div>

              <div class="help-item">
                <div class="help-icon">📋</div>
                <div class="help-text">
                  <h4>前置条件</h4>
                  <p>清空专业、学院或层次前，必须先清空班级数据。</p>
                </div>
              </div>

              <div class="help-item">
                <div class="help-icon">🔢</div>
                <div class="help-text">
                  <h4>推荐顺序</h4>
                  <ol>
                    <li>清空班级（无依赖）</li>
                    <li>清空课程 / 教材</li>
                    <li>清空培养方案</li>
                    <li>清空专业 / 学院 / 层次</li>
                  </ol>
                </div>
              </div>

              <div class="help-item">
                <div class="help-icon">💡</div>
                <div class="help-text">
                  <h4>级联影响</h4>
                  <p>清空课程时会同时清空培养方案中的课程安排；清空教材时会清空培养方案中的教材关联。</p>
                </div>
              </div>

              <div class="help-item success">
                <div class="help-icon">✅</div>
                <div class="help-text">
                  <h4>操作日志</h4>
                  <p>所有重置操作都会记录在操作日志中，可在<router-link to="/audit-logs">操作日志</router-link>页面查看历史记录。</p>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
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
const activeHelpTab = ref('semester')

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
  settings: '请输入"清空系统设置"以确认操作',
  'audit-logs': '请输入"清空操作日志"以确认操作'
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
  settings: '此操作仅清空系统设置，清空后需要重新配置',
  'audit-logs': '此操作将永久删除所有操作日志记录，请谨慎操作'
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
    settings: '清空系统设置',
    'audit-logs': '清空操作日志'
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
      settings: '/settings/reset/settings',
      'audit-logs': '/settings/reset/audit-logs'
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
/* 页面整体布局 */
.settings-page {
  max-width: 1400px;
  margin: 0 auto;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e4e7ed;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 主布局：左右分栏 */
.settings-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
  align-items: start;
}

/* 左侧配置区 */
.config-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.config-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-header.danger {
  color: #f56c6c;
}

.header-icon {
  font-size: 20px;
}

/* 学期配置卡片 */
.semester-form {
  padding: 8px 0;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.form-label {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
  min-width: 80px;
}

.semester-select {
  flex: 1;
  max-width: 450px;
}

.form-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 13px;
  margin-bottom: 20px;
  padding: 10px 12px;
  background: #f4f4f5;
  border-radius: 4px;
}

.form-actions {
  display: flex;
  gap: 12px;
}

/* 重置系统卡片 */
.reset-alert {
  margin-bottom: 20px;
}

.reset-section {
  margin-top: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
  padding-left: 10px;
  border-left: 3px solid #409eff;
}

.reset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.reset-grid .el-button {
  height: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.reset-single {
  display: flex;
}

.reset-single .el-button {
  min-width: 180px;
}

/* 右侧帮助区 */
.help-section {
  position: sticky;
  top: 20px;
}

.help-tabs {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.help-content {
  padding: 16px 8px;
}

.help-item {
  padding: 16px;
  margin-bottom: 16px;
  background: #fff;
  border-radius: 6px;
  border-left: 3px solid #409eff;
  transition: all 0.3s ease;
}

.help-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transform: translateX(2px);
}

.help-item.warning {
  border-left-color: #e6a23c;
  background: #fdf6ec;
}

.help-item.highlight {
  border-left-color: #409eff;
  background: #ecf5ff;
}

.help-item.success {
  border-left-color: #67c23a;
  background: #f0f9ff;
}

.help-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.help-text h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #303133;
}

.help-text p {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.help-text ul,
.help-text ol {
  margin: 8px 0;
  padding-left: 20px;
}

.help-text li {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  margin: 4px 0;
}

.tip-warning {
  margin-top: 12px !important;
  padding: 8px 12px;
  background: #fef0f0;
  border-left: 3px solid #f56c6c;
  border-radius: 4px;
  color: #f56c6c;
  font-weight: 500;
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
  .settings-layout {
    grid-template-columns: 1fr;
  }
  
  .help-section {
    position: static;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .form-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .semester-select {
    width: 100%;
    max-width: none;
  }
  
  .reset-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
