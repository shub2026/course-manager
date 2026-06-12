<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>班级管理</span>
          <div class="card-header-actions">
            <el-input v-model="filterName" clearable placeholder="按班级名称筛选" class="filter-name" />
            <el-select v-model="filterCollege" clearable placeholder="选择学院" @change="resetPaginationAndLoad" class="filter-medium">
              <el-option label="空值" value="null" />
              <el-option v-for="c in colleges" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-select v-model="filterMajor" clearable placeholder="选择专业" @change="resetPaginationAndLoad" class="filter-medium">
              <el-option label="空值" value="null" />
              <el-option v-for="m in majors" :key="m.id" :label="m.name" :value="m.id" />
            </el-select>
            <el-select v-model="filterLevel" clearable placeholder="培养层次" @change="resetPaginationAndLoad" class="filter-narrow">
              <el-option label="空值" value="null" />
              <el-option v-for="level in trainingLevels" :key="level.id" :label="level.name" :value="level.id" />
            </el-select>
            <el-select v-model="filterYear" clearable placeholder="入学年份" @change="resetPaginationAndLoad" class="filter-narrow">
              <el-option v-for="year in enrollmentYears" :key="year" :label="year + '年'" :value="year" />
            </el-select>
            <el-select v-model="filterStatus" clearable placeholder="状态" @change="resetPaginationAndLoad" class="filter-small">
              <el-option label="在读" value="active" />
              <el-option label="已毕业" value="graduated" />
              <el-option label="离校" value="left_school" />
            </el-select>
            <el-select v-model="filterPlan" clearable placeholder="培养方案" @change="resetPaginationAndLoad" class="filter-medium">
              <el-option label="未关联" value="none" />
              <el-option v-for="p in plans" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
            <el-button @click="exportData">数据导出</el-button>
            <el-button @click="downloadTemplate">下载模板</el-button>
            <el-upload 
              :show-file-list="false" 
              accept=".xlsx,.xls" 
              action="/api/import/classes" 
              name="file" 
              :on-success="onImportSuccess" 
              :on-error="onImportError"
              :before-upload="beforeImport"
            >
              <el-button>导入Excel</el-button>
            </el-upload>
            <el-button type="primary" @click="openDialog()">
              <el-icon><Plus /></el-icon> 新增班级
            </el-button>
          </div>
        </div>
      </template>
      <el-table :data="list" stripe v-loading="loading" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="45" />
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="name" label="班级名称" min-width="180" show-overflow-tooltip />
        <el-table-column label="二级学院" min-width="115" show-overflow-tooltip>
          <template #default="{ row }">{{ row.colleges?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="专业" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.majors?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="培养层次" min-width="100" show-overflow-tooltip>
          <template #default="{ row }">{{ row.trainingLevels?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="入学年份" min-width="85" show-overflow-tooltip>
          <template #default="{ row }">{{ row.enrollmentYear || '-' }}</template>
        </el-table-column>
        <el-table-column label="学制" min-width="55">
          <template #default="{ row }">{{ row.durationYears || '-' }}</template>
        </el-table-column>
        <el-table-column label="人数" min-width="55">
          <template #default="{ row }">{{ row.studentCount || '-' }}</template>
        </el-table-column>
        <el-table-column label="年级" min-width="75">
          <template #default="{ row }">
            <el-tag size="small" v-if="calcGrade(row)">{{ calcGrade(row) }}年级</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="65">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'left_school'" type="danger">离校</el-tag>
            <el-tag v-else :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '在读' : '已毕业' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前方案" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tag :type="row.trainingPlans ? 'warning' : 'success'" size="small">
              {{ getCurrentPlanName(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="Edit" @click="openDialog(row)" circle title="编辑" />
            <el-popconfirm title="确定删除？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button size="small" :icon="Delete" type="danger" circle title="删除" />
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 批量操作栏 -->
      <div v-if="selectedClasses.length > 0" class="batch-operations">
        <span class="selected-count">已选择 {{ selectedClasses.length }} 个班级</span>
        <el-button type="danger" size="small" @click="handleBatchDelete">
          <el-icon><Delete /></el-icon> 批量删除
        </el-button>
        <el-button size="small" @click="openBatchSetDialog('major')">
          <el-icon><Edit /></el-icon> 批量设置专业
        </el-button>
        <el-button size="small" @click="openBatchSetDialog('college')">
          <el-icon><Edit /></el-icon> 批量设置学院
        </el-button>
        <el-button size="small" @click="openBatchSetDialog('level')">
          <el-icon><Edit /></el-icon> 批量设置层次
        </el-button>
        <el-button size="small" @click="openBatchSetDialog('year')">
          <el-icon><Edit /></el-icon> 批量设置入学年份
        </el-button>
        <el-button size="small" @click="openBatchSetDialog('duration')">
          <el-icon><Edit /></el-icon> 批量设置学制
        </el-button>
        <el-button size="small" @click="openBatchSetDialog('leftSchool')">
          <el-icon><Edit /></el-icon> 批量设置离校
        </el-button>
      </div>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑班级' : '新增班级'" width="800px">
      <el-form :model="form" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="班级名称" required>
              <el-input v-model="form.name" placeholder="如：2024级学前1班" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="专业类别">
              <el-select v-model="form.majorId" clearable placeholder="请选择" class="full-width">
                <el-option v-for="m in majors" :key="m.id" :label="m.name" :value="m.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="二级学院">
              <el-select v-model="form.collegeId" clearable placeholder="请选择" class="full-width">
                <el-option v-for="college in colleges" :key="college.id" :label="college.name" :value="college.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="培养层次" required>
              <el-select v-model="form.trainingLevelId" placeholder="请选择" class="full-width">
                <el-option v-for="level in trainingLevels" :key="level.id" :label="level.name" :value="level.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="入学年份" required>
              <el-input-number v-model="form.enrollmentYear" :min="2000" :max="2099" class="full-width" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="学制(年)" required>
              <el-input-number v-model="form.durationYears" :min="1" :max="6" class="full-width" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="班级人数">
              <el-input-number v-model="form.studentCount" :min="0" class="full-width" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="特殊状态离校">
              <el-switch v-model="form.isLeftSchool" />
              <div class="form-hint">开启后班级状态固定显示"离校"，关闭则由系统自动推算在读/已毕业</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="培养方案">
              <el-select v-model="form.customPlanId" clearable placeholder="默认使用专业方案" class="full-width">
                <el-option v-for="p in plans" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
              <div class="form-hint">不设置则使用培养方案类型进行关联</div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量设置对话框 -->
    <el-dialog v-model="batchDialogVisible" :title="batchDialogTitle" width="500px">
      <el-form label-width="120px">
        <el-form-item v-if="batchFormType === 'major'" label="专业类别">
          <el-select v-model="batchForm.majorId" placeholder="请选择专业" class="full-width">
            <el-option v-for="m in majors" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-else-if="batchFormType === 'college'" label="二级学院">
          <el-select v-model="batchForm.collegeId" clearable placeholder="请选择学院" class="full-width">
            <el-option v-for="c in colleges" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-else-if="batchFormType === 'level'" label="培养层次">
          <el-select v-model="batchForm.trainingLevelId" clearable placeholder="请选择层次" class="full-width">
            <el-option v-for="level in trainingLevels" :key="level.id" :label="level.name" :value="level.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-else-if="batchFormType === 'year'" label="入学年份">
          <el-input-number v-model="batchForm.enrollmentYear" :min="2000" :max="2099" class="full-width" />
        </el-form-item>
        <el-form-item v-else-if="batchFormType === 'duration'" label="学制(年)">
          <el-input-number v-model="batchForm.durationYears" :min="1" :max="6" class="full-width" />
        </el-form-item>
        <el-form-item v-else-if="batchFormType === 'leftSchool'" label="离校状态">
          <el-select v-model="batchForm.isLeftSchool" class="full-width">
            <el-option label="是（标记为离校）" :value="true" />
            <el-option label="否（恢复正常状态）" :value="false" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBatchSet" :loading="batchSaving">确定</el-button>
      </template>
    </el-dialog>

    <!-- 导入进度对话框 -->
    <el-dialog v-model="progressDialogVisible" title="正在导入" width="500px" :close-on-click-modal="false" :show-close="false">
      <div class="progress-container">
        <el-progress 
          :percentage="progressPercent" 
          :status="progressStatus"
          :stroke-width="20"
        />
        <div class="progress-info">
          <div class="progress-text">{{ progressText }}</div>
          <div class="progress-detail" v-if="progressDetail">
            {{ progressDetail }}
          </div>
        </div>
        <div class="progress-tip">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>请稍候，正在处理中...</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Loading } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'
import { getClasses, createClass, updateClass, deleteClass } from '../../api/class'
import { getMajors } from '../../api/major'
import { getPlans } from '../../api/plan'
import { getTrainingLevels } from '../../api/trainingLevel'
import { getColleges } from '../../api/college'
import { useSettingsStore } from '../../stores/settings'

const settingsStore = useSettingsStore()
const authStore = useAuthStore()
const list = ref([])
const loading = ref(false)
const majors = ref([])
const plans = ref([])
const trainingLevels = ref([])
const colleges = ref([])
const allEnrollmentYears = ref([])
const dialogVisible = ref(false)
const saving = ref(false)
const filterName = ref('')
const filterYear = ref(null)
const filterCollege = ref(null)
const filterMajor = ref(null)
const filterLevel = ref(null)
const filterStatus = ref(null)
const filterPlan = ref(null)

// 批量操作相关状态
const selectedClasses = ref([])
const batchDialogVisible = ref(false)
const batchSaving = ref(false)
const batchFormType = ref('') // major, college, level, year, duration, leftSchool
const batchDialogTitle = ref('')
const batchForm = ref({
  majorId: null,
  collegeId: null,
  trainingLevelId: null,
  enrollmentYear: null,
  durationYears: null,
  isLeftSchool: false,
})

// 分页状态
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
})

