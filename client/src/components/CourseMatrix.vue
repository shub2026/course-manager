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
      <table class="matrix-table" v-if="groups.length">
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
          </tr>
        </thead>
        <tbody v-for="group in groups" :key="group.type">
          <!-- 分组标题行 -->
          <tr class="matrix-group-row">
            <td :colspan="maxSemester + 2" class="matrix-group-cell" :class="group.type">
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
          @change="onGlobalWeeksChange"
        />
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
              <el-input-number
                v-model="editingSemester.weeklyHours"
                :min="0"
                :max="40"
                :step="0.5"
                controls-position="right"
                class="full-width"
              />
            </el-form-item>
            <el-form-item label="学期周数">
              <el-input-number
                v-model="editingSemester.weeksCount"
                :min="1"
                :max="30"
                controls-position="right"
                class="full-width"
              />
            </el-form-item>
            <el-form-item label="关联教材">
              <el-select
                v-model="editingTextbookId"
                filterable
                clearable
                placeholder="选择教材（可选）"
                class="full-width"
              >
                <el-option
                  v-for="t in allTextbooks"
                  :key="t.id"
                  :label="`${t.title} (${t.publisher || ''})`"
                  :value="t.id"
                />
              </el-select>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getPlanCourses,
  updateSemester,
  setSemesterTextbook,
  removeSemesterTextbook,
  getPlanSemesters,
} from '../api/plan'

const props = defineProps({
  planId: { type: Number, required: true },
  allCourses: { type: Array, default: () => [] },
  allTextbooks: { type: Array, default: () => [] },
})

defineEmits(['add-course'])

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

// 计算最大学期数
const maxSemester = computed(() => {
  if (!rawCourses.value.length) return 6
  const max = Math.max(...rawCourses.value.map(c => c.endSemester), 0)
  return Math.max(max, 6)
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
    const type = c.course?.type || 'public'
    map[type].push({
      id: c.id,
      courseName: c.course?.name || '未知课程',
      courseCode: c.course?.code || '',
      startSemester: c.startSemester,
      endSemester: c.endSemester,
      semesters: c.planCourseSemesters || [],
    })
  })
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
  if (!sem || !sem.textbooks?.length) return ''
  return sem.textbooks.map(t => t.textbook?.title).join(', ')
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
    if (sem && sem.weeklyHours > 0) {
      total += sem.weeklyHours * (sem.weeksCount || semesterWeeks.value[s - 1] || 18)
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
function openEdit(course, semester) {
  if (!isInRange(course, semester)) return

  let sem = course.semesters.find(s => s.semester === semester)
  if (!sem) return

  editingCourse.value = course
  editingSemester.value = { ...sem }
  editingTextbookId.value = sem.textbooks?.[0]?.textbookId || null
  popoverVisible.value = true
}

// 保存编辑
async function saveEdit() {
  if (!editingSemester.value) return
  saving.value = true
  try {
    await updateSemester(editingSemester.value.id, {
      weeklyHours: editingSemester.value.weeklyHours,
      weeksCount: editingSemester.value.weeksCount,
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
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 全局周数变更 — 更新所有学期记录
async function onGlobalWeeksChange() {
  const weeks = globalWeeks.value
  semesterWeeks.value = Array(maxSemester.value).fill(weeks)
  try {
    for (const course of rawCourses.value) {
      for (const sem of (course.planCourseSemesters || [])) {
        await updateSemester(sem.id, { weeksCount: weeks })
      }
    }
  } catch (e) { /* ignore */ }
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const [coursesRes, semestersRes] = await Promise.all([
      getPlanCourses(props.planId),
      getPlanSemesters(props.planId),
    ])
    rawCourses.value = coursesRes.data || []
    semesterWeeks.value = buildSemesterWeeks(semestersRes.data || [], rawCourses.value)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

// 当 planId 变化时重新加载
watch(() => props.planId, loadData)
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

.full-width {
  width: 100%;
}
</style>
