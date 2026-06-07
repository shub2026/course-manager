<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>当前学期开课查询</span>
          <div style="display: flex; gap: 8px">
            <el-select v-model="filterMajor" clearable placeholder="按专业筛选" @change="load" style="width: 160px">
              <el-option v-for="m in majors" :key="m.id" :label="m.name" :value="m.id" />
            </el-select>
            <el-button type="success" @click="exportExcel">
              <el-icon><Download /></el-icon> 导出Excel
            </el-button>
          </div>
        </div>
      </template>

      <el-alert v-if="semesterLabel" :title="`当前学期：${semesterLabel} | 共 ${totalClasses} 个班级`" type="info" :closable="false" style="margin-bottom: 16px" />

      <el-table :data="data" stripe row-key="classId">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div style="padding: 12px 24px">
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
                    <span v-else style="color: #999">未指定</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="className" label="班级" min-width="180" />
        <el-table-column prop="majorName" label="专业" width="120" />
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

const data = ref([])
const majors = ref([])
const filterMajor = ref(null)
const semesterLabel = ref('')
const totalClasses = ref(0)

async function load() {
  try {
    const params = filterMajor.value ? { majorId: filterMajor.value } : {}
    const res = await getSemesterQuery(params)
    data.value = res.data?.data || []
    semesterLabel.value = res.data?.semesterInfo?.label || ''
    totalClasses.value = res.data?.totalClasses || 0
  } catch (e) { console.error(e) }
}

function exportExcel() {
  window.open('/api/export/semester', '_blank')
}

onMounted(async () => {
  const res = await getMajors()
  majors.value = res.data || []
  load()
})
</script>
