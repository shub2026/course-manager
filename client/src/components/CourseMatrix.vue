<template>
  <div class="matrix-container">
    <!-- 顶部工具栏 -->
    <div class="matrix-toolbar">
      <el-button type="primary" @click="$emit('add-course')">
        <el-icon><Plus /></el-icon> 添加课程
      </el-button>
      <div class="matrix-toolbar-right">
        <span class="total-courses-label">共 {{ allCourses.length }} 门课程</span>
      </div>
    </div>

    <!-- 矩阵表 -->
    <div class="matrix-scroll" v-loading="loading">
      <table class="matrix-table" v-if="rawCourses.length > 0">
        <thead>
          <tr>
            <th class="matrix-fixed-col matrix-course-header">课程名称</th>
            <th
              v-for="s in maxSemester"
              :key="s"
              class="matrix-semester-header"
            >
              第{{ s }}学期
            </th>
            <th class="matrix-total-header">总课时</th>
            <th class="matrix-action-header">操作</th>
          </tr>
        </thead>
        <tbody v-for="group in groups" :key="group.type">
          <!-- 分组标题行 -->
          <tr class="matrix-group-row">
            <td :colspan="maxSemester + 3" class="matrix-group-cell" :class="group.type">
              <span class="group-label">{{ group.label }}</span>
              <span class="group-count">{{ group.courses.length }} 门</span>
            </td>
          </tr>
          <!-- 课程行 -->
          <tr
            v-for="course in group.courses"
            :key="course.id"
            class="matrix-course-row"
          >
            <td class="matrix-fixed-col matrix-course-name">
              <span class="course-name-text">{{ course.courseName }}</span>
              <el-tag
                size="small"
                :type="group.type === 'public' ? 'success' : 'warning'"
                class="course-type-tag"
              >
                {{ group.type === 'public' ? '公共' : '专业' }}
              </el-tag>
            </td>
            <!-- 学期单元格 -->
            <td
              v-for="s in maxSemester"
              :key="s"
              class="matrix-cell"
              :class="cellClass(course, s)"
              @click="openEdit(course, s)"
            >
              <template v-if="isInRange(course, s)">
                <div class="cell-hours">
                  {{ getHours(course, s) || '-' }}
                </div>
                <div class="cell-textbook" v-if="getTextbookName(course, s)">
                  {{ getTextbookName(course, s) }}
                </div>
              </template>
            </td>
            <!-- 总课时 -->
            <td class="matrix-cell matrix-total-cell">
              <strong>{{ calcTotalHours(course) }}</strong>
            </td>
            <!-- 操作按钮 -->
            <td class="matrix-cell matrix-action-cell">
              <div class="action-buttons">
                <el-button 
                  size="small" 
                  :icon="ArrowUp" 
                  :disabled="isFirstInGroup(course, group)"
                  @click="handleMoveUp(course, group)"
                  circle
                  title="上移"
                />
                <el-button 
                  size="small" 
                  :icon="ArrowDown" 
                  :disabled="isLastInGroup(course, group)"
                  @click="handleMoveDown(course, group)"
                  circle
                  title="下移"
                />
                <el-button size="small" @click="openSemesterSettings(course)" title="设置学期">
                  <el-icon><Setting /></el-icon>
                </el-button>
                <el-popconfirm title="确定删除该课程？" @confirm="$emit('delete-course', course)">
                  <template #reference>
                    <el-button size="small" type="danger" title="删除课程">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </template>
                </el-popconfirm>
              </div>
            </td>
          </tr>
          <!-- 分组小计 -->
          <tr class="matrix-subtotal-row">
            <td class="matrix-fixed-col matrix-subtotal-label">小计</td>
            <td
              v-for="s in maxSemester"
              :key="s"
              class="matrix-cell matrix-subtotal-cell"
            >
              {{ calcSemesterSubtotal(group, s) || '-' }}
            </td>
            <td class="matrix-cell matrix-subtotal-cell">
              <strong>{{ calcGroupTotal(group) }}</strong>
            </td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <el-empty v-else description="暂无课程，请添加课程到方案" />
    </div>

    <!-- 底部控制栏：统一学期周数 -->
    <div class="matrix-footer">
      <div class="footer-section">
        <span class="footer-label">学期周数：</span>
        <el-input-number
          v-model="globalWeeks"
          :min="1"
          :max="30"
          size="small"
          controls-position="right"
        />
        <el-button type="primary" size="small" @click="applyGlobalWeeks">
          <el-icon><Check /></el-icon> 应用
        </el-button>
        <span class="footer-hint">统一应用于所有学期</span>
      </div>
      <div class="footer-summary">
        <el-tag type="info" size="large">
          方案总课时：<strong>{{ totalAllHours }}</strong>
        </el-tag>
      </div>
    </div>

    <!-- Popover 编辑卡片 -->
    <el-popover
      ref="editPopover"
      :visible="popoverVisible"
      placement="bottom"
      :width="360"
      trigger="click"
      :teleported="true"
    >
      <template #default>
        <div class="popover-content" v-if="editingSemester">
          <div class="popover-title">
            {{ editingCourse?.courseName }} — 第{{ editingSemester.semester }}学期
          </div>

          <el-form label-width="80px" size="small">
            <el-form-item label="周课时">
              <el-radio-group v-model="editingSemester.weeklyHours" class="full-width">
                <el-radio-button :value="0">0</el-radio-button>
                <el-radio-button :value="2">2</el-radio-button>
                <el-radio-button :value="4">4</el-radio-button>
                <el-radio-button :value="6">6</el-radio-button>
                <el-radio-button :value="8">8</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="关联教材">
              <el-select
                v-model="editingTextbookId"
                filterable
                clearable
                placeholder="选择教材（可选）"
                class="full-width"
                :disabled="editingSemester.weeklyHours === 0"
              >
                <el-option
                  v-for="t in allTextbooks"
                  :key="t.id"
                  :label="`${t.title} (${t.publisher || ''})`"
                  :value="t.id"
                />
              </el-select>
              <div v-if="editingSemester.weeklyHours === 0" class="textbook-disabled-tip">
                周课时为0时不可选择教材
              </div>
            </el-form-item>
          </el-form>

          <div class="popover-actions">
            <el-button size="small" @click="popoverVisible = false">取消</el-button>
            <el-button size="small" type="primary" @click="saveEdit" :loading="saving">
              保存
            </el-button>
          </div>
        </div>
      </template>
    </el-popover>

    <!-- 开课学期设置对话框 -->
    <el-dialog v-model="semesterDialogVisible" title="设置开课学期" width="450px">
      <el-form label-width="100px">
        <el-alert
          :title="`课程：${editingCourseForSemester?.courseName || ''}`"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 16px"
        />
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="起始学期" required>
              <el-input-number v-model="semesterForm.startSemester" :min="1" :max="12" class="full-width" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束学期" required>
              <el-input-number v-model="semesterForm.endSemester" :min="1" :max="12" class="full-width" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-alert
          title="提示：修改后将自动创建或删除对应的学期记录"
          type="warning"
          :closable="false"
          show-icon
        />
      </el-form>
      <template #footer>
        <el-button @click="semesterDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSemesterSettings" :loading="saving">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import {
  getPlanCourses,
  createSemester,
  updateSemester,
  updatePlanCourse,
  setSemesterTextbook,
  removeSemesterTextbook,
  getPlanSemesters,
} from '../api/plan'

