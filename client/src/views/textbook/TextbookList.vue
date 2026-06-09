<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>教材管理</span>
          <div class="card-header-actions">
            <el-button @click="downloadTemplate">下载模板</el-button>
            <el-upload :show-file-list="false" accept=".xlsx,.xls" action="/api/import/textbooks" name="file" :on-success="onImportSuccess" :on-error="onImportError">
              <el-button>导入Excel</el-button>
            </el-upload>
            <el-button type="primary" @click="openDialog()">
              <el-icon><Plus /></el-icon> 新增教材
            </el-button>
          </div>
        </div>
      </template>
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="title" label="书名" min-width="180" />
        <el-table-column prop="isbn" label="书号" width="180" />
        <el-table-column prop="publisher" label="出版社" width="195" />
        <el-table-column prop="author" label="作者" width="100" />
        <el-table-column prop="edition" label="版次" width="80" />
        <el-table-column label="定价" width="80">
          <template #default="{ row }">{{ row.price ? '¥' + row.price : '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '启用' : '停用' }}
            </el-tag>
          </template>
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
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" :type="row.isActive ? 'warning' : 'success'" @click="handleToggleStatus(row)">
              {{ row.isActive ? '停用' : '启用' }}
            </el-button>
            <el-popconfirm title="确定删除？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑教材' : '新增教材'" width="600px">
      <el-form :model="form" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="书名" required>
              <el-input v-model="form.title" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="书号">
              <el-input v-model="form.isbn" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="出版社">
              <el-input v-model="form.publisher" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="作者">
              <el-input v-model="form.author" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="版次">
              <el-input v-model="form.edition" placeholder="如：第3版" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="出版日期">
              <el-input v-model="form.publishDate" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="定价">
              <el-input-number v-model="form.price" :min="0" :precision="2" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
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
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { getTextbooks, createTextbook, updateTextbook, deleteTextbook, toggleTextbookStatus } from '../../api/textbook'

const list = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const defaultForm = { id: null, title: '', isbn: '', publisher: '', author: '', edition: '', publishDate: '', price: null, description: '', isActive: true }
const form = ref({ ...defaultForm })

async function load() {
  loading.value = true
  try {
    const res = await getTextbooks()
    list.value = res.data || []
  } finally {
    loading.value = false
  }
}

function openDialog(row) {
  form.value = row ? { ...row } : { ...defaultForm }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.value.title) return ElMessage.warning('请输入书名')
  saving.value = true
  try {
    if (form.value.id) {
      await updateTextbook(form.value.id, form.value)
    } else {
      await createTextbook(form.value)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

async function handleDelete(id) {
  await deleteTextbook(id)
  ElMessage.success('删除成功')
  load()
}

async function handleToggleStatus(row) {
  try {
    await toggleTextbookStatus(row.id)
    ElMessage.success(row.isActive ? '已停用' : '已启用')
    load()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

function downloadTemplate() {
  window.open('/api/export/template/textbooks', '_blank')
}

function onImportSuccess(res) {
  ElMessage.success(res.message || '导入成功')
  load()
}

function onImportError() {
  ElMessage.error('导入失败')
}

async function handleMoveUp(row, index) {
  if (index === 0) return
  
  const newList = [...list.value]
  const tempSortOrder = newList[index].sortOrder
  newList[index].sortOrder = newList[index - 1].sortOrder
  newList[index - 1].sortOrder = tempSortOrder
  
  ;[newList[index], newList[index - 1]] = [newList[index - 1], newList[index]]
  
  try {
    await Promise.all([
      updateTextbook(newList[index].id, { sortOrder: newList[index].sortOrder }),
      updateTextbook(newList[index - 1].id, { sortOrder: newList[index - 1].sortOrder })
    ])
    ElMessage.success('排序已更新')
    list.value = newList
  } catch (e) {
    console.error('排序更新失败:', e)
    ElMessage.error('排序更新失败')
  }
}

async function handleMoveDown(row, index) {
  if (index === list.value.length - 1) return
  
  const newList = [...list.value]
  const tempSortOrder = newList[index].sortOrder
  newList[index].sortOrder = newList[index + 1].sortOrder
  newList[index + 1].sortOrder = tempSortOrder
  
  ;[newList[index], newList[index + 1]] = [newList[index + 1], newList[index]]
  
  try {
    await Promise.all([
      updateTextbook(newList[index].id, { sortOrder: newList[index].sortOrder }),
      updateTextbook(newList[index + 1].id, { sortOrder: newList[index + 1].sortOrder })
    ])
    ElMessage.success('排序已更新')
    list.value = newList
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
.card-header-actions {
  display: flex;
  gap: 12px;
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
