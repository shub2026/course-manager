import { createRouter, createWebHistory } from 'vue-router'
import Layout from '../components/Layout.vue'

const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '首页' } },
      { path: 'majors', name: 'Majors', component: () => import('../views/major/MajorList.vue'), meta: { title: '专业管理' } },
      { path: 'colleges', name: 'Colleges', component: () => import('../views/college/CollegeList.vue'), meta: { title: '学院管理' } },
      { path: 'training-levels', name: 'TrainingLevels', component: () => import('../views/trainingLevel/TrainingLevelList.vue'), meta: { title: '培养层次' } },
      { path: 'courses', name: 'Courses', component: () => import('../views/course/CourseList.vue'), meta: { title: '课程管理' } },
      { path: 'textbooks', name: 'Textbooks', component: () => import('../views/textbook/TextbookList.vue'), meta: { title: '教材管理' } },
      { path: 'classes', name: 'Classes', component: () => import('../views/class/ClassList.vue'), meta: { title: '班级管理' } },
      { path: 'plans', name: 'Plans', component: () => import('../views/plan/PlanList.vue'), meta: { title: '培养方案' } },
      { path: 'plans/:id', name: 'PlanDetail', component: () => import('../views/plan/PlanDetail.vue'), meta: { title: '方案明细' } },
      { path: 'query/semester', name: 'SemesterQuery', component: () => import('../views/query/SemesterQuery.vue'), meta: { title: '开课查询' } },
      { path: 'query/textbook', name: 'TextbookQuery', component: () => import('../views/query/TextbookQuery.vue'), meta: { title: '教材使用查询' } },
      { path: 'settings', name: 'Settings', component: () => import('../views/settings/SystemSettings.vue'), meta: { title: '系统设置' } },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