const props = defineProps({
  planId: { type: Number, required: true },
  allCourses: { type: Array, default: () => [] },
  allTextbooks: { type: Array, default: () => [] },
})

defineEmits(['add-course', 'delete-course'])

// 状态
const loading = ref(false)
const rawCourses = ref([])
const semesterWeeks = ref([])
const globalWeeks = ref(18)
const popoverVisible = ref(false)
const saving = ref(false)

// 编辑状态
const editingCourse = ref(null)
const editingSemester = ref(null)
const editingTextbookId = ref(null)

// 开课学期设置状态
const semesterDialogVisible = ref(false)
const editingCourseForSemester = ref(null)
const semesterForm = ref({ startSemester: 1, endSemester: 2 })

// 计算最大学期数
const maxSemester = computed(() => {
  if (!rawCourses.value.length) return 8
  const max = Math.max(...rawCourses.value.map(c => c.endSemester), 0)
  return Math.max(max, 8)
})

// 构建学期周数数组（统一值）
function buildSemesterWeeks(planSemesters, courses) {
  let defaultWeeks = 18
  // 优先取第一个课程的 weeksPerSemester
  if (courses.length > 0 && courses[0].weeksPerSemester) {
    defaultWeeks = courses[0].weeksPerSemester
  }
  // 或取学期记录中第一个值
  if (planSemesters.length > 0) {
    defaultWeeks = planSemesters[0].weeksCount || defaultWeeks
  }
  globalWeeks.value = defaultWeeks
  return Array(maxSemester.value).fill(defaultWeeks)
}

