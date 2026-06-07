<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>专业类别管理</span>
          <el-button type="primary" @click="openDialog()">
            <el-icon><Plus /></el-icon> 新增专业
          </el-button>
        </div>
      </template>
      <el-table :data="list" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="专业名称" />
        <el-table-column prop="code" label="编码" width="120" />
        <el-table-column prop="description" label="描述" />
        <el-table-column label="班级数" width="80">
          <template #default="{ row }">{{ row._count?.classes || 0 }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑专业' : '新增专业'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="专业名称" required>
          <el-input v-model="form.name" placeholder="如：学前教育" />
        </el-form-item>
        <el-form-item label="编码">
          <el-input v-model="form.code" placeholder="可选" />
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
import { getMajors, createMajor, updateMajor, deleteMajor } from '../../api/major'

const list = ref([])
const dialogVisible = ref(false)
const saving = ref(false)
const form = ref({ id: null, name: '', code: '', description: '' })

async function load() {
  const res = await getMajors()
  list.value = res.data || []
}

function openDialog(row) {
  form.value = row ? { ...row } : { id: null, name: '', code: '', description: '' }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.value.name) return ElMessage.warning('请输入专业名称')
  saving.value = true
  try {
    if (form.value.id) {
      await updateMajor(form.value.id, form.value)
    } else {
      await createMajor(form.value)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

async function handleDelete(id) {
  await deleteMajor(id)
  ElMessage.success('删除成功')
  load()
}

onMounted(load)
</script>
