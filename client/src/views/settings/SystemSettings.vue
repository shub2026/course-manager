<template>
  <div class="settings-page">
    <!-- 顶部标题栏 -->
    <el-card class="header-card">
      <div class="page-header">
        <div class="header-left">
          <h2><el-icon><Setting /></el-icon> 系统设置</h2>
          <p class="header-desc">配置系统参数和管理数据重置</p>
        </div>
        <div class="header-right">
          <router-link to="/audit-logs">
            <el-button type="primary" plain>
              <el-icon><DocumentChecked /></el-icon> 查看操作日志
            </el-button>
          </router-link>
        </div>
      </div>
    </el-card>

    <!-- 主内容区 -->
    <el-row :gutter="20" class="main-content">
      <!-- 左侧：功能配置区 -->
      <el-col :xs="24" :sm="24" :md="18" :lg="18">
        <!-- 当前学期设置 -->
        <el-card class="config-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon"><Calendar /></el-icon>
              <span>当前学期配置</span>
            </div>
          </template>
          
          <div class="semester-form">
            <el-form label-width="120px">
              <el-form-item label="选择当前学期">
                <el-select 
                  v-model="form.current_semester" 
                  placeholder="请选择当前学期"
                  size="default"
                  class="semester-select"
                >
                  <el-option 
                    v-for="sem in availableSemesters" 
                    :key="sem.value" 
                    :label="sem.label" 
                    :value="sem.value" 
                  />
                </el-select>
              </el-form-item>
              
              <el-alert
                type="info"
                :closable="false"
                show-icon
                class="form-tip"
              >
                <template #default>
                  用于计算班级年级和查询当前学期开课情况
                </template>
              </el-alert>
              
              <el-form-item>
                <el-button type="primary" @click="handleSave" :loading="saving">
                  <el-icon><Check /></el-icon> 保存设置
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-card>

        <!-- 重置系统 -->
        <el-card class="config-card reset-card" shadow="hover">
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
              <el-button type="danger" plain @click="showResetDialog('classes')" :loading="resetting" class="reset-btn">
                <el-icon><Delete /></el-icon>
                <span>清空班级</span>
              </el-button>
              <el-button type="warning" plain @click="showResetDialog('courses')" :loading="resetting" class="reset-btn">
                <el-icon><Delete /></el-icon>
                <span>清空课程</span>
              </el-button>
              <el-button type="warning" plain @click="showResetDialog('textbooks')" :loading="resetting" class="reset-btn">
                <el-icon><Delete /></el-icon>
                <span>清空教材</span>
              </el-button>
              <el-button type="info" plain @click="showResetDialog('majors')" :loading="resetting" class="reset-btn">
                <el-icon><Delete /></el-icon>
                <span>清空专业</span>
              </el-button>
              <el-button type="info" plain @click="showResetDialog('colleges')" :loading="resetting" class="reset-btn">
                <el-icon><Delete /></el-icon>
                <span>清空学院</span>
              </el-button>
              <el-button type="info" plain @click="showResetDialog('levels')" :loading="resetting" class="reset-btn">
                <el-icon><Delete /></el-icon>
                <span>清空层次</span>
              </el-button>
            </div>
          </div>

          <el-divider />

          <!-- 清空培养方案 -->
          <div class="reset-section">
            <h4 class="section-title">清空培养方案</h4>
            <el-button type="danger" plain @click="showResetDialog('plans')" :loading="resetting" class="reset-btn reset-btn-wide">
              <el-icon><Delete /></el-icon>
              <span>清空培养方案</span>
            </el-button>
          </div>

          <el-divider />

          <!-- 清空系统设置 -->
          <div class="reset-section">
            <h4 class="section-title">清空系统设置</h4>
            <el-alert
              title="清空后将恢复默认配置，需要重新设置当前学期等参数"
              type="warning"
              :closable="false"
              show-icon
              class="cascade-alert"
            />
            <el-button type="danger" plain @click="showResetDialog('settings')" :loading="resetting" class="reset-btn reset-btn-wide" style="margin-top: 12px;">
              <el-icon><Delete /></el-icon>
              <span>清空系统设置</span>
            </el-button>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：帮助说明区 -->
      <el-col :xs="24" :sm="24" :md="6" :lg="6">
        <el-card class="help-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon"><QuestionFilled /></el-icon>
              <span>帮助说明</span>
            </div>
          </template>
          
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
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>
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
/* 页面整体布局 */
.settings-page {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
}

/* 顶部标题卡片 */
.header-card {
  margin-bottom: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.header-left h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-desc {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

/* 主内容区 */
.main-content {
  margin-top: 0;
  align-items: stretch;
}

/* 配置卡片 */
.config-card {
  margin-bottom: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.config-card :deep(.el-card__body) {
  flex: 1;
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

/* 学期配置表单 */
.semester-form {
  padding: 8px 0;
}

.semester-select {
  width: 100%;
  max-width: 400px;
}

.form-tip {
  margin: 16px 0;
}

/* 重置系统卡片 */
.reset-card .card-header {
  color: #f56c6c;
}

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
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

/* 统一重置按钮大小 */
.reset-btn {
  width: 100% !important;
  height: 64px !important;
  min-height: 64px !important;
  max-height: 64px !important;
  padding: 8px 4px !important;
  margin: 0 !important;
  border-radius: 6px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
}

/* 宽按钮（用于单独一行的按钮） */
.reset-btn-wide {
  width: 100% !important;
  max-width: 100% !important;
  height: 36px !important;
  min-height: 36px !important;
  max-height: 36px !important;
  padding: 0 16px !important;
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-start !important;
  text-align: left !important;
}

.cascade-alert {
  margin-top: 8px;
}

/* 帮助卡片 */
.help-card {
  position: sticky;
  top: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.help-card :deep(.el-card__body) {
  flex: 1;
  overflow-y: auto;
}

.help-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.help-tabs :deep(.el-tabs__content) {
  overflow: visible;
}

.help-content {
  padding: 8px 0;
}

.help-item {
  padding: 16px;
  margin-bottom: 16px;
  background: #fff;
  border-radius: 6px;
  border-left: 3px solid #409eff;
  transition: all 0.3s ease;
}

.help-item:last-child {
  margin-bottom: 0;
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
@media (max-width: 768px) {
  .settings-page {
    padding: 12px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .reset-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .reset-btn {
    height: 70px !important;
    min-width: auto !important;
  }
  
  .reset-btn-wide {
    max-width: 100% !important;
  }
  
  .help-card {
    position: static;
    margin-top: 20px;
    height: auto;
  }
}

@media (max-width: 992px) and (min-width: 769px) {
  .main-content {
    flex-direction: column;
  }
  
  .help-card {
    position: static;
    margin-top: 20px;
  }
}
</style>