// 按类型分组
const groups = computed(() => {
  const map = { public: [], professional: [] }
  rawCourses.value.forEach(c => {
    const type = c.courses?.type || 'public'
    map[type].push({
      id: c.id,
      courseName: c.courses?.name || '未知课程',
      courseCode: c.courses?.code || '',
      startSemester: c.startSemester,
      endSemester: c.endSemester,
      weeklyHours: c.weeklyHours,
      weeksPerSemester: c.weeksPerSemester,
      semesters: c.planCourseSemesters || [],
      sortOrder: c.sortOrder ?? 0,
    })
  })
  
  // 在每个分组内按 sortOrder 排序
  map.public.sort((a, b) => a.sortOrder - b.sortOrder)
  map.professional.sort((a, b) => a.sortOrder - b.sortOrder)
  
  return [
    { type: 'public', label: '公共基础课', courses: map.public },
    { type: 'professional', label: '专业课', courses: map.professional },
  ]
})

// 判断学期是否在课程范围内
function isInRange(course, semester) {
  return semester >= course.startSemester && semester <= course.endSemester
}

// 获取某学期周课时
function getHours(course, semester) {
  const sem = course.semesters.find(s => s.semester === semester)
  return sem ? sem.weeklyHours : null
}

// 获取某学期教材名
function getTextbookName(course, semester) {
  const sem = course.semesters.find(s => s.semester === semester)
  if (!sem || !sem.planTextbooks?.length) return ''
  return sem.planTextbooks.map(t => t.textbooks?.title).join(', ')
}

// 单元格样式
function cellClass(course, semester) {
  if (!isInRange(course, semester)) return 'cell-out-of-range'
  const hours = getHours(course, semester) || 0
  if (hours === 0) return 'cell-zero'
  if (hours <= 2) return 'cell-low'
  if (hours <= 4) return 'cell-mid'
  return 'cell-high'
}

// 计算总课时
function calcTotalHours(course) {
  let total = 0
  for (let s = course.startSemester; s <= course.endSemester; s++) {
    const sem = course.semesters.find(x => x.semester === s)
    // 如果学期记录存在，使用记录的周课时和周数
    if (sem) {
      const hours = sem.weeklyHours || 0
      const weeks = sem.weeksCount || semesterWeeks.value[s - 1] || 18
      total += hours * weeks
    } else {
      // 如果学期记录不存在，使用课程默认的周课时
      const hours = course.weeklyHours || 0
      const weeks = course.weeksPerSemester || semesterWeeks.value[s - 1] || 18
      total += hours * weeks
    }
  }
  return Math.round(total)
}

// 分组小计
function calcSemesterSubtotal(group, semester) {
  let total = 0
  group.courses.forEach(c => {
    if (isInRange(c, semester)) {
      total += getHours(c, semester) || 0
    }
  })
  return total || null
}

function calcGroupTotal(group) {
  return group.courses.reduce((sum, c) => sum + calcTotalHours(c), 0)
}

// 总课时
const totalAllHours = computed(() => {
  return groups.value.reduce((sum, g) => sum + calcGroupTotal(g), 0)
})

// 打开编辑
async function openEdit(course, semester) {
  if (!isInRange(course, semester)) {
    ElMessage.warning('该学期不在课程开课范围内')
    return
  }

  let sem = course.semesters.find(s => s.semester === semester)

  // 如果学期记录不存在，自动创建
  if (!sem) {
    try {
      // 使用课程的默认周课时和周数
      const defaultWeeklyHours = course.weeklyHours || 4
      const defaultWeeksCount = course.weeksPerSemester || globalWeeks.value || 18

      await createSemester(props.planId, course.id, {
        semester,
        weeklyHours: defaultWeeklyHours,
        weeksCount: defaultWeeksCount,
      })

      // 重新加载数据以获取最新的学期记录
      await loadData()

      // 找到新创建的学期记录
      const updatedCourse = rawCourses.value.find(c => c.id === course.id)
      sem = updatedCourse?.planCourseSemesters?.find(s => s.semester === semester)
      if (!sem) {
        ElMessage.error('创建学期记录失败')
        return
      }
    } catch (e) {
      console.error(e)
      ElMessage.error('创建学期记录失败')
      return
    }
  }

  editingCourse.value = course
  editingSemester.value = { ...sem }
  editingTextbookId.value = sem.planTextbooks?.[0]?.textbookId || null
  popoverVisible.value = true
}