const defaultForm = { id: null, name: '', majorId: null, enrollmentYear: new Date().getFullYear(), durationYears: 3, collegeId: null, trainingLevelId: null, studentCount: 0, isLeftSchool: false, customPlanId: null }
const form = ref({ ...defaultForm })

// 导入相关状态
const pendingFile = ref(null)

// 导入进度状态
const progressDialogVisible = ref(false)
const progressPercent = ref(0)
const progressStatus = ref('') // '' | 'success' | 'exception' | 'warning'
const progressText = ref('准备上传...')
const progressDetail = ref('')

// 入学年份选项（降序）
const enrollmentYears = computed(() => {
  return allEnrollmentYears.value.sort((a, b) => b - a)
})

// 获取班级匹配的培养方案名称（支持按专业和按层次两种方式）
// 优先级：1.自定义方案 > 2.根据培养方案的关联类型进行匹配
function getCurrentPlanName(row) {
  // 1. 优先显示自定义方案
  if (row.trainingPlans) {
    return row.trainingPlans.name
  }
  
  // 2. 遍历所有方案，根据方案的关联类型来匹配
  // 如果方案是按专业关联的，则检查班级的majorId是否匹配
  // 如果方案是按层次关联的，则检查班级的trainingLevelId是否匹配
  for (const plan of plans.value) {
    // 方案按专业关联：检查班级的专业是否匹配
    if (plan.majorId && plan.majorId === row.majors?.id) {
      return plan.name
    }
    
    // 方案按层次关联：检查班级的层次是否匹配
    if (plan.trainingLevelId && plan.trainingLevelId === row.trainingLevels?.id) {
      return plan.name
    }
  }
  
  return '-'
}

