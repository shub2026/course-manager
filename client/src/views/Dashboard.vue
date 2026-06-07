<template>
  <div>
    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="专业类别" :value="stats.majors" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="课程数量" :value="stats.courses" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="班级数量" :value="stats.classes" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="教材数量" :value="stats.textbooks" />
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="培养方案" :value="stats.plans" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="在读学生" :value="stats.totalStudents" />
        </el-card>
      </el-col>
    </el-row>
    <el-card style="margin-top: 20px" v-if="semesterLabel">
      <template #header>当前学期</template>
      <el-tag size="large" type="primary">{{ semesterLabel }}</el-tag>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { getMajors } from '../api/major'
import { getCourses } from '../api/course'
import { getTextbooks } from '../api/textbook'
import { getClasses } from '../api/class'
import { getPlans } from '../api/plan'

const settingsStore = useSettingsStore()
const semesterLabel = computed(() => settingsStore.semesterLabel)
const stats = ref({ majors: 0, courses: 0, classes: 0, textbooks: 0, plans: 0, totalStudents: 0 })

onMounted(async () => {
  try {
    const [majorsRes, coursesRes, textbooksRes, classesRes, plansRes] = await Promise.all([
      getMajors(), getCourses(), getTextbooks(), getClasses(), getPlans(),
    ])
    stats.value.majors = majorsRes.data?.length || 0
    stats.value.courses = coursesRes.data?.length || 0
    stats.value.textbooks = textbooksRes.data?.length || 0
    stats.value.classes = classesRes.data?.length || 0
    stats.value.plans = plansRes.data?.length || 0
    stats.value.totalStudents = (classesRes.data || []).reduce((s, c) => s + (c.studentCount || 0), 0)
  } catch (e) { console.error(e) }
})
</script>
