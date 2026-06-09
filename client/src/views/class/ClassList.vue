<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>班级管理</span>
          <div class="card-header-actions">
            <el-input v-model="filterName" clearable placeholder="按班级名称筛选" @input="resetPaginationAndLoad" class="filter-name" />
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
            </el-select>
            <el-select v-model="filterPlan" clearable placeholder="培养方案" @change="resetPaginationAndLoad" class="filter-medium">
              <el-option label="未关联" value="none" />
              <el-option v-for="p in plans" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
            <el-button @click="downloadTemplate">下载模板</el-button>
            <el-upload 
              :show-file-list="false" 
              accept=".xlsx,.xls" 
              action="/api/import/classes" 
              name="file" 
              :data="{ onDuplicate: importMode }"
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
        <el-table-column prop="name" label="班级名称" min-width="180" />
        <el-table-column label="二级学院" width="115">
          <template #default="{ row }">{{ row.college?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="专业" width="150">
          <template #default="{ row }">{{ row.major?.name }}</template>
        </el-table-column>
        <el-table-column label="培养层次" width="100">
          <template #default="{ row }">{{ row.trainingLevel?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="enrollmentYear" label="入学年份" width="100" />
        <el-table-column prop="durationYears" label="学制" width="80" />
        <el-table-column prop="studentCount" label="人数" width="80" />
        <el-table-column label="年级" width="90">
          <template #default="{ row }">
            <el-tag size="small" v-if="calcGrade(row)">{{ calcGrade(row) }}年级</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '在读' : '已毕业' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前方案" min-width="130">
          <template #default="{ row }">
            <el-tag :type="row.customPlan ? 'warning' : 'success'" size="small">
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
        <el-button size="small" @click="openBatchSetDialog('status')">
          <el-icon><Edit /></el-icon> 批量设置状态
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
            <el-form-item label="状态">
              <el-select v-model="form.status" class="full-width">
                <el-option label="在读" value="active" />
                <el-option label="已毕业" value="graduated" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="培养方案">
              <el-select v-model="form.customPlanId" clearable placeholder="默认使用专业方案" class="full-width">
                <el-option v-for="p in plans" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
              <div class="form-hint">不设置则使用该专业的默认培养方案</div>
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
        <el-form-item v-else-if="batchFormType === 'status'" label="状态">
          <el-select v-model="batchForm.status" class="full-width">
            <el-option label="在读" value="active" />
            <el-option label="已毕业" value="graduated" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBatchSet" :loading="batchSaving">确定</el-button>
      </template>
    </el-dialog>

    <!-- 导入选项对话框 -->
    <el-dialog v-model="importDialogVisible" title="导入选项" width="400px">
      <el-form label-width="100px">
        <el-form-item label="重复数据处理">
          <el-radio-group v-model="importMode">
            <el-radio value="skip">跳过重复</el-radio>
            <el-radio value="overwrite">覆盖更新</el-radio>
          </el-radio-group>
          <div class="form-hint">
            跳过重复：如果数据库中已存在则跳过不导入<br>
            覆盖更新：如果数据库中已存在则更新该条数据
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmImport">确认导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit } from '@element-plus/icons-vue'
import { getClasses, createClass, updateClass, deleteClass } from '../../api/class'
import { getMajors } from '../../api/major'
import { getPlans } from '../../api/plan'
import { getTrainingLevels } from '../../api/trainingLevel'
import { getColleges } from '../../api/college'
import { useSettingsStore } from '../../stores/settings'

const settingsStore = useSettingsStore()
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
const batchFormType = ref('') // major, college, level, year, duration, status
const batchDialogTitle = ref('')
const batchForm = ref({
  majorId: null,
  collegeId: null,
  trainingLevelId: null,
  enrollmentYear: null,
  durationYears: null,
  status: 'active',
})

// 分页状态
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
})

const defaultForm = { id: null, name: '', majorId: null, enrollmentYear: new Date().getFullYear(), durationYears: 3, collegeId: null, trainingLevelId: null, studentCount: 0, status: 'active', customPlanId: null }
const form = ref({ ...defaultForm })

// 导入相关状态
const importDialogVisible = ref(false)
const importMode = ref('skip') // 'skip' | 'overwrite'
const pendingFile = ref(null)

// 入学年份选项（降序）
const enrollmentYears = computed(() => {
  return allEnrollmentYears.value.sort((a, b) => b - a)
})

