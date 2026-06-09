<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>课程管理</span>
          <div class="card-header-actions">
            <el-button @click="downloadTemplate">下载模板</el-button>
            <el-upload 
              :show-file-list="false" 
              accept=".xlsx,.xls" 
              action="/api/import/courses" 
              name="file" 
              :data="{ onDuplicate: importMode }"
              :on-success="onImportSuccess" 
              :on-error="onImportError"
              :before-upload="beforeImport"
            >
              <el-button>导入Excel</el-button>
            </el-upload>
            <el-button type="primary" @click="openDialog()">
              <el-icon><Plus /></el-icon> 新增课程
            </el-button>
          </div>
        </div>
      </template>
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column type="index" label="序号" width="60" />
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

    <!-- 导入选项对话框 -->
    <el-dialog v-model="importDialogVisible" title="导入选项" width="400px">
      <el-form label-width="100px">
        <el-form-item label="重复数据处理">
          <el-radio-group v-model="importMode">
            <el-radio value="skip">跳过重复</el-radio>
            <el-radio value="overwrite">覆盖更新</el-radio>
          </el-radio-group>
          <div class="form-hint">
            跳过重复：如果数据库中已存在则跳过不导入<br>
            覆盖更新：如果数据库中已存在则更新该条数据
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmImport">确认导入</el-button>
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

// 导入相关状态
const importDialogVisible = ref(false)
const importMode = ref('skip') // 'skip' | 'overwrite'
const pendingFile = ref(null)

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

// 导入前拦截，显示选项对话框
function beforeImport(file) {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
  if (!isExcel) {
    ElMessage.error('请上传Excel文件')
    return false
  }
  pendingFile.value = file
  importMode.value = 'skip' // 默认跳过重复
  importDialogVisible.value = true
  return false // 阻止自动上传
}

// 确认导入
function confirmImport() {
  importDialogVisible.value = false
  
  // 创建 FormData 并手动上传
  const formData = new FormData()
  formData.append('file', pendingFile.value)
  formData.append('onDuplicate', importMode.value)
  
  fetch('/api/import/courses', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })
    .then(res => res.json())
    .then(data => {
      onImportSuccess(data)
    })
    .catch(err => {
      onImportError(err)
    })
  
  pendingFile.value = null
}

function onImportSuccess(res) {
  const data = res.data || {}
  const message = res.message || '导入完成'
  
  // 构建详细消息
  let detailMsg = message
  
  // 添加失败详情，每条一行
  if (data.errors && data.errors.length > 0) {
    detailMsg += '\n\n❌ 失败详情：'
    data.errors.forEach((error, index) => {
      detailMsg += `\n${index + 1}. ${error}`
    })
  }
  
  // 根据结果显示不同类型的消息
  if (data.failed && data.failed > 0) {
    // 有失败记录，显示警告消息
    ElMessage({
      message: detailMsg,
      type: 'warning',
      duration: 10000,
      showClose: true,
    })
  } else if (data.imported > 0 || data.overwritten > 0) {
    // 成功导入，显示成功消息（带详细信息）
    ElMessage({
      message: detailMsg,
      type: 'success',
      duration: 8000,
      showClose: true,
    })
  } else {
    // 其他情况
    ElMessage({
      message: detailMsg,
      type: 'info',
      duration: 6000,
      showClose: true,
    })
  }
  load()
}

function onImportError(err) {
  console.error('导入错误:', err)
  ElMessage.error('导入失败，请检查文件格式或联系管理员')
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
.form-hint {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.5;
}
</style>
