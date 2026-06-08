<template>
  <div>
    <el-card>
      <template #header>
        <span>教材使用情况查询</span>
      </template>

      <div class="query-toolbar">
        <el-select v-model="selectedTextbook" filterable placeholder="搜索并选择教材" @change="loadDetail" class="textbook-select">
          <el-option v-for="tb in textbooks" :key="tb.id" :label="`${tb.title} - ${tb.publisher || '未知出版社'}`" :value="tb.id" />
        </el-select>
        <el-button type="success" :disabled="!selectedTextbook" @click="exportExcel">
          <el-icon><Download /></el-icon> 导出Excel
        </el-button>
      </div>

      <div v-if="detail">
        <el-descriptions :column="3" border class="textbook-descriptions">
          <el-descriptions-item label="书名">{{ detail.textbook?.title }}</el-descriptions-item>
          <el-descriptions-item label="书号">{{ detail.textbook?.isbn || '-' }}</el-descriptions-item>
          <el-descriptions-item label="出版社">{{ detail.textbook?.publisher || '-' }}</el-descriptions-item>
          <el-descriptions-item label="作者">{{ detail.textbook?.author || '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前学期">{{ detail.semesterInfo?.label }}</el-descriptions-item>
        </el-descriptions>

        <el-alert :title="`共 ${detail.totalClasses} 个班级使用，合计 ${detail.totalStudents} 名学生`" type="success" :closable="false" class="alert-success" />

        <el-table :data="detail.classes" stripe v-loading="loadingDetail">
          <el-table-column prop="className" label="班级" min-width="160" />
          <el-table-column prop="majorName" label="专业" min-width="150" />
          <el-table-column prop="trainingLevelName" label="培养层次" width="100" />
          <el-table-column label="年级" width="80">
            <template #default="{ row }">{{ row.grade }}年级</template>
          </el-table-column>
          <el-table-column prop="courseName" label="对应课程" min-width="150" />
          <el-table-column prop="studentCount" label="学生人数" width="90" />
          <el-table-column label="使用学期" width="100">
            <template #default="{ row }">第{{ row.semester }}学期</template>
          </el-table-column>
          <el-table-column label="是否必订" width="90">
            <template #default="{ row }">
              <el-tag :type="row.isRequired ? 'danger' : 'info'" size="small">{{ row.isRequired ? '必订' : '选修' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-empty v-else-if="!selectedTextbook" description="请选择要查询的教材" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getTextbooks } from '../../api/textbook'
import { getTextbookQuery } from '../../api/query'

const textbooks = ref([])
const loadingDetail = ref(false)
const selectedTextbook = ref(null)
const detail = ref(null)

async function loadDetail(id) {
  if (!id) { detail.value = null; return }
  loadingDetail.value = true
  try {
    const res = await getTextbookQuery(id)
    detail.value = res.data
  } catch (e) { detail.value = null }
  finally { loadingDetail.value = false }
}

function exportExcel() {
  if (selectedTextbook.value) {
    window.open(`/api/export/textbook/${selectedTextbook.value}`, '_blank')
  }
}

onMounted(async () => {
  const res = await getTextbooks()
  // 只显示启用的教材
  textbooks.value = (res.data || []).filter(t => t.isActive)
})
</script>

<style scoped>
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
.alert-success {
  margin-bottom: 16px;
}
</style>
