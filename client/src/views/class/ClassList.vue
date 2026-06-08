<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>班级管理</span>
          <div class="card-header-actions">
            <el-select v-model="filterMajor" clearable placeholder="按专业筛选" @change="load" class="filter-select">
              <el-option v-for="m in majors" :key="m.id" :label="m.name" :value="m.id" />
            </el-select>
            <el-button @click="downloadTemplate">下载模板</el-button>
            <el-upload :show-file-list="false" accept=".xlsx,.xls" action="/api/import/classes" name="file" :on-success="onImportSuccess" :on-error="onImportError">
              <el-button>导入Excel</el-button>
            </el-upload>
            <el-button type="primary" @click="openDialog()">
              <el-icon><Plus /></el-icon> 新增班级
            </el-button>
          </div>
        </div>
      </template>
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="班级名称" min-width="140" />
        <el-table-column label="专业" min-width="120">
          <template #default="{ row }">{{ row.major?.name }}</template>
        </el-table-column>
        <el-table-column label="二级学院" min-width="120">
          <template #default="{ row }">{{ row.college?.name || '-' }}</template>
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
        <el-table-column label="特殊方案" min-width="130">
          <template #default="{ row }">
            <el-tag v-if="row.customPlan" type="warning" size="small">{{ row.customPlan.name }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
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
            <el-form-item label="专业类别" required>
              <el-select v-model="form.majorId" class="full-width">
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
            <el-form-item label="培养层次">
              <el-select v-model="form.trainingLevelId" clearable placeholder="请选择" class="full-width">
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
            <el-form-item label="特殊方案">
              <el-select v-model="form.customPlanId" clearable placeholder="默认使用专业方案" class="full-width">
                <el-option v-for="p in plans" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
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
const dialogVisible = ref(false)
const saving = ref(false)
const filterMajor = ref(null)

const defaultForm = { id: null, name: '', majorId: null, enrollmentYear: new Date().getFullYear(), durationYears: 3, collegeId: null, trainingLevelId: null, studentCount: 0, status: 'active', customPlanId: null }
const form = ref({ ...defaultForm })

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
    const params = filterMajor.value ? { majorId: filterMajor.value } : {}
    const res = await getClasses(params)
    list.value = res.data || []
  } finally {
    loading.value = false
  }
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
  if (!form.value.name || !form.value.majorId) return ElMessage.warning('请填写班级名称和专业类别')
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

function downloadTemplate() {
  window.open('/api/export/template/classes', '_blank')
}

function onImportSuccess(res) {
  ElMessage.success(res.message || '导入成功')
  load()
}

function onImportError() {
  ElMessage.error('导入失败')
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
  gap: 12px;
}
.filter-select {
  width: 160px;
}
.full-width {
  width: 100%;
}
</style>
