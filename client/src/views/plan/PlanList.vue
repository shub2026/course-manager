<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>培养方案管理</span>
          <el-button type="primary" @click="openDialog()">
            <el-icon><Plus /></el-icon> 新增方案
          </el-button>
        </div>
      </template>
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="方案名称" min-width="200" />
        <el-table-column label="专业" width="120">
          <template #default="{ row }">{{ row.major?.name }}</template>
        </el-table-column>
        <el-table-column prop="version" label="版本" width="80" />
        <el-table-column label="课程数" width="80">
          <template #default="{ row }">{{ row._count?.planCourses || 0 }}</template>
        </el-table-column>
        <el-table-column label="使用班级" width="90">
          <template #default="{ row }">{{ row._count?.classes || 0 }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="$router.push(`/plans/${row.id}`)">编辑明细</el-button>
            <el-button size="small" @click="openDialog(row)">编辑信息</el-button>
            <el-popconfirm title="确定删除？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑方案' : '新增方案'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="方案名称" required>
          <el-input v-model="form.name" placeholder="如：2024级学前教育培养方案" />
        </el-form-item>
        <el-form-item label="专业类别" required>
          <el-select v-model="form.majorId" class="full-width">
            <el-option v-for="m in majors" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="版本">
          <el-input v-model="form.version" placeholder="如：v1.0" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getPlans, createPlan, updatePlan, deletePlan } from '../../api/plan'
import { getMajors } from '../../api/major'

const list = ref([])
const loading = ref(false)
const majors = ref([])
const dialogVisible = ref(false)
const saving = ref(false)
const form = ref({ id: null, name: '', majorId: null, version: '', description: '' })

async function load() {
  loading.value = true
  try {
    const res = await getPlans()
    list.value = res.data || []
  } finally {
    loading.value = false
  }
}

async function loadMajors() {
  const res = await getMajors()
  majors.value = res.data || []
}

function openDialog(row) {
  form.value = row ? { ...row } : { id: null, name: '', majorId: null, version: '', description: '' }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.value.name || !form.value.majorId) return ElMessage.warning('请填写方案名称和专业类别')
  saving.value = true
  try {
    if (form.value.id) {
      await updatePlan(form.value.id, form.value)
    } else {
      await createPlan(form.value)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

async function handleDelete(id) {
  await deletePlan(id)
  ElMessage.success('删除成功')
  load()
}

onMounted(async () => {
  await loadMajors()
  load()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.full-width {
  width: 100%;
}
</style>
