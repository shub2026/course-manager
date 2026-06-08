<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>课程管理</span>
          <div class="card-header-actions">
            <el-button @click="downloadTemplate">下载模板</el-button>
            <el-upload :show-file-list="false" accept=".xlsx,.xls" action="/api/import/courses" name="file" :on-success="onImportSuccess" :on-error="onImportError" :before-upload="beforeUpload">
              <el-button>导入Excel</el-button>
            </el-upload>
            <el-button type="primary" @click="openDialog()">
              <el-icon><Plus /></el-icon> 新增课程
            </el-button>
          </div>
        </div>
      </template>
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="课程名称" min-width="150" />
        <el-table-column prop="code" label="编码" width="120" />
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.type === 'public' ? 'success' : 'warning'">
              {{ row.type === 'public' ? '公共基础课' : '专业课' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
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

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑课程' : '新增课程'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="课程名称" required>
          <el-input v-model="form.name" placeholder="请输入课程名称" />
        </el-form-item>
        <el-form-item label="编码">
          <el-input v-model="form.code" placeholder="请输入编码（可选）" />
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio value="public">公共基础课</el-radio>
            <el-radio value="professional">专业课</el-radio>
          </el-radio-group>
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
import { getCourses, createCourse, updateCourse, deleteCourse } from '../../api/course'

const list = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const form = ref({ id: null, name: '', code: '', type: 'public', description: '' })

async function load() {
  loading.value = true
  try {
    const res = await getCourses()
    list.value = res.data || []
  } finally {
    loading.value = false
  }
}

function openDialog(row) {
  form.value = row ? { ...row } : { id: null, name: '', code: '', type: 'public', description: '' }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.value.name) return ElMessage.warning('请输入课程名称')
  saving.value = true
  try {
    if (form.value.id) {
      await updateCourse(form.value.id, form.value)
    } else {
      await createCourse(form.value)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    load()
  } finally {
    saving.value = false
  }
}

async function handleDelete(id) {
  await deleteCourse(id)
  ElMessage.success('删除成功')
  load()
}

function downloadTemplate() {
  window.open('/api/export/template/courses', '_blank')
}

function beforeUpload(file) {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
  if (!isExcel) ElMessage.error('请上传Excel文件')
  return isExcel
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
      updateCourse(newList[index].id, { sortOrder: newList[index].sortOrder }),
      updateCourse(newList[index - 1].id, { sortOrder: newList[index - 1].sortOrder })
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
      updateCourse(newList[index].id, { sortOrder: newList[index].sortOrder }),
      updateCourse(newList[index + 1].id, { sortOrder: newList[index + 1].sortOrder })
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
