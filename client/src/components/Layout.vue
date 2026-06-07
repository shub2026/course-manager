<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapse ? '64px' : '220px'" class="layout-aside">
      <div class="layout-logo">
        <span v-if="!isCollapse">课程管理系统</span>
        <span v-else>课</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><HomeFilled /></el-icon>
          <template #title>首页概览</template>
        </el-menu-item>
        <el-sub-menu index="basic">
          <template #title>
            <el-icon><Grid /></el-icon>
            <span>基础数据</span>
          </template>
          <el-menu-item index="/majors">专业管理</el-menu-item>
          <el-menu-item index="/courses">课程管理</el-menu-item>
          <el-menu-item index="/textbooks">教材管理</el-menu-item>
          <el-menu-item index="/classes">班级管理</el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/plans">
          <el-icon><Document /></el-icon>
          <template #title>培养方案</template>
        </el-menu-item>
        <el-sub-menu index="query">
          <template #title>
            <el-icon><DataAnalysis /></el-icon>
            <span>查询报表</span>
          </template>
          <el-menu-item index="/query/semester">开课查询</el-menu-item>
          <el-menu-item index="/query/textbook">教材使用查询</el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <template #title>系统设置</template>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="layout-header">
        <div class="layout-header-left">
          <el-icon class="collapse-icon" @click="isCollapse = !isCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <span class="header-title">{{ currentTitle }}</span>
        </div>
        <div class="layout-header-right">
          <el-tag type="info" v-if="semesterLabel">{{ semesterLabel }}</el-tag>
        </div>
      </el-header>
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSettingsStore } from '../stores/settings'

const route = useRoute()
const settingsStore = useSettingsStore()
const isCollapse = ref(false)

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || '首页')
const semesterLabel = computed(() => settingsStore.semesterLabel)

onMounted(() => {
  settingsStore.load()
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.layout-aside {
  transition: width 0.3s;
  background: #304156;
}

.layout-logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  border-bottom: 1px solid #3d4c5c;
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e6e6e6;
  background: #fff;
}

.layout-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.layout-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapse-icon {
  cursor: pointer;
  font-size: 20px;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
}

.layout-main {
  background: #f5f7fa;
  padding: 20px;
}
</style>