/**
 * 计算班级当前年级
 * 
 * 示例：当前全局学期为 2025-2026学年（startYear=2025）
 * - 2025年入学: 2025 - 2025 + 1 = 1年级
 * - 2024年入学: 2025 - 2024 + 1 = 2年级
 * - 2023年入学: 2025 - 2023 + 1 = 3年级
 * 
 * @param {Object} cls - 班级对象
 * @returns {number|null} 年级序号或null（超出学制）
 */
function calcGrade(cls) {
  const cs = settingsStore.settings.currentSemester
  if (!cs) return null
  const startYear = Number(cs.value.split('-')[0])
  const grade = startYear - cls.enrollmentYear + 1
  if (grade < 1 || grade > cls.durationYears) return null
  return grade
}

async function load() {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    }
    if (filterName.value) params.name = filterName.value
    if (filterYear.value) params.enrollmentYear = filterYear.value
    if (filterCollege.value) params.collegeId = filterCollege.value
    if (filterMajor.value) params.majorId = filterMajor.value
    if (filterLevel.value) params.trainingLevelId = filterLevel.value
    if (filterStatus.value) params.status = filterStatus.value
    if (filterPlan.value) params.planId = filterPlan.value
    const res = await getClasses(params)
    list.value = res.data?.items || []
    pagination.value.total = res.data?.total || 0
    
    // 使用后端返回的所有入学年份（不受分页限制）
    if (res.data?.allEnrollmentYears) {
      allEnrollmentYears.value = res.data.allEnrollmentYears
    }
  } finally {
    loading.value = false
  }
}

