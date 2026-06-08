<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>当前学期开课查询</span>
          <div class="card-header-actions">
            <el-select v-model="filterCollege" clearable placeholder="按学院筛选" @change="load" class="filter-select">
              <el-option v-for="c in colleges" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-select v-model="filterMajor" clearable placeholder="按专业筛选" @change="load" class="filter-select">
              <el-option v-for="m in majors" :key="m.id" :label="m.name" :value="m.id" />
            </el-select>
            <el-select v-model="filterLevel" clearable placeholder="按层次筛选" @change="load" class="filter-select">
              <el-option v-for="l in levels" :key="l.id" :label="l.name" :value="l.id" />
            </el-select>
            <el-button type="success" @click="exportExcel">
              <el-icon><Download /></el-icon> 导出Excel
            </el-button>
          </div>
        </div>
      </template>

      <el-alert v-if="semesterLabel" :title="`当前学期：${semesterLabel} | 共 ${totalClasses} 个班级`" type="info" :closable="false" class="alert-info" />

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
        <el-table-column prop="collegeName" label="二级学院" min-width="120" />
        <el-table-column prop="majorName" label="专业" min-width="150" />
        <el-table-column prop="trainingLevelName" label="培养层次" width="100" />
        <el-table-column label="年级" width="80">
          <template #default="{ row }">{{ row.grade }}年级</template>
        </el-table-column>
        <el-table-column label="当前学期" width="90">
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
import { ref, onMounted } from 'vue'
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
const semesterLabel = ref('')
const totalClasses = ref(0)

async function load() {
  loading.value = true
  try {
    const params = {}
    if (filterCollege.value) params.collegeId = filterCollege.value
    if (filterMajor.value) params.majorId = filterMajor.value
    if (filterLevel.value) params.trainingLevelId = filterLevel.value
    const res = await getSemesterQuery(params)
    data.value = res.data?.data || []
    semesterLabel.value = res.data?.semesterInfo?.label || ''
    totalClasses.value = res.data?.totalClasses || 0
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

function exportExcel() {
  window.open('/api/export/semester', '_blank')
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
