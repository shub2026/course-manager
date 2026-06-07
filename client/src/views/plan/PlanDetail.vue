<template>
  <div>
    <el-page-header @back="$router.push('/plans')" style="margin-bottom: 16px">
      <template #content>
        <span>{{ plan?.name || '方案明细' }}</span>
        <el-tag v-if="plan?.major" style="margin-left: 12px">{{ plan.major.name }}</el-tag>
      </template>
    </el-page-header>

    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>课程安排</span>
          <el-button type="primary" @click="showAddCourse = true">
            <el-icon><Plus /></el-icon> 添加课程
          </el-button>
        </div>
      </template>

      <el-table :data="courses" stripe row-key="id">
        <el-table-column label="课程" min-width="150">
          <template #default="{ row }">
            <span>{{ row.course?.name }}</span>
            <el-tag size="small" :type="row.course?.type === 'public' ? 'success' : 'warning'" style="margin-left: 8px">
              {{ row.course?.type === 'public' ? '公共' : '专业' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="开课学期" width="120">
          <template #default="{ row }">第{{ row.startSemester }}-{{ row.endSemester }}学期</template>
        </el-table-column>
        <el-table-column label="周课时" width="80">
          <template #default="{ row }">{{ row.weeklyHours }}</template>
        </el-table-column>
        <el-table-column label="学期周数" width="90">
          <template #default="{ row }">{{ row.weeksPerSemester }}</template>
        </el-table-column>
        <el-table-column label="总课时" width="80">
          <template #default="{ row }">{{ row.weeklyHours * row.weeksPerSemester * (row.endSemester - row.startSemester + 1) }}</template>
        </el-table-column>
        <el-table-column label="关联教材" min-width="200">
          <template #default="{ row }">
            <div v-if="row.planTextbooks?.length">
              <el-tag v-for="pt in row.planTextbooks" :key="pt.id" closable size="small" style="margin: 2px" @close="removeTextbook(pt.id)">
                第{{ pt.semester }}学期: {{ pt.textbook?.title }}
              </el-tag>
            </div>
            <span v-else style="color: #999">未关联教材</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEditCourse(row)">编辑</el-button>
            <el-button size="small" type="success" @click="openAddTextbook(row)">关联教材</el-button>
            <el-popconfirm title="确定删除？" @confirm="removeCourse(row.id)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑课程 -->
    <el-dialog v-model="showAddCourse" :title="editCourse.id ? '编辑课程' : '添加课程到方案'" width="500px">
      <el-form :model="editCourse" label-width="100px">
        <el-form-item label="选择课程" required>
          <el-select v-model="editCourse.courseId" filterable :disabled="!!editCourse.id" style="width: 100%">
            <el-option v-for="c in allCourses" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="起始学期" required>
              <el-input-number v-model="editCourse.startSemester" :min="1" :max="12" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束学期" required>
              <el-input-number v-model="editCourse.endSemester" :min="1" :max="12" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="每周课时" required>
              <el-input-number v-model="editCourse.weeklyHours" :min="1" :max="20" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学期周数">
              <el-input-number v-model="editCourse.weeksPerSemester" :min="1" :max="30" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="showAddCourse = false">取消</el-button>
        <el-button type="primary" @click="saveCourse" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 关联教材 -->
    <el-dialog v-model="showAddTextbook" title="关联教材" width="500px">
      <el-form :model="textbookForm" label-width="100px">
        <el-form-item label="课程">
          <el-input :value="textbookForm.courseName" disabled />
        </el-form-item>
        <el-form-item label="选择教材" required>
          <el-select v-model="textbookForm.textbookId" filterable style="width: 100%">
            <el-option v-for="t in allTextbooks" :key="t.id" :label="`${t.title} (${t.publisher || ''})`" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="使用学期" required>
          <el-input-number v-model="textbookForm.semester" :min="1" :max="12" style="width: 100%" />
        </el-form-item>
        <el-form-item label="是否必订">
          <el-switch v-model="textbookForm.isRequired" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddTextbook = false">取消</el-button>
        <el-button type="primary" @click="saveTextbook" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getPlans, getPlanCourses, addPlanCourse, updatePlanCourse, deletePlanCourse, addPlanTextbook, deletePlanTextbook } from '../../api/plan'
import { getCourses } from '../../api/course'
import { getTextbooks } from '../../api/textbook'

const route = useRoute()
const planId = Number(route.params.id)
const plan = ref(null)
const courses = ref([])
const allCourses = ref([])
const allTextbooks = ref([])
const saving = ref(false)

const showAddCourse = ref(false)
const editCourse = ref({ id: null, courseId: null, startSemester: 1, endSemester: 2, weeklyHours: 4, weeksPerSemester: 18 })

const showAddTextbook = ref(false)
const textbookForm = ref({ planCourseId: null, courseName: '', textbookId: null, semester: 1, isRequired: true })

async function loadPlan() {
  const res = await getPlans()
  plan.value = (res.data || []).find((p) => p.id === planId)
}

async function loadCourses() {
  const res = await getPlanCourses(planId)
  courses.value = res.data || []
}

function openEditCourse(row) {
  editCourse.value = { id: row.id, courseId: row.courseId, startSemester: row.startSemester, endSemester: row.endSemester, weeklyHours: row.weeklyHours, weeksPerSemester: row.weeksPerSemester }
  showAddCourse.value = true
}

async function saveCourse() {
  if (!editCourse.value.courseId) return ElMessage.warning('请选择课程')
  saving.value = true
  try {
    if (editCourse.value.id) {
      await updatePlanCourse(editCourse.value.id, editCourse.value)
    } else {
      await addPlanCourse(planId, editCourse.value)
    }
    ElMessage.success('保存成功')
    showAddCourse.value = false
    editCourse.value = { id: null, courseId: null, startSemester: 1, endSemester: 2, weeklyHours: 4, weeksPerSemester: 18 }
    loadCourses()
  } finally {
    saving.value = false
  }
}

async function removeCourse(id) {
  await deletePlanCourse(id)
  ElMessage.success('删除成功')
  loadCourses()
}

function openAddTextbook(row) {
  textbookForm.value = { planCourseId: row.id, courseName: row.course?.name, textbookId: null, semester: row.startSemester, isRequired: true }
  showAddTextbook.value = true
}

async function saveTextbook() {
  if (!textbookForm.value.textbookId) return ElMessage.warning('请选择教材')
  saving.value = true
  try {
    await addPlanTextbook(textbookForm.value.planCourseId, textbookForm.value)
    ElMessage.success('关联成功')
    showAddTextbook.value = false
    loadCourses()
  } finally {
    saving.value = false
  }
}

async function removeTextbook(id) {
  await deletePlanTextbook(id)
  ElMessage.success('取消关联')
  loadCourses()
}

onMounted(async () => {
  const [coursesRes, textbooksRes] = await Promise.all([getCourses(), getTextbooks()])
  allCourses.value = coursesRes.data || []
  allTextbooks.value = textbooksRes.data || []
  await loadPlan()
  loadCourses()
})
</script>
