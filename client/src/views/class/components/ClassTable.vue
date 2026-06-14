<template>
  <div>
    <el-table 
      :data="classes" 
      stripe 
      v-loading="loading" 
      row-key="id" 
      @selection-change="$emit('selection-change', $event)"
    >
      <el-table-column type="selection" width="45" />
      <el-table-column type="index" label="序号" width="60" />
      <el-table-column prop="name" label="班级名称" min-width="180" show-overflow-tooltip />
      <el-table-column label="二级学院" min-width="115" show-overflow-tooltip>
        <template #default="{ row }">{{ row.colleges?.name || '-' }}</template>
      </el-table-column>
      <el-table-column label="专业" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ row.majors?.name || '-' }}</template>
      </el-table-column>
      <el-table-column label="培养层次" min-width="100" show-overflow-tooltip>
        <template #default="{ row }">{{ row.trainingLevels?.name || '-' }}</template>
      </el-table-column>
      <el-table-column label="入学年份" min-width="85" show-overflow-tooltip>
        <template #default="{ row }">{{ row.enrollmentYear || '-' }}</template>
      </el-table-column>
      <el-table-column label="学制" min-width="55">
        <template #default="{ row }">{{ row.durationYears || '-' }}</template>
      </el-table-column>
      <el-table-column label="人数" min-width="55">
        <template #default="{ row }">{{ row.studentCount || '-' }}</template>
      </el-table-column>
      <el-table-column label="年级" min-width="75">
        <template #default="{ row }">
          <el-tag size="small" v-if="calcGrade(row)">{{ calcGrade(row) }}年级</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" min-width="65">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="当前方案" min-width="130" show-overflow-tooltip>
        <template #default="{ row }">
          <el-tag :type="getPlanTagType(row)" size="small">
            {{ getCurrentPlanName(row) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button size="small" :icon="Edit" @click="$emit('edit', row)" circle title="编辑" />
          <el-popconfirm title="确定删除？" @confirm="$emit('delete', row.id)">
            <template #reference>
              <el-button size="small" :icon="Delete" type="danger" circle title="删除" />
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 批量操作栏 -->
    <div v-if="selectedClasses.length > 0" class="batch-operations">
      <span class="selected-count">已选择 {{ selectedClasses.length }} 个班级</span>
      <el-button type="danger" size="small" @click="$emit('batch-delete')">
        <el-icon><Delete /></el-icon> 批量删除
      </el-button>
      <el-button size="small" @click="$emit('batch-set', 'major')">
        <el-icon><Edit /></el-icon> 批量设置专业
      </el-button>
      <el-button size="small" @click="$emit('batch-set', 'college')">
        <el-icon><Edit /></el-icon> 批量设置学院
      </el-button>
      <el-button size="small" @click="$emit('batch-set', 'level')">
        <el-icon><Edit /></el-icon> 批量设置层次
      </el-button>
      <el-button size="small" @click="$emit('batch-set', 'year')">
        <el-icon><Edit /></el-icon> 批量设置入学年份
      </el-button>
      <el-button size="small" @click="$emit('batch-set', 'duration')">
        <el-icon><Edit /></el-icon> 批量设置学制
      </el-button>
      <el-button size="small" @click="$emit('batch-set', 'leftSchool')">
        <el-icon><Edit /></el-icon> 批量设置离校
      </el-button>
    </div>
    
    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="$emit('size-change')"
        @current-change="$emit('page-change')"
      />
    </div>
  </div>
</template>

<script setup>
import { Edit, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  classes: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  selectedClasses: {
    type: Array,
    default: () => [],
  },
  pagination: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits([
  'selection-change',
  'edit',
  'delete',
  'batch-delete',
  'batch-set',
  'size-change',
  'page-change',
])

function calcGrade(row) {
  if (!row.enrollmentYear) return null
  const currentYear = new Date().getFullYear()
  const grade = currentYear - row.enrollmentYear + 1
  return grade >= 1 && grade <= (row.durationYears || 99) ? grade : null
}

function getStatusType(status) {
  if (status === 'left_school') return 'danger'
  if (status === 'active') return 'success'
  return 'info'
}

function getStatusText(status) {
  if (status === 'left_school') return '离校'
  if (status === 'active') return '在读'
  return '已毕业'
}

function getPlanTagType(row) {
  if (row.customPlanId) return 'warning'
  return 'success'
}

function getCurrentPlanName(row) {
  if (row.customPlanId && row.trainingPlans) {
    return row.trainingPlans.name
  }
  if (row.majors) {
    return `按专业：${row.majors.name}`
  }
  if (row.trainingLevels) {
    return `按层次：${row.trainingLevels.name}`
  }
  return '未关联'
}
</script>

<style scoped>
.batch-operations {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-top: 16px;
  background: #f5f7fa;
  border-radius: 6px;
}

.selected-count {
  margin-right: auto;
  font-weight: 500;
  color: #409eff;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