// 获取班级匹配的培养方案名称（支持按专业和按层次两种方式）
// 优先级：1.自定义方案 > 2.根据培养方案的关联类型进行匹配
function getCurrentPlanName(row) {
  // 1. 优先显示自定义方案
  if (row.customPlan) {
    return row.customPlan.name
  }
  
  // 2. 遍历所有方案，根据方案的关联类型来匹配
  // 如果方案是按专业关联的，则检查班级的majorId是否匹配
  // 如果方案是按层次关联的，则检查班级的trainingLevelId是否匹配
  for (const plan of plans.value) {
    // 方案按专业关联：检查班级的专业是否匹配
    if (plan.majorId && plan.majorId === row.major?.id) {
      return plan.name
    }
    
    // 方案按层次关联：检查班级的层次是否匹配
    if (plan.trainingLevelId && plan.trainingLevelId === row.trainingLevel?.id) {
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
  const cs = settingsStore.settings.current_semester
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
    
    // 如果是首次加载或没有筛选条件，获取所有入学年份
    if (!filterName.value && !filterYear.value && !filterCollege.value && !filterMajor.value && !filterLevel.value && !filterStatus.value && !filterPlan.value) {
      const allRes = await getClasses({ pageSize: 1000 })
      const years = new Set()
      ;(allRes.data?.items || []).forEach(cls => {
        if (cls.enrollmentYear) {
          years.add(cls.enrollmentYear)
        }
      })
      allEnrollmentYears.value = Array.from(years)
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

async function loadMeta() {
  const [majorsRes, plansRes, levelsRes, collegesRes] = await Promise.all([getMajors(), getPlans(), getTrainingLevels(), getColleges()])
  majors.value = majorsRes.data || []
  plans.value = plansRes.data || []
  trainingLevels.value = levelsRes.data || []
  colleges.value = collegesRes.data || []
}

function openDialog(row) {
  form.value = row ? { ...row, customPlanId: row.customPlan?.id || null, trainingLevelId: row.trainingLevel?.id || null, collegeId: row.college?.id || null } : { ...defaultForm }
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
  await deleteClass(id)
  ElMessage.success('删除成功')
  load()
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
    status: '批量设置状态',
  }[type]
  
  // 重置表单
  batchForm.value = {
    majorId: null,
    collegeId: null,
    trainingLevelId: null,
    enrollmentYear: new Date().getFullYear(),
    durationYears: 3,
    status: 'active',
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
      case 'status':
        updateData.status = batchForm.value.status
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

function downloadTemplate() {
  window.open('/api/export/template/classes', '_blank')
}

// 导入前拦截，显示选项对话框
function beforeImport(file) {
  pendingFile.value = file
  importMode.value = 'skip' // 默认跳过重复
  importDialogVisible.value = true
  return false // 阻止自动上传
}

// 确认导入
function confirmImport() {
  importDialogVisible.value = false
  
  // 创建 FormData 并手动上传
  const formData = new FormData()
  formData.append('file', pendingFile.value)
  formData.append('onDuplicate', importMode.value)
  
  fetch('/api/import/classes', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })
    .then(res => res.json())
    .then(data => {
      onImportSuccess(data)
    })
    .catch(err => {
      onImportError(err)
    })
  
  pendingFile.value = null
}

function onImportSuccess(res) {
  const data = res.data || {}
  const message = res.message || '导入完成'
  
  // 构建详细消息
  let detailMsg = message
  
  // 添加自动创建统计信息
  if (data.autoCreated) {
    const { trainingLevels, majors, colleges } = data.autoCreated
    const autoCreatedParts = []
    if (trainingLevels > 0) autoCreatedParts.push(`${trainingLevels}个层次`)
    if (majors > 0) autoCreatedParts.push(`${majors}个专业`)
    if (colleges > 0) autoCreatedParts.push(`${colleges}个学院`)
    if (autoCreatedParts.length > 0) {
      detailMsg += `\n\n✅ 自动创建基础数据：${autoCreatedParts.join('、')}`
    }
  }
  
  // 添加失败详情
  if (data.errors && data.errors.length > 0) {
    detailMsg += '\n\n❌ 失败详情：'
    data.errors.forEach((error, index) => {
      detailMsg += `\n${index + 1}. ${error}`
    })
  }
  
  // 根据结果显示不同类型的消息
  if (data.failed && data.failed > 0) {
    // 有失败记录，显示警告消息
    ElMessage({
      message: detailMsg,
      type: 'warning',
      duration: 10000,
      showClose: true,
    })
  } else if (data.imported > 0 || data.overwritten > 0) {
    // 成功导入，显示成功消息（带详细信息）
    ElMessage({
      message: detailMsg,
      type: 'success',
      duration: 8000,
      showClose: true,
    })
  } else {
    // 其他情况
    ElMessage({
      message: detailMsg,
      type: 'info',
      duration: 6000,
      showClose: true,
    })
  }
  load()
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
</style>
