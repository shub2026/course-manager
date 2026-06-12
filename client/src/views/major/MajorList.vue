<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>专业类别管理</span>
          <el-button type="primary" @click="openDialog()">
            <el-icon><Plus /></el-icon> 新增专业
          </el-button>
        </div>
      </template>
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="name" label="专业名称" min-width="150" />
        <el-table-column prop="code" label="编码" width="120" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="班级数" width="80">
          <template #default="{ row }">{{ row.classCount || 0 }}</template>
        </el-table-column>
        <el-table-column label="排序" width="120" align="center">
          <template #default="{ row, $index }">
            <div class="sort-buttons">
              <el-button 
                size="small" 
                :icon="ArrowUp" 
                :disabled="$index === 0"
                @click="handleMoveUp(row, $index)"
                circle
                title="上移"
              />
              <el-button 
                size="small" 
                :icon="ArrowDown" 
                :disabled="$index === list.length - 1"
                @click="handleMoveDown(row, $index)"
                circle
                title="下移"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
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
          <el-input v-model="form.name" placeholder="请输入专业名称" />
        </el-form-item>
        <el-form-item label="编码">
          <el-input v-model="form.code" placeholder="请输入编码（可选）" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" placeholder="请输入描述信息（可选）" />
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
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { getMajors, createMajor, updateMajor, deleteMajor } from '../../api/major'

const list = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const form = ref({ id: null, name: '', code: '', description: '' })

async function load() {
  loading.value = true
  try {
    const res = await getMajors()
    list.value = res.data || []
  } finally {
    loading.value = false
  }
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

async function handleMoveUp(row, index) {
  if (index === 0) return
  
  const currentItem = list.value[index]
  const prevItem = list.value[index - 1]
  
  try {
    await Promise.all([
      updateMajor(currentItem.id, { sortOrder: prevItem.sortOrder }),
      updateMajor(prevItem.id, { sortOrder: currentItem.sortOrder })
    ])
    ElMessage.success('排序已更新')
    await load()
  } catch (e) {
    console.error('排序更新失败:', e)
    ElMessage.error('排序更新失败')
  }
}

async function handleMoveDown(row, index) {
  if (index === list.value.length - 1) return
  
  const currentItem = list.value[index]
  const nextItem = list.value[index + 1]
  
  try {
    await Promise.all([
      updateMajor(currentItem.id, { sortOrder: nextItem.sortOrder }),
      updateMajor(nextItem.id, { sortOrder: currentItem.sortOrder })
    ])
    ElMessage.success('排序已更新')
    await load()
  } catch (e) {
    console.error('排序更新失败:', e)
    ElMessage.error('排序更新失败')
  }
}

onMounted(() => {
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
.sort-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}
.sort-buttons .el-button.is-disabled {
  opacity: 0.3;
}
</style>
