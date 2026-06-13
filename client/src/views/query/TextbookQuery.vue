<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>教材使用情况查询</span>
          <div class="card-header-actions">
            <el-select v-model="selectedTextbook" filterable placeholder="搜索并选择教材" @change="loadDetail" class="filter-select">
              <el-option v-for="tb in textbooks" :key="tb.id" :label="`${tb.title} - ${tb.publisher || '未知出版社'}`" :value="tb.id" />
            </el-select>
            <el-button type="success" :disabled="!selectedTextbook" @click="exportExcel">
              <el-icon><Download /></el-icon> 导出Excel
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="detail">
        <el-descriptions :column="3" border class="textbook-descriptions">
          <el-descriptions-item label="书名">{{ detail.textbook?.title }}</el-descriptions-item>
          <el-descriptions-item label="书号">{{ detail.textbook?.isbn || '-' }}</el-descriptions-item>
          <el-descriptions-item label="出版社">{{ detail.textbook?.publisher || '-' }}</el-descriptions-item>
          <el-descriptions-item label="作者">{{ detail.textbook?.author || '-' }}</el-descriptions-item>
          <el-descriptions-item label="出版日期">{{ detail.textbook?.publishDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前学期">{{ detail.semesterInfo?.label }}</el-descriptions-item>
        </el-descriptions>

        <el-alert :title="`共 ${detail.totalClasses} 个班级使用，合计 ${detail.totalStudents} 名学生`" type="success" :closable="false" class="alert-success" />

        <el-table :data="paginatedClasses" stripe v-loading="loadingDetail">
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
      </div>

      <el-empty v-else-if="!selectedTextbook" description="请选择要查询的教材" />
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
const detail = ref(null)

// 分页状态
const pagination = ref({
  page: 1,
  pageSize: 50,
  total: 0,
})

// 计算分页后的班级数据
const paginatedClasses = computed(() => {
  if (!detail.value || !detail.value.classes) return []
  const start = (pagination.value.page - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return detail.value.classes.slice(start, end)
})

async function loadDetail(id) {
  if (!id) { 
    detail.value = null
    pagination.value.total = 0
    return 
  }
  loadingDetail.value = true
  try {
    const res = await getTextbookQuery(id)
    detail.value = res.data
    // 重置分页并设置总数
    pagination.value.page = 1
    pagination.value.total = res.data?.totalClasses || 0
  } catch (e) { 
    ElMessage.error('加载教材使用详情失败')
    detail.value = null 
    pagination.value.total = 0
  }
  finally { loadingDetail.value = false }
}

// 分页处理函数
function handlePageChange(page) {
  pagination.value.page = page
}

function handleSizeChange(size) {
  pagination.value.pageSize = size
  pagination.value.page = 1 // 重置到第一页
}

async function exportExcel() {
  if (selectedTextbook.value) {
    const authStore = useAuthStore()
    try {
      const response = await fetch(`/api/export/textbook/${selectedTextbook.value}`, {
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
}

onMounted(async () => {
  try {
    const res = await getTextbooks()
    // 只显示启用的教材
    textbooks.value = (res.data || []).filter(t => t.isActive)
  } catch (e) {
    ElMessage.error('加载教材列表失败')
    textbooks.value = []
  }
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
.filter-select {
  width: 400px;
}
.textbook-descriptions {
  margin-bottom: 20px;
}
.alert-success {
  margin-bottom: 16px;
}
.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding: 12px 0;
}
</style>