// 分页处理函数
function handlePageChange(page) {
  pagination.value.page = page
  load()
}

function handleSizeChange(size) {
  pagination.value.pageSize = size
  pagination.value.page = 1 // 重置到第一页
  load()
}

// 筛选条件变化时重置页码
function resetPaginationAndLoad() {
  pagination.value.page = 1
  load()
}

// 为filterName添加debounce防抖（#16修复）
let filterNameDebounceTimer = null
watch(filterName, () => {
  if (filterNameDebounceTimer) clearTimeout(filterNameDebounceTimer)
  filterNameDebounceTimer = setTimeout(() => {
    resetPaginationAndLoad()
  }, 300) // 300ms debounce
})

async function loadMeta() {
  const [majorsRes, plansRes, levelsRes, collegesRes] = await Promise.all([getMajors(), getPlans(), getTrainingLevels(), getColleges()])
  majors.value = majorsRes.data || []
  plans.value = plansRes.data || []
  trainingLevels.value = levelsRes.data || []
  colleges.value = collegesRes.data || []
}

function openDialog(row) {
  if (row) {
    // 后端返回的已经是驼峰命名（经过中间件转换）
    form.value = {
      id: row.id,
      name: row.name,
      majorId: row.majors?.id || null,
      enrollmentYear: row.enrollmentYear,
      durationYears: row.durationYears,
      collegeId: row.colleges?.id || null,
      trainingLevelId: row.trainingLevels?.id || null,
      studentCount: row.studentCount,
      isLeftSchool: row.isLeftSchool || false,
      customPlanId: row.trainingPlans?.id || null
    }
  } else {
    form.value = { ...defaultForm }
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.value.name || !form.value.trainingLevelId) return ElMessage.warning('请填写班级名称和培养层次')
  saving.value = true
  try {
    if (form.value.id) {
      await updateClass(form.value.id, form.value)
    } else {
      await createClass(form.value)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

async function handleDelete(id) {
  try {
    await deleteClass(id)
    ElMessage.success('删除成功')
    load()
  } catch (e) {
    console.error('删除班级失败:', e)
    ElMessage.error('删除失败，请重试')
  }
}

// ==================== 批量操作函数 ====================

// 选择变化处理
function handleSelectionChange(selection) {
  selectedClasses.value = selection
}

// 批量删除
async function handleBatchDelete() {
  if (selectedClasses.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedClasses.value.length} 个班级吗？此操作不可恢复！`,
      '批量删除确认',
      { type: 'warning' }
    )
    const ids = selectedClasses.value.map(c => c.id)
    await Promise.all(ids.map(id => deleteClass(id)))
    ElMessage.success(`已删除 ${ids.length} 个班级`)
    selectedClasses.value = []
    load()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('批量删除失败:', e)
      ElMessage.error('批量删除失败')
    }
  }
}

// 打开批量设置对话框
function openBatchSetDialog(type) {
  batchFormType.value = type
  batchDialogTitle.value = {
    major: '批量设置专业类别',
    college: '批量设置学院',
    level: '批量设置培养层次',
    year: '批量设置入学年份',
    duration: '批量设置学制',
    leftSchool: '批量设置离校',
  }[type]
  
  // 重置表单
  batchForm.value = {
    majorId: null,
    collegeId: null,
    trainingLevelId: null,
    enrollmentYear: new Date().getFullYear(),
    durationYears: 3,
    isLeftSchool: false,
  }
  
  batchDialogVisible.value = true
}

// 执行批量设置
async function handleBatchSet() {
  const type = batchFormType.value
  
  // 验证
  if (type === 'major' && !batchForm.value.majorId) {
    return ElMessage.warning('请选择专业类别')
  }
  if (type === 'year' && !batchForm.value.enrollmentYear) {
    return ElMessage.warning('请设置入学年份')
  }
  if (type === 'duration' && !batchForm.value.durationYears) {
    return ElMessage.warning('请设置学制')
  }
  
  batchSaving.value = true
  try {
    const ids = selectedClasses.value.map(c => c.id)
    const updateData = {}
    
    switch (type) {
      case 'major':
        updateData.majorId = batchForm.value.majorId
        break
      case 'college':
        updateData.collegeId = batchForm.value.collegeId || null
        break
      case 'level':
        updateData.trainingLevelId = batchForm.value.trainingLevelId || null
        break
      case 'year':
        updateData.enrollmentYear = batchForm.value.enrollmentYear
        break
      case 'duration':
        updateData.durationYears = batchForm.value.durationYears
        break
      case 'leftSchool':
        updateData.isLeftSchool = batchForm.value.isLeftSchool
        break
    }
    
    await Promise.all(ids.map(id => updateClass(id, updateData)))
    ElMessage.success(`已成功更新 ${ids.length} 个班级`)
    batchDialogVisible.value = false
    selectedClasses.value = []
    load()
  } catch (e) {
    console.error('批量更新失败:', e)
    ElMessage.error('批量更新失败')
  } finally {
    batchSaving.value = false
  }
}

async function exportData() {
  try {
    const response = await fetch('/api/export/classes', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error('导出失败')
    }
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `班级数据_${new Date().getTime()}.xlsx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

async function downloadTemplate() {
  try {
    const response = await fetch('/api/export/template/classes', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error('下载模板失败')
    }
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '班级导入模板.xlsx'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    
    ElMessage.success('模板下载成功')
  } catch (error) {
    console.error('下载模板失败:', error)
    ElMessage.error('下载模板失败')
  }
}

// 导入前拦截，显示确认提示
async function beforeImport(file) {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
  if (!isExcel) {
    ElMessage.error('请上传Excel文件')
    return false
  }
  
  pendingFile.value = file
  
  try {
    await ElMessageBox.confirm(
      '导入将以数据第一列（班级名称）进行匹配，已存在的班级将被覆盖更新，确定继续导入吗？',
      '导入确认',
      {
        confirmButtonText: '确定导入',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    confirmImport()
  } catch {
    // 用户取消
    pendingFile.value = null
  }
  
  return false // 阻止自动上传
}

// 确认导入
function confirmImport() {
  // 显示进度对话框
  progressDialogVisible.value = true
  progressPercent.value = 0
  progressStatus.value = ''
  progressText.value = '准备上传...'
  progressDetail.value = ''
  
  // 创建 FormData 并手动上传
  const formData = new FormData()
  formData.append('file', pendingFile.value)
  
  // 使用 XMLHttpRequest 来监控上传进度
  const xhr = new XMLHttpRequest()
  
  // 上传进度
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 50) // 上传占50%
      progressPercent.value = percent
      progressText.value = `上传中... ${percent}%`
    }
  })
  
  // 下载进度（服务器响应）
  xhr.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const percent = 50 + Math.round((e.loaded / e.total) * 30) // 处理占30%
      progressPercent.value = percent
      progressText.value = '服务器处理中...'
    }
  })
  
  // 完成
  xhr.addEventListener('load', () => {
    progressPercent.value = 90
    progressText.value = '处理完成...'
    
    if (xhr.status === 200) {
      try {
        const data = JSON.parse(xhr.responseText)
        progressPercent.value = 100
        progressStatus.value = 'success'
        progressText.value = '导入完成！'
        
        // 延迟关闭进度对话框，让用户看到完成状态
        setTimeout(() => {
          progressDialogVisible.value = false
          onImportSuccess(data)
        }, 1000)
      } catch (e) {
        progressStatus.value = 'exception'
        progressText.value = '解析响应失败'
        setTimeout(() => {
          progressDialogVisible.value = false
          ElMessage.error('导入失败：响应格式错误')
        }, 1500)
      }
    } else {
      progressStatus.value = 'exception'
      progressText.value = '上传失败'
      setTimeout(() => {
        progressDialogVisible.value = false
        ElMessage.error(`导入失败：HTTP ${xhr.status}`)
      }, 1500)
    }
  })
  
  // 错误处理
  xhr.addEventListener('error', () => {
    progressStatus.value = 'exception'
    progressText.value = '网络错误'
    setTimeout(() => {
      progressDialogVisible.value = false
      ElMessage.error('导入失败：网络连接错误')
    }, 1500)
  })
  
  // 发送请求
  xhr.open('POST', '/api/import/classes')
  
  // 添加认证头（FC3修复：移除调试输出）
  if (authStore.token) {
    xhr.setRequestHeader('Authorization', `Bearer ${authStore.token}`)
  }
  
  xhr.send(formData)
  
  pendingFile.value = null
}

