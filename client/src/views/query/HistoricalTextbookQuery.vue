<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>历史学期教材使用情况查询</span>
          <div class="card-header-actions">
            <el-select v-model="selectedSemester" placeholder="选择学期" @change="onSemesterChange" class="semester-select">
              <el-option 
                v-for="sem in availableSemesters" 
                :key="sem.value" 
                :label="sem.label" 
                :value="sem.value" 
              />
            </el-select>
          </div>
        </div>
      </template>

      <div class="query-toolbar">
        <el-select 
          v-model="selectedTextbook" 
          filterable 
          placeholder="搜索并选择教材" 
          @change="loadDetail" 
          class="textbook-select"
        >
          <el-option v-for="tb in textbooks" :key="tb.id" :label="`${tb.title} - ${tb.publisher || '未知出版社'}`" :value="tb.id" />
        </el-select>
        <el-button type="success" :disabled="!selectedTextbook || !selectedSemester" @click="exportExcel">
          <el-icon><Download /></el-icon> 导出Excel
        </el-button>
      </div>

      <el-alert v-if="!selectedSemester" title="请先选择要查询的学期，然后选择教材查看详情" type="warning" :closable="false" class="alert-info" />
      
      <div v-else-if="detail">
        <el-descriptions :column="3" border class="textbook-descriptions">
          <el-descriptions-item label="书名">{{ detail.textbook?.title }}</el-descriptions-item>
          <el-descriptions-item label="书号">{{ detail.textbook?.isbn || '-' }}</el-descriptions-item>
          <el-descriptions-item label="出版社">{{ detail.textbook?.publisher || '-' }}</el-descriptions-item>
          <el-descriptions-item label="作者">{{ detail.textbook?.author || '-' }}</el-descriptions-item>
          <el-descriptions-item label="查询学期">{{ detail.semesterInfo?.label }}</el-descriptions-item>
        </el-descriptions>

        <el-alert :title="`共 ${detail.totalClasses} 个班级使用，合计 ${detail.totalStudents} 名学生`" type="success" :closable="false" class="alert-success" />

        <el-table :data="detail.classes" stripe v-loading="loadingDetail">
          <el-table-column prop="className" label="班级" min-width="180" fixed />
          <el-table-column prop="courseName" label="对应课程" min-width="180" />
          <el-table-column prop="majorName" label="专业" min-width="150" show-overflow-tooltip />
          <el-table-column prop="trainingLevelName" label="培养层次" width="110" />
          <el-table-column label="年级" width="90" align="center">
            <template #default="{ row }">{{ row.grade }}年级</template>
          </el-table-column>
          <el-table-column prop="studentCount" label="学生人数" width="100" align="center" />
          <el-table-column label="使用学期" width="100" align="center">
            <template #default="{ row }">第{{ row.semester }}学期</template>
          </el-table-column>
          <el-table-column label="是否必订" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.isRequired ? 'danger' : 'info'" size="small">{{ row.isRequired ? '必订' : '选修' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-empty v-else-if="selectedSemester && !selectedTextbook" description="请选择要查询的教材" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { getTextbooks } from '../../api/textbook'
import { getTextbookQuery } from '../../api/query'

const textbooks = ref([])
const loadingDetail = ref(false)
const selectedTextbook = ref(null)
const selectedSemester = ref('')
const detail = ref(null)

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

async function loadDetail(id) {
  if (!id || !selectedSemester.value) { 
    detail.value = null
    return 
  }
  
  loadingDetail.value = true
  try {
    const res = await getTextbookQuery(id, { semester: selectedSemester.value })
    detail.value = res.data
  } catch (e) { 
    ElMessage.error('加载教材使用详情失败')
    detail.value = null 
  }
  finally { 
    loadingDetail.value = false 
  }
}

function onSemesterChange() {
  // 切换学期时清空已选教材和详情
  selectedTextbook.value = null
  detail.value = null
}

async function loadTextbooks() {
  try {
    const res = await getTextbooks()
    // 只显示启用的教材
    textbooks.value = (res.data || []).filter(t => t.isActive)
  } catch (e) {
    ElMessage.error('加载教材列表失败')
    textbooks.value = []
  }
}

async function exportExcel() {
  if (!selectedTextbook.value || !selectedSemester.value) {
    ElMessage.warning('请先选择学期和教材')
    return
  }
  
  const authStore = useAuthStore()
  try {
    const response = await fetch(`/api/export/textbook/${selectedTextbook.value}?semester=${selectedSemester.value}`, {
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
    a.download = `教材使用_${new Date().getTime()}.xlsx`
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

onMounted(async () => {
  // 初始加载教材列表（所有启用的教材）
  await loadTextbooks()
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
.semester-select {
  width: 220px;
}
.query-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
.textbook-select {
  width: 400px;
}
.textbook-descriptions {
  margin-bottom: 20px;
}
.alert-info {
  margin-bottom: 16px;
}
.alert-success {
  margin-bottom: 16px;
}
.no-textbook {
  color: #999;
}
</style>
