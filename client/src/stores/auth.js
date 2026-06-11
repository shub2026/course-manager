import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '@/router'
import request from '@/utils/request'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const refreshToken = ref(localStorage.getItem('refreshToken') || '')
  
  // 添加 try-catch 防止 localStorage 被篡改导致应用崩溃
  let parsedUserInfo = null
  try {
    const userInfoStr = localStorage.getItem('userInfo')
    parsedUserInfo = userInfoStr ? JSON.parse(userInfoStr) : null
  } catch (error) {
    console.error('Failed to parse userInfo from localStorage:', error)
    // 清除损坏的数据
    localStorage.removeItem('userInfo')
  }
  const userInfo = ref(parsedUserInfo)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => ['admin', 'super_admin'].includes(userInfo.value?.role))
  const isSuperAdmin = computed(() => userInfo.value?.role === 'super_admin')
  const isViewer = computed(() => userInfo.value?.role === 'viewer')
  const username = computed(() => userInfo.value?.username || '')
  const realName = computed(() => userInfo.value?.realName || '')

  async function login(username, password) {
    try {
      const response = await request.post('/auth/login', {
        username,
        password
      })

      const { user, token: newToken, refreshToken: newRefreshToken } = response.data

      token.value = newToken
      refreshToken.value = newRefreshToken
      userInfo.value = user

      localStorage.setItem('token', newToken)
      localStorage.setItem('refreshToken', newRefreshToken)
      localStorage.setItem('userInfo', JSON.stringify(user))

      router.push('/')

      return { success: true, message: '登录成功' }
    } catch (error) {
      return {
        success: false,
        message: error.message || '登录失败'
      }
    }
  }

  async function logout() {
    try {
      if (token.value) {
        await request.post('/auth/logout')
      }
    } catch (error) {
      console.error('登出请求失败:', error)
    } finally {
      clearAuth()
      router.push('/login')
    }
  }

  async function refreshAccessToken() {
    try {
      const response = await request.post('/auth/refresh', {
        refreshToken: refreshToken.value
      })

      const { token: newToken } = response.data

      token.value = newToken
      localStorage.setItem('token', newToken)

      return true
    } catch (error) {
      clearAuth()
      router.push('/login')
      return false
    }
  }

  async function fetchUserInfo(retryCount = 0) {
    try {
      const response = await request.get('/auth/me')
      userInfo.value = response.data

      localStorage.setItem('userInfo', JSON.stringify(response.data))
      return true
    } catch (error) {
      // 防止无限递归，最多重试1次
      if (retryCount >= 1) {
        clearAuth()
        router.push('/login')
        return false
      }

      const refreshed = await refreshAccessToken()
      if (refreshed) {
        return fetchUserInfo(retryCount + 1)
      }
      return false
    }
  }

  async function changePassword(oldPassword, newPassword) {
    try {
      await request.put('/auth/password', {
        oldPassword,
        newPassword
      })
      return { success: true, message: '密码修改成功' }
    } catch (error) {
      return {
        success: false,
        message: error.message || '密码修改失败'
      }
    }
  }

  function clearAuth() {
    token.value = ''
    refreshToken.value = ''
    userInfo.value = null

    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userInfo')
  }

  function initAuth() {
    if (token.value) {
      fetchUserInfo()
    }
  }

  return {
    token,
    refreshToken,
    userInfo,
    isLoggedIn,
    isAdmin,
    isSuperAdmin,
    isViewer,
    username,
    realName,
    login,
    logout,
    refreshAccessToken,
    fetchUserInfo,
    changePassword,
    clearAuth,
    initAuth
  }
})
