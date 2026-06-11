<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>教材管理</span>
          <div class="card-header-actions">
            <el-input v-model="filterTitle" clearable placeholder="按书名筛选" @input="handleFilter" class="filter-title" />
            <el-select v-model="filterCategory" placeholder="类别筛选" clearable style="width: 120px" @change="handleFilter">
              <el-option label="技工" value="技工" />
              <el-option label="非技工" value="非技工" />
            </el-select>
            <el-select v-model="filterPublisher" placeholder="出版社筛选" clearable filterable style="width: 160px" @change="handleFilter">
              <el-option v-for="pub in publishers" :key="pub" :label="pub" :value="pub" />
            </el-select>
            <el-button @click="downloadTemplate">下载模板</el-button>
            <el-upload 
              :show-file-list="false" 
              accept=".xlsx,.xls" 
              action="/api/import/textbooks" 
              name="file" 
              :data="{ onDuplicate: importMode }"
              :on-success="onImportSuccess" 
              :on-error="onImportError"
              :before-upload="beforeImport"
            >
              <el-button>导入Excel</el-button>
            </el-upload>
            <el-button type="primary" @click="openDialog()">
              <el-icon><Plus /></el-icon> 新增教材
            </el-button>
          </div>
        </div>
      </template>
      <el-table :data="filteredlist" stripe v-loading="loading" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="45" />
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="title" label="书名" min-width="180" show-overflow-tooltip />
        <el-table-column prop="isbn" label="书号" min-width="120" show-overflow-tooltip />
        <el-table-column prop="publisher" label="出版社" min-width="120" show-overflow-tooltip />
        <el-table-column prop="author" label="作者" min-width="80" show-overflow-tooltip />
        <el-table-column prop="edition" label="版次" width="70" />
        <el-table-column label="定价" width="80">
          <template #default="{ row }">{{ row.price ? '¥' + row.price : '-' }}</template>
        </el-table-column>
        <el-table-column label="类别" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.category" :type="row.category === '技工' ? 'primary' : 'info'" size="small">
              {{ row.category }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
              {{ row.is_active ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="排序" width="100" align="center">
          <template #default="{ row, $index }">
            <div class="sort-buttons">
              <el-button 
                size="small" 
                :icon="ArrowUp" 
                :disabled="$index === 0"
                @click="handleMoveUp(row)"
                circle
                title="上移"
              />
              <el-button 
                size="small" 
                :icon="ArrowDown" 
                :disabled="$index === filteredlist.length - 1"
                @click="handleMoveDown(row)"
                circle
                title="下移"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button size="small" :type="row.is_active ? 'warning' : 'success'" @click="handleToggleStatus(row)">
                {{ row.is_active ? '停用' : '启用' }}
              </el-button>
              <el-button size="small" :icon="Edit" circle @click="openDialog(row)" title="编辑" />
              <el-popconfirm title="确定删除？" @confirm="handleDelete(row.id)">
                <template #reference>
                  <el-button size="small" :icon="Delete" circle type="danger" title="删除" />
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 批量操作栏 -->
      <div v-if="selectedTextbooks.length > 0" class="batch-operations">
        <span class="selected-count">已选择 {{ selectedTextbooks.length }} 个教材</span>
        <el-button size="small" @click="openBatchSetDialog('publisher')">
          <el-icon><Edit /></el-icon> 批量设置出版社
        </el-button>
        <el-button size="small" @click="openBatchSetDialog('author')">
          <el-icon><Edit /></el-icon> 批量设置作者
        </el-button>
        <el-button size="small" @click="openBatchSetDialog('category')">
          <el-icon><Edit /></el-icon> 批量设置类别
        </el-button>
        <el-popconfirm title="确定批量删除选中的教材？" @confirm="handleBatchDelete">
          <template #reference>
            <el-button size="small" type="danger">
              <el-icon><Delete /></el-icon> 批量删除
            </el-button>
          </template>
        </el-popconfirm>
      </div>
    </el-card>

    <!-- 批量设置对话框 -->
    <el-dialog v-model="batchDialogVisible" :title="batchDialogTitle" width="500px">
      <el-form label-width="100px">
        <el-form-item v-if="batchFormType === 'publisher'" label="出版社">
          <el-input v-model="batchForm.publisher" placeholder="请输入出版社名称" />
        </el-form-item>
        <el-form-item v-else-if="batchFormType === 'author'" label="作者">
          <el-input v-model="batchForm.author" placeholder="请输入作者姓名" />
        </el-form-item>
        <el-form-item v-else-if="batchFormType === 'category'" label="类别">
          <el-select v-model="batchForm.category" placeholder="请选择类别" style="width: 100%">
            <el-option label="技工" value="技工" />
            <el-option label="非技工" value="非技工" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBatchSet" :loading="batchSaving">确定</el-button>
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
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="类别">
              <el-select v-model="form.category" style="width: 100%">
                <el-option label="技工" value="技工" />
                <el-option label="非技工" value="非技工" />
              </el-select>
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
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowUp, ArrowDown, Edit, Delete } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'
import { getTextbooks, createTextbook, updateTextbook, deleteTextbook, toggleTextbookStatus } from '../../api/textbook'

const list = ref([])
const authStore = useAuthStore()
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const filterTitle = ref('')
const filterCategory = ref('')
const filterPublisher = ref('')
const defaultForm = { id: null, title: '', isbn: '', publisher: '', author: '', edition: '', publishDate: '', price: null, category: '', description: '', is_active: true }
const form = ref({ ...defaultForm })

// 批量操作相关状态
const selectedTextbooks = ref([])
const batchDialogVisible = ref(false)
const batchSaving = ref(false)
const batchFormType = ref('') // publisher, author, category
const batchDialogTitle = ref('')
const batchForm = ref({
  publisher: '',
  author: '',
  category: '',
})

// 导入相关状态
const importDialogVisible = ref(false)
const importMode = ref('skip') // 'skip' | 'overwrite'
const pendingFile = ref(null)

// 获取所有出版社列表
const publishers = computed(() => {
  const pubs = new Set()
  list.value.forEach(item => {
    if (item.publisher) pubs.add(item.publisher)
  })
  return Array.from(pubs).sort()
})

// 筛选后的列表
const filteredlist = computed(() => {
  let result = list.value
  if (filterTitle.value) {
    const titleLower = filterTitle.value.toLowerCase()
    result = result.filter(item => item.title && item.title.toLowerCase().includes(titleLower))
  }
  if (filterCategory.value) {
    result = result.filter(item => item.category === filterCategory.value)
  }
  if (filterPublisher.value) {
    result = result.filter(item => item.publisher === filterPublisher.value)
  }
  return result
})

async function load() {
  loading.value = true
  try {
    const res = await getTextbooks()
    list.value = res.data || []
  } finally {
    loading.value = false
  }
}

function handleFilter() {
  // 筛选由computed自动处理
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
    const res = await toggleTextbookStatus(row.id)
    // 使用后端返回的最新状态
    const newStatus = res.data?.is_active
    ElMessage.success(newStatus ? '已启用' : '已停用')
    load()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

// ==================== 批量操作函数 ====================

// 选择变化处理
function handleSelectionChange(selection) {
  selectedTextbooks.value = selection
}

// 打开批量设置对话框
function openBatchSetDialog(type) {
  batchFormType.value = type
  batchDialogTitle.value = {
    publisher: '批量设置出版社',
    author: '批量设置作者',
    category: '批量设置类别',
  }[type]
  
  // 重置表单
  batchForm.value = {
    publisher: '',
    author: '',
    category: '',
  }
  
  batchDialogVisible.value = true
}

// 执行批量设置
async function handleBatchSet() {
  const type = batchFormType.value
  
  // 验证
  if (type === 'publisher' && !batchForm.value.publisher) {
    return ElMessage.warning('请输入出版社名称')
  }
  if (type === 'author' && !batchForm.value.author) {
    return ElMessage.warning('请输入作者姓名')
  }
  if (type === 'category' && !batchForm.value.category) {
    return ElMessage.warning('请选择类别')
  }
  
  batchSaving.value = true
  try {
    const ids = selectedTextbooks.value.map(t => t.id)
    const updateData = {}
    
    switch (type) {
      case 'publisher':
        updateData.publisher = batchForm.value.publisher
        break
      case 'author':
        updateData.author = batchForm.value.author
        break
      case 'category':
        updateData.category = batchForm.value.category
        break
    }
    
    await Promise.all(ids.map(id => updateTextbook(id, updateData)))
    ElMessage.success(`已成功更新 ${ids.length} 个教材`)
    batchDialogVisible.value = false
    selectedTextbooks.value = []
    load()
  } catch (e) {
    console.error('批量更新失败:', e)
    ElMessage.error('批量更新失败')
  } finally {
    batchSaving.value = false
  }
}

// 批量删除
async function handleBatchDelete() {
  if (selectedTextbooks.value.length === 0) return
  
  const ids = selectedTextbooks.value.map(t => t.id)
  
  try {
    await Promise.all(ids.map(id => deleteTextbook(id)))
    ElMessage.success(`已删除 ${ids.length} 个教材`)
    selectedTextbooks.value = []
    load()
  } catch (e) {
    console.error('批量删除失败:', e)
    ElMessage.error('批量删除失败')
  }
}

function downloadTemplate() {
  const token = authStore.token
  if (token) {
    window.open(`/api/export/template/textbooks?token=${token}`, '_blank')
  } else {
    ElMessage.warning('请先登录')
  }
}

// 导入前拦截，显示选项对话框
function beforeImport(file) {
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
  
  fetch('/api/import/textbooks', {
    method: 'POST',
    headers: {
      'Authorization': authStore.token ? `Bearer ${authStore.token}` : '',
    },
    body: formData,
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

async function handleMoveUp(row) {
  const currentIndex = list.value.findIndex(item => item.id === row.id)
  if (currentIndex === 0 || currentIndex === -1) return

  const currentTextbook = list.value[currentIndex]
  const prevTextbook = list.value[currentIndex - 1]

  // 保存原始的 id 和 sortOrder
  const currentId = currentTextbook.id
  const prevId = prevTextbook.id
  const currentSortOrder = currentTextbook.sort_order
  const prevSortOrder = prevTextbook.sort_order

  try {
    // 交换两个教材的 sortOrder
    await Promise.all([
      updateTextbook(currentId, { sort_order: prevSortOrder }),
      updateTextbook(prevId, { sort_order: currentSortOrder })
    ])
    ElMessage.success('排序已更新')
    await load()
  } catch (e) {
    console.error('排序更新失败:', e)
    ElMessage.error('排序更新失败')
  }
}

async function handleMoveDown(row) {
  const currentIndex = list.value.findIndex(item => item.id === row.id)
  if (currentIndex === -1 || currentIndex === list.value.length - 1) return

  const currentTextbook = list.value[currentIndex]
  const nextTextbook = list.value[currentIndex + 1]

  // 保存原始的 id 和 sortOrder
  const currentId = currentTextbook.id
  const nextId = nextTextbook.id
  const currentSortOrder = currentTextbook.sort_order
  const nextSortOrder = nextTextbook.sort_order

  try {
    // 交换两个教材的 sortOrder
    await Promise.all([
      updateTextbook(currentId, { sort_order: nextSortOrder }),
      updateTextbook(nextId, { sort_order: currentSortOrder })
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
.card-header-actions {
  display: flex;
  gap: 12px;
}
.filter-title {
  width: 200px;
}
.sort-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
}
.sort-buttons .el-button.is-disabled {
  opacity: 0.3;
}
.action-buttons {
  display: flex;
  gap: 6px;
  align-items: center;
  white-space: nowrap;
}
.form-hint {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.5;
}
.batch-operations {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-top: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
  flex-wrap: wrap;
}
.selected-count {
  color: #409eff;
  font-weight: 500;
  margin-right: auto;
}
</style>
