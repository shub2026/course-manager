import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '@/router'
import axios from 'axios'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const refreshToken = ref(localStorage.getItem('refreshToken') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => ['admin', 'super_admin'].includes(userInfo.value?.role))
  const isSuperAdmin = computed(() => userInfo.value?.role === 'super_admin')
  const isViewer = computed(() => userInfo.value?.role === 'viewer')
  const username = computed(() => userInfo.value?.username || '')
  const realName = computed(() => userInfo.value?.realName || '')

  async function login(username, password) {
    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      })

      const { user, token: newToken, refreshToken: newRefreshToken } = response.data.data

      token.value = newToken
      refreshToken.value = newRefreshToken
      userInfo.value = user

      localStorage.setItem('token', newToken)
      localStorage.setItem('refreshToken', newRefreshToken)
      localStorage.setItem('userInfo', JSON.stringify(user))

      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

      router.push('/')

      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '登录失败'
      }
    }
  }

  async function logout() {
    try {
      if (token.value) {
        await axios.post('/api/auth/logout')
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
      const response = await axios.post('/api/auth/refresh', {
        refreshToken: refreshToken.value
      })

      const { token: newToken } = response.data.data

      token.value = newToken
      localStorage.setItem('token', newToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

      return true
    } catch (error) {
      clearAuth()
      router.push('/login')
      return false
    }
  }

  async function fetchUserInfo() {
    try {
      const response = await axios.get('/api/auth/me')
      userInfo.value = response.data.data

      localStorage.setItem('userInfo', JSON.stringify(response.data.data))
      return true
    } catch (error) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        return fetchUserInfo()
      }
      return false
    }
  }

  async function changePassword(oldPassword, newPassword) {
    try {
      await axios.put('/api/auth/password', {
        oldPassword,
        newPassword
      })
      return { success: true, message: '密码修改成功' }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '密码修改失败'
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

    delete axios.defaults.headers.common['Authorization']
  }

  function initAuth() {
    if (token.value) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
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