function onImportSuccess(res) {
  const data = res.data || {}
  const message = res.message || '导入完成'
  
  // 构建简要消息（不显示详细错误）
  let summaryMsg = message
  
  // 添加自动创建统计信息
  if (data.autoCreated) {
    const { trainingLevels, majors, colleges } = data.autoCreated
    const autoCreatedParts = []
    if (trainingLevels > 0) autoCreatedParts.push(`${trainingLevels}个层次`)
    if (majors > 0) autoCreatedParts.push(`${majors}个专业`)
    if (colleges > 0) autoCreatedParts.push(`${colleges}个学院`)
    if (autoCreatedParts.length > 0) {
      summaryMsg += `\n\n✅ 自动创建基础数据：${autoCreatedParts.join('、')}`
    }
  }
  
  // 根据结果显示不同类型的消息
  if (data.failed > 0 && (data.imported === 0 && data.overwritten === 0)) {
    // 完全失败：没有任何数据导入成功
    ElMessage({
      message: summaryMsg,
      type: 'error',
      duration: 5000,
      showClose: true,
    })
    
    // 显示错误详情对话框
    ElMessageBox.confirm(
      `${summaryMsg}\n\n是否查看详细错误信息？`,
      '导入失败',
      {
        confirmButtonText: '查看详情',
        cancelButtonText: '关闭',
        type: 'error',
        draggable: true,
      }
    ).then(() => {
      showErrorsDialog(data.errors)
    }).catch(() => {
      // 用户点击"关闭"
    })
  } else if (data.failed > 0) {
    // 部分成功：有数据导入成功，但也有失败的记录
    ElMessageBox.confirm(
      `${summaryMsg}\n\n共有 ${data.failed} 条记录导入失败，是否查看详细错误？`,
      '部分成功',
      {
        confirmButtonText: '查看详情',
        cancelButtonText: '关闭',
        type: 'warning',
        draggable: true,
      }
    ).then(() => {
      // 用户点击"查看详情"，显示错误对话框
      showErrorsDialog(data.errors)
    }).catch(() => {
      // 用户点击"关闭"，不做任何操作
    })
    
    // 同时显示一个简短的提示消息
    ElMessage({
      message: summaryMsg,
      type: 'warning',
      duration: 5000,
      showClose: true,
    })
  } else if (data.imported > 0 || data.overwritten > 0) {
    // 全部成功：没有失败记录
    ElMessage({
      message: summaryMsg,
      type: 'success',
      duration: 5000,
      showClose: true,
    })
  } else {
    // 其他情况（没有数据被导入）
    ElMessage({
      message: summaryMsg,
      type: 'info',
      duration: 4000,
      showClose: true,
    })
  }
  load()
}

