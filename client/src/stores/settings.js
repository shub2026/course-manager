import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '../utils/request'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref({})
  const semesterLabel = ref('')

  async function load() {
    const res = await request.get('/settings')
    settings.value = res.data
    const cs = settings.value.current_semester
    if (cs) {
      const parts = cs.value.split('-')
      semesterLabel.value = `${parts[0]}-${parts[1]}学年 第${parts[2]}学期`
    }
  }

  async function save(data) {
    await request.put('/settings', data)
    await load()
  }

  return { settings, semesterLabel, load, save }
})
