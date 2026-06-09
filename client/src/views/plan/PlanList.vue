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
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="name" label="方案名称" min-width="200" />
        <el-table-column label="关联类型" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.majorId" type="success" size="small">按专业</el-tag>
            <el-tag v-else-if="row.trainingLevelId" type="info" size="small">按层次</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="专业" min-width="120">
          <template #default="{ row }">{{ row.major?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="培养层次" min-width="100">
          <template #default="{ row }">{{ row.trainingLevel?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="version" label="版本" width="80" />
        <el-table-column label="课程数" width="80">
          <template #default="{ row }">{{ row._count?.planCourses || 0 }}</template>
        </el-table-column>
        <el-table-column label="使用班级" width="90">
          <template #default="{ row }">{{ row._count?.classes || 0 }}</template>
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
        
        <el-form-item label="关联方式" required>
          <el-radio-group v-model="relationMode" @change="handleModeChange" class="relation-mode-group">
            <el-radio label="major">按专业</el-radio>
            <el-radio label="trainingLevel">按层次</el-radio>
          </el-radio-group>
          <div class="mode-tip">
            <span v-if="relationMode === 'major'">该方案关联特定专业，适用于同一专业的培养方案</span>
            <span v-else-if="relationMode === 'trainingLevel'">该方案关联特定培养层次，适用于跨专业的统一方案</span>
          </div>
        </el-form-item>

        <el-form-item label="关联数据" required>
          <el-select 
            v-if="relationMode === 'major'" 
            v-model="form.majorId" 
            placeholder="请选择专业类别" 
            class="full-width"
          >
            <el-option v-for="m in majors" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
          <el-select 
            v-else 
            v-model="form.trainingLevelId" 
            placeholder="请选择培养层次" 
            class="full-width"
          >
            <el-option v-for="level in trainingLevels" :key="level.id" :label="level.name" :value="level.id" />
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
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { getPlans, createPlan, updatePlan, deletePlan } from '../../api/plan'
import { getMajors } from '../../api/major'
import { getTrainingLevels } from '../../api/trainingLevel'

const list = ref([])
const loading = ref(false)
const majors = ref([])
const trainingLevels = ref([])
const dialogVisible = ref(false)
const saving = ref(false)
const relationMode = ref('major') // 'major' 或 'trainingLevel'
const form = ref({ 
  id: null, 
  name: '', 
  majorId: null, 
  trainingLevelId: null, 
  version: '', 
  description: '' 
})

async function load() {
  loading.value = true
  try {
    const res = await getPlans()
    list.value = res.data || []
  } finally {
    loading.value = false
  }
}

async function loadMeta() {
  const [majorsRes, levelsRes] = await Promise.all([
    getMajors(),
    getTrainingLevels()
  ])
  majors.value = majorsRes.data || []
  trainingLevels.value = levelsRes.data || []
}

function handleModeChange(mode) {
  if (mode === 'major') {
    // 按专业模式：清空层次
    form.value.trainingLevelId = null
  } else {
    // 按层次模式：清空专业
    form.value.majorId = null
  }
}

function openDialog(row) {
  if (row) {
    form.value = { 
      ...row,
      trainingLevelId: row.trainingLevelId || null,
    }
    
    // 根据已有数据确定关联模式（优先判断层次）
    if (row.trainingLevelId) {
      relationMode.value = 'trainingLevel'
    } else {
      relationMode.value = 'major'
    }
  } else {
    form.value = { 
      id: null, 
      name: '', 
      majorId: null, 
      trainingLevelId: null, 
      version: '', 
      description: '' 
    }
    relationMode.value = 'major'
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.value.name) return ElMessage.warning('请填写方案名称')
  
  // 根据关联模式验证必填项
  if (relationMode.value === 'major' && !form.value.majorId) {
    return ElMessage.warning('请选择专业类别')
  }
  if (relationMode.value === 'trainingLevel' && !form.value.trainingLevelId) {
    return ElMessage.warning('请选择培养层次')
  }
  
  saving.value = true
  try {
    const data = {
      name: form.value.name,
      majorId: form.value.majorId || null,
      trainingLevelId: form.value.trainingLevelId || null,
      version: form.value.version,
      description: form.value.description,
    }
    if (form.value.id) {
      await updatePlan(form.value.id, data)
    } else {
      await createPlan(data)
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

async function handleMoveUp(row, index) {
  if (index === 0) return
  
  const currentPlan = list.value[index]
  const prevPlan = list.value[index - 1]
  
  const currentId = currentPlan.id
  const prevId = prevPlan.id
  const currentSortOrder = currentPlan.sortOrder
  const prevSortOrder = prevPlan.sortOrder
  
  try {
    await Promise.all([
      updatePlan(currentId, { sortOrder: prevSortOrder }),
      updatePlan(prevId, { sortOrder: currentSortOrder })
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
  
  const currentPlan = list.value[index]
  const nextPlan = list.value[index + 1]
  
  const currentId = currentPlan.id
  const nextId = nextPlan.id
  const currentSortOrder = currentPlan.sortOrder
  const nextSortOrder = nextPlan.sortOrder
  
  try {
    await Promise.all([
      updatePlan(currentId, { sortOrder: nextSortOrder }),
      updatePlan(nextId, { sortOrder: currentSortOrder })
    ])
    ElMessage.success('排序已更新')
    await load()
  } catch (e) {
    console.error('排序更新失败:', e)
    ElMessage.error('排序更新失败')
  }
}

onMounted(async () => {
  await loadMeta()
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
.relation-mode-group {
  display: flex;
  gap: 16px;
}
.mode-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.5;
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