// 显示错误详情对话框（FC1修复：使用纯文本替代dangerouslyUseHTMLString）
function showErrorsDialog(errors) {
  const errorListText = errors.map((error, index) => `${index + 1}. ${error}`).join('\n')
  
  ElMessageBox.alert(
    errorListText,
    `导入失败详情（共${errors.length}条）`,
    {
      confirmButtonText: '关闭',
      customStyle: { maxWidth: '700px', whiteSpace: 'pre-wrap' },
    }
  )
}

function onImportError(err) {
  console.error('导入错误:', err)
  ElMessage.error('导入失败，请检查文件格式或联系管理员')
}

onMounted(async () => {
  await loadMeta()
  load()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
/* 筛选器宽度分类 */
.filter-name {
  width: 180px;
}
.filter-small {
  width: 100px;
}
.filter-narrow {
  width: 130px;
}
.filter-medium {
  width: 160px;
}
.full-width {
  width: 100%;
}
.form-hint {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}
.batch-operations {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-top: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
  flex-wrap: wrap;
}
.selected-count {
  color: #409eff;
  font-weight: 500;
  margin-right: auto;
}
.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding: 12px 0;
}

/* 进度对话框样式 */
.progress-container {
  padding: 20px 0;
}

.progress-info {
  margin-top: 20px;
  text-align: center;
}

.progress-text {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
}

.progress-detail {
  font-size: 13px;
  color: #909399;
  min-height: 20px;
}

.progress-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
  color: #409eff;
  font-size: 14px;
}
</style>
