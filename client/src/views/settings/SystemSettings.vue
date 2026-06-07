<template>
  <div>
    <el-card>
      <template #header><span>系统设置</span></template>
      <el-form :model="form" label-width="160px" class="settings-form">
        <el-form-item label="当前学期">
          <el-input v-model="form.current_semester" placeholder="格式：2025-2026-2" />
          <div class="form-hint">
            格式：起始学年-结束学年-学期序号（1或2），如 2025-2026-2 表示2025-2026学年第2学期
          </div>
        </el-form-item>
        <el-form-item label="学期开学日期">
          <el-date-picker v-model="form.semester_start_date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" class="full-width" />
        </el-form-item>
        <el-form-item label="每学期默认周数">
          <el-input-number v-model="form.weeks_per_semester_default" :min="1" :max="30" />
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
  weeks_per_semester_default: 18,
})

async function load() {
  await settingsStore.load()
  const s = settingsStore.settings
  form.value.current_semester = s.current_semester?.value || ''
  form.value.semester_start_date = s.semester_start_date?.value || ''
  form.value.weeks_per_semester_default = Number(s.weeks_per_semester_default?.value) || 18
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
