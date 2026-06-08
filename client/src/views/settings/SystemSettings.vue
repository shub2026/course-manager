<template>
  <div>
    <el-card>
      <template #header><span>系统设置</span></template>
      <el-form :model="form" label-width="160px" class="settings-form">
        <el-form-item label="当前学期">
          <el-select v-model="form.current_semester" placeholder="请选择当前学期" class="full-width">
            <el-option 
              v-for="sem in availableSemesters" 
              :key="sem.value" 
              :label="sem.label" 
              :value="sem.value" 
            />
          </el-select>
          <div class="form-hint">
            格式：起始学年-结束学年-学期序号，如 2025-2026-2 表示2025-2026学年第2学期
          </div>
        </el-form-item>
        <el-form-item label="学期开学日期">
          <el-date-picker v-model="form.semester_start_date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" class="full-width" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSave" :loading="saving">保存设置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useSettingsStore } from '../../stores/settings'

const settingsStore = useSettingsStore()
const saving = ref(false)
const form = ref({
  current_semester: '',
  semester_start_date: '',
})

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

async function load() {
  await settingsStore.load()
  const s = settingsStore.settings
  form.value.current_semester = s.current_semester?.value || ''
  form.value.semester_start_date = s.semester_start_date?.value || ''
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

onMounted(load)
</script>

<style scoped>
.settings-form {
  max-width: 600px;
}
.form-hint {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}
.full-width {
  width: 100%;
}
</style>