// 保存编辑
async function saveEdit() {
  if (!editingSemester.value) return
  
  // 验证：周课时为0时不允许选择教材
  if (editingSemester.value.weeklyHours === 0 && editingTextbookId.value) {
    ElMessage.warning('周课时为0时不能选择教材')
    return
  }
  
  saving.value = true
  try {
    await updateSemester(editingSemester.value.id, {
      weeklyHours: editingSemester.value.weeklyHours,
    })

    // 教材关联
    if (editingTextbookId.value) {
      await setSemesterTextbook(editingSemester.value.id, {
        textbookId: editingTextbookId.value,
        isRequired: true,
      })
    } else {
      await removeSemesterTextbook(editingSemester.value.id)
    }

    ElMessage.success('保存成功')
    popoverVisible.value = false
    await loadData()
  } catch (e) {
    console.error(e)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 应用全局周数 — 批量更新所有学期记录
async function applyGlobalWeeks() {
  const weeks = globalWeeks.value
  semesterWeeks.value = Array(maxSemester.value).fill(weeks)

  // 收集所有需要更新的学期记录ID
  const semesterIds = []
  rawCourses.value.forEach(course => {
    (course.planCourseSemesters || []).forEach(sem => {
      semesterIds.push(sem.id)
    })
  })

  // 并行发送所有更新请求
  if (semesterIds.length > 0) {
    try {
      await Promise.all(
        semesterIds.map(id =>
          updateSemester(id, { weeksCount: weeks }).catch(() => {})
        )
      )
      // 重新加载数据以反映最新状态
      await loadData()
      ElMessage.success('已应用学期周数设置')
    } catch (e) {
      console.error('批量更新学期周数失败', e)
      ElMessage.error('应用失败')
    }
  } else {
    ElMessage.info('暂无学期记录可更新')
  }
}

// 打开开课学期设置对话框
function openSemesterSettings(course) {
  editingCourseForSemester.value = course
  semesterForm.value = {
    startSemester: course.startSemester,
    endSemester: course.endSemester,
  }
  semesterDialogVisible.value = true
}

// 保存开课学期设置
async function saveSemesterSettings() {
  if (!editingCourseForSemester.value) return
  
  const { startSemester, endSemester } = semesterForm.value
  if (startSemester > endSemester) {
    return ElMessage.warning('起始学期不能大于结束学期')
  }
  
  saving.value = true
  try {
    await updatePlanCourse(editingCourseForSemester.value.id, {
      startSemester,
      endSemester,
    })
    
    ElMessage.success('保存成功')
    semesterDialogVisible.value = false
    await loadData()
  } catch (e) {
    console.error(e)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// ==================== 排序功能 ====================

// 判断是否是分组中的第一项
function isFirstInGroup(course, group) {
  return group.courses[0]?.id === course.id
}

// 判断是否是分组中的最后一项
function isLastInGroup(course, group) {
  return group.courses[group.courses.length - 1]?.id === course.id
}

// 上移
async function handleMoveUp(course, group) {
  const index = group.courses.findIndex(c => c.id === course.id)
  if (index <= 0) return
  
  const currentCourse = group.courses[index]
  const prevCourse = group.courses[index - 1]
  
  // 保存原始的 id 和 sortOrder
  const currentId = currentCourse.id
  const prevId = prevCourse.id
  const currentSortOrder = currentCourse.sortOrder
  const prevSortOrder = prevCourse.sortOrder
  
  try {
    // 交换两个课程的 sortOrder
    await Promise.all([
      updatePlanCourse(currentId, { sortOrder: prevSortOrder }),
      updatePlanCourse(prevId, { sortOrder: currentSortOrder })
    ])
    ElMessage.success('排序已更新')
    await loadData()
  } catch (e) {
    console.error('排序更新失败:', e)
    ElMessage.error('排序更新失败')
  }
}

// 下移
async function handleMoveDown(course, group) {
  const index = group.courses.findIndex(c => c.id === course.id)
  if (index >= group.courses.length - 1) return
  
  const currentCourse = group.courses[index]
  const nextCourse = group.courses[index + 1]
  
  // 保存原始的 id 和 sortOrder
  const currentId = currentCourse.id
  const nextId = nextCourse.id
  const currentSortOrder = currentCourse.sortOrder
  const nextSortOrder = nextCourse.sortOrder
  
  try {
    // 交换两个课程的 sortOrder
    await Promise.all([
      updatePlanCourse(currentId, { sortOrder: nextSortOrder }),
      updatePlanCourse(nextId, { sortOrder: currentSortOrder })
    ])
    ElMessage.success('排序已更新')
    await loadData()
  } catch (e) {
    console.error('排序更新失败:', e)
    ElMessage.error('排序更新失败')
  }
}

// 加载数据
async function loadData() {
  if (!props.planId) {
    console.warn('CourseMatrix: planId is not provided')
    return
  }
  
  loading.value = true
  try {
    const [coursesRes, semestersRes] = await Promise.all([
      getPlanCourses(props.planId),
      getPlanSemesters(props.planId),
    ])
    rawCourses.value = coursesRes.data || []
    semesterWeeks.value = buildSemesterWeeks(semestersRes.data || [], rawCourses.value)
    // FC3修复：移除调试输出，保留错误处理
  } catch (e) {
    console.error('CourseMatrix load error:', e)
  } finally {
    loading.value = false
  }
}

// 暴露刷新方法
defineExpose({
  refresh: loadData,
})

onMounted(loadData)

// 当 planId 变化时重新加载
watch(() => props.planId, loadData)

// 监听周课时变化，当为0时自动清除教材选择
watch(
  () => editingSemester.value?.weeklyHours,
  (newHours) => {
    if (newHours === 0 && editingTextbookId.value) {
      editingTextbookId.value = null
    }
  }
)
</script>

<style scoped>
.matrix-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 260px);
  min-height: 500px;
}

.matrix-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.matrix-toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.total-courses-label {
  color: #909399;
  font-size: 13px;
}

/* 矩阵滚动区 */
.matrix-scroll {
  flex: 1;
  overflow: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.matrix-table {
  border-collapse: collapse;
  width: max-content;
  min-width: 100%;
  font-size: 13px;
}

.matrix-table thead {
  position: sticky;
  top: 0;
  z-index: 2;
}

.matrix-table th {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  padding: 8px 6px;
  text-align: center;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
}

.matrix-semester-header {
  min-width: 80px;
}

.matrix-course-header {
  min-width: 160px;
  text-align: left !important;
  padding-left: 12px !important;
}

.matrix-total-header {
  min-width: 70px;
  background: #ecf5ff !important;
  color: #409eff !important;
}

.matrix-action-header {
  min-width: 140px;
  text-align: center;
  background: #f5f7fa !important;
}

/* 固定列 */
.matrix-fixed-col {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #fff;
}

.matrix-course-name {
  padding: 8px 12px;
  border: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  gap: 6px;
}

.course-name-text {
  font-weight: 500;
  white-space: nowrap;
}

.course-type-tag {
  flex-shrink: 0;
}

/* 分组行 */
.matrix-group-row td {
  position: sticky;
  left: 0;
}

.matrix-group-cell {
  padding: 6px 16px !important;
  font-weight: 600;
  font-size: 14px;
  border: 1px solid #e4e7ed;
}

.matrix-group-cell.public {
  background: #f0f9eb;
  color: #67c23a;
}

.matrix-group-cell.professional {
  background: #fdf6ec;
  color: #e6a23c;
}

.group-label {
  margin-right: 8px;
}

.group-count {
  font-weight: 400;
  font-size: 12px;
  color: #909399;
}

/* 单元格 */
.matrix-cell {
  border: 1px solid #e4e7ed;
  padding: 4px 6px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;
  vertical-align: middle;
}

.matrix-cell:hover {
  box-shadow: inset 0 0 0 2px #409eff;
}

.cell-out-of-range {
  background: #fafafa;
  cursor: default;
}

.cell-zero {
  background: #fff;
}

.cell-low {
  background: #ecf5ff;
}

.cell-mid {
  background: #d9ecff;
}

.cell-high {
  background: #b3d8ff;
}

.cell-hours {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.cell-textbook {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 总课时列 */
.matrix-total-cell {
  background: #ecf5ff !important;
  font-size: 14px;
}

/* 操作列 */
.matrix-action-cell {
  text-align: center;
  cursor: default !important;
}

.action-buttons {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
}

.action-buttons .el-button.is-disabled {
  opacity: 0.4;
}

.matrix-action-cell .el-button {
  padding: 4px 8px;
}

/* 小计行 */
.matrix-subtotal-row td {
  background: #f5f7fa;
  border-top: 2px solid #c0c4cc;
}

.matrix-subtotal-label {
  padding: 6px 12px;
  font-weight: 600;
  color: #606266;
  text-align: left;
  border: 1px solid #e4e7ed;
}

.matrix-subtotal-cell {
  font-weight: 500;
  color: #606266;
  cursor: default !important;
}

/* 底部控制栏 */
.matrix-footer {
  margin-top: 16px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.footer-section {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.footer-label {
  font-weight: 600;
  font-size: 13px;
  color: #303133;
}

.footer-hint {
  font-size: 12px;
  color: #909399;
}

.footer-summary {
  flex-shrink: 0;
  padding-top: 20px;
}

/* Popover */
.popover-content {
  padding: 4px 0;
}

.popover-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.popover-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #e4e7ed;
}

.textbook-disabled-tip {
  font-size: 12px;
  color: #f56c6c;
  margin-top: 4px;
}

.full-width {
  width: 100%;
}
</style>
