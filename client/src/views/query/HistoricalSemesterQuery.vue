<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>历史学期开课查询</span>
          <div class="card-header-actions">
            <el-select v-model="selectedSemester" placeholder="选择学期" @change="load" class="semester-select">
              <el-option 
                v-for="sem in availableSemesters" 
                :key="sem.value" 
                :label="sem.label" 
                :value="sem.value" 
              />
            </el-select>
            <el-select v-model="filterCollege" clearable placeholder="按学院筛选" @change="load" class="filter-select" :disabled="!selectedSemester">
              <el-option v-for="c in colleges" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-select v-model="filterMajor" clearable placeholder="按专业筛选" @change="load" class="filter-select" :disabled="!selectedSemester">
              <el-option v-for="m in majors" :key="m.id" :label="m.name" :value="m.id" />
            </el-select>
            <el-select v-model="filterLevel" clearable placeholder="按层次筛选" @change="load" class="filter-select" :disabled="!selectedSemester">
              <el-option v-for="l in levels" :key="l.id" :label="l.name" :value="l.id" />
            </el-select>
            <el-select v-model="filterEnrollmentYear" clearable placeholder="按入学年份筛选" @change="load" class="filter-select" :disabled="!selectedSemester">
              <el-option v-for="year in enrollmentYears" :key="year" :label="year + '年'" :value="year" />
            </el-select>
            <el-select v-model="filterGrade" clearable placeholder="按年级筛选" @change="load" class="filter-select" :disabled="!selectedSemester">
              <el-option v-for="g in grades" :key="g" :label="g + '年级'" :value="g" />
            </el-select>
            <el-button type="warning" @click="resetFilters">
              <el-icon><RefreshRight /></el-icon> 重置
            </el-button>
            <el-button type="success" @click="exportExcel">
              <el-icon><Download /></el-icon> 导出Excel
            </el-button>
          </div>
        </div>
      </template>

      <el-alert v-if="!selectedSemester" title="请先选择要查询的学期" type="warning" :closable="false" class="alert-info" />
      <el-alert v-else-if="semesterLabel" :title="`查询学期：${semesterLabel} | 共 ${totalClasses} 个班级`" type="info" :closable="false" class="alert-info" />

      <el-table :data="data" stripe row-key="classId" v-loading="loading">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expand-content">
              <el-table :data="row.courses" size="small" border>
                <el-table-column prop="courseName" label="课程" width="150" />
                <el-table-column label="类型" width="100">
                  <template #default="{ row: c }">
                    <el-tag size="small" :type="c.courseType === 'public' ? 'success' : 'warning'">
                      {{ c.courseType === 'public' ? '公共基础课' : '专业课' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="weeklyHours" label="周课时" width="80" />
                <el-table-column prop="totalHoursThisSemester" label="学期总课时" width="100" />
                <el-table-column label="使用教材" min-width="250">
                  <template #default="{ row: c }">
                    <div v-if="c.textbooks?.length">
                      <div v-for="tb in c.textbooks" :key="tb.id">
                        {{ tb.title }} <el-tag size="small" v-if="tb.isRequired">必订</el-tag>
                      </div>
                    </div>
                    <span v-else class="no-textbook">未指定</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="className" label="班级" min-width="180" />
        <el-table-column prop="collegeName" label="二级学院" width="115" />
        <el-table-column prop="majorName" label="专业" width="150" />
        <el-table-column prop="trainingLevelName" label="培养层次" width="100" />
        <el-table-column label="入学年份" width="90">
          <template #default="{ row }">{{ row.enrollmentYear }}年</template>
        </el-table-column>
        <el-table-column label="年级" width="80">
          <template #default="{ row }">{{ row.grade }}年级</template>
        </el-table-column>
        <el-table-column label="在读学期" width="100">
          <template #default="{ row }">第{{ row.currentSemester }}学期</template>
        </el-table-column>
        <el-table-column prop="studentCount" label="人数" width="70" />
        <el-table-column label="开课数" width="70">
          <template #default="{ row }">{{ row.courses?.length || 0 }}</template>
        </el-table-column>
        <el-table-column label="周课时合计" width="100">
          <template #default="{ row }">{{ (row.courses || []).reduce((s, c) => s + c.weeklyHours, 0) }}</template>
        </el-table-column>
        <el-table-column prop="planName" label="培养方案" min-width="180" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { getSemesterQuery } from '../../api/query'
import { getMajors } from '../../api/major'
import { getTrainingLevels } from '../../api/trainingLevel'
import { getColleges } from '../../api/college'

const data = ref([])
const loading = ref(false)
const majors = ref([])
const levels = ref([])
const colleges = ref([])
const filterCollege = ref(null)
const filterMajor = ref(null)
const filterLevel = ref(null)
const filterEnrollmentYear = ref(null)
const filterGrade = ref(null)
const selectedSemester = ref('')
const semesterLabel = ref('')
const totalClasses = ref(0)

// 生成可选学期列表（前后各3年）
const availableSemesters = computed(() => {
  const currentYear = new Date().getFullYear()
  const semesters = []
  for (let y = currentYear - 3; y <= currentYear + 3; y++) {
    semesters.push(
      { value: `${y}-${y + 1}-1`, label: `${y}-${y + 1}学年 秋季(第1学期)` },
      { value: `${y}-${y + 1}-2`, label: `${y}-${y + 1}学年 春季(第2学期)` }
    )
  }
  return semesters
})

// 计算可用的入学年份列表（从数据中提取）
const enrollmentYears = computed(() => {
  const years = new Set()
  data.value.forEach(item => {
    if (item.enrollmentYear) years.add(item.enrollmentYear)
  })
  return Array.from(years).sort((a, b) => b - a)
})

// 计算可用的年级列表（从数据中提取）
const grades = computed(() => {
  const gradeSet = new Set()
  data.value.forEach(item => {
    if (item.grade) gradeSet.add(item.grade)
  })
  return Array.from(gradeSet).sort((a, b) => a - b)
})

async function load() {
  if (!selectedSemester.value) {
    data.value = []
    semesterLabel.value = ''
    totalClasses.value = 0
    return
  }
  
  loading.value = true
  try {
    const params = { semester: selectedSemester.value }
    if (filterCollege.value) params.collegeId = filterCollege.value
    if (filterMajor.value) params.majorId = filterMajor.value
    if (filterLevel.value) params.trainingLevelId = filterLevel.value
    if (filterEnrollmentYear.value) params.enrollmentYear = filterEnrollmentYear.value
    if (filterGrade.value) params.grade = filterGrade.value
    const res = await getSemesterQuery(params)
    data.value = res.data?.data || []
    semesterLabel.value = res.data?.semesterInfo?.label || ''
    totalClasses.value = res.data?.totalClasses || 0
  } catch (e) { 
    console.error(e)
    ElMessage.error('查询失败')
  }
  finally { loading.value = false }
}

function resetFilters() {
  filterCollege.value = null
  filterMajor.value = null
  filterLevel.value = null
  filterEnrollmentYear.value = null
  filterGrade.value = null
  selectedSemester.value = ''
  data.value = []
  semesterLabel.value = ''
  totalClasses.value = 0
}

function exportExcel() {
  if (!selectedSemester.value) {
    ElMessage.warning('请先选择学期')
    return
  }
  
  const authStore = useAuthStore()
  const token = authStore.token
  if (token) {
    const params = new URLSearchParams()
    params.append('token', token)
    params.append('semester', selectedSemester.value)
    if (filterCollege.value) params.append('collegeId', filterCollege.value)
    if (filterMajor.value) params.append('majorId', filterMajor.value)
    if (filterLevel.value) params.append('trainingLevelId', filterLevel.value)
    if (filterEnrollmentYear.value) params.append('enrollmentYear', filterEnrollmentYear.value)
    if (filterGrade.value) params.append('grade', filterGrade.value)
    
    window.open(`/api/export/semester?${params.toString()}`, '_blank')
  } else {
    ElMessage.warning('请先登录')
  }
}

onMounted(async () => {
  const [levelRes, majorRes, collegeRes] = await Promise.all([
    getTrainingLevels(),
    getMajors(),
    getColleges()
  ])
  levels.value = levelRes.data || []
  majors.value = majorRes.data || []
  colleges.value = collegeRes.data || []
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
  flex-wrap: wrap;
}
.semester-select {
  width: 220px;
}
.filter-select {
  width: 140px;
}
.alert-info {
  margin-bottom: 16px;
}
.expand-content {
  padding: 12px 24px;
}
.no-textbook {
  color: #999;
}
</style>
