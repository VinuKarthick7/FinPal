import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },

  register: async (data: {
    fullName: string
    email: string
    phone: string
    password: string
  }) => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  getMe: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email })
    return response.data
  },

  googleAuth: () => {
    window.location.href = `${API_URL}/auth/google`
  },

  appleAuth: () => {
    window.location.href = `${API_URL}/auth/apple`
  },
}

// Dashboard API
export const dashboardApi = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats')
    return response.data
  },

  getTransactions: async (params?: { limit?: number; page?: number }) => {
    const response = await api.get('/transactions', { params })
    return response.data
  },

  getCategoryBreakdown: async () => {
    const response = await api.get('/dashboard/categories')
    return response.data
  },

  getReminders: async () => {
    const response = await api.get('/reminders')
    return response.data
  },

  getBudget: async () => {
    const response = await api.get('/dashboard/budget')
    return response.data
  },
}

// Expenses API
export const expensesApi = {
  getAll: async (params?: {
    page?: number
    limit?: number
    category?: string
    type?: 'expense' | 'income'
    startDate?: string
    endDate?: string
  }) => {
    const response = await api.get('/transactions', { params })
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/transactions/${id}`)
    return response.data
  },

  create: async (data: {
    amount: number
    category: string
    merchant: string
    date: string
    type: 'expense' | 'income'
    paymentMethod: string
    notes?: string
  }) => {
    const response = await api.post('/transactions', data)
    return response.data
  },

  update: async (id: string, data: Partial<{
    amount: number
    category: string
    merchant: string
    date: string
    type: 'expense' | 'income'
    paymentMethod: string
    notes?: string
  }>) => {
    const response = await api.put(`/transactions/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/transactions/${id}`)
    return response.data
  },
}

// Reminders API
export const remindersApi = {
  getAll: async () => {
    const response = await api.get('/reminders')
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/reminders/${id}`)
    return response.data
  },

  create: async (data: {
    title: string
    amount: number
    dueDate: string
    type: 'bill' | 'loan' | 'subscription'
    recurring?: boolean
    recurringPeriod?: 'monthly' | 'quarterly' | 'yearly'
    notes?: string
  }) => {
    const response = await api.post('/reminders', data)
    return response.data
  },

  update: async (id: string, data: Partial<{
    title: string
    amount: number
    dueDate: string
    type: 'bill' | 'loan' | 'subscription'
    recurring?: boolean
    recurringPeriod?: 'monthly' | 'quarterly' | 'yearly'
    notes?: string
  }>) => {
    const response = await api.put(`/reminders/${id}`, data)
    return response.data
  },

  markAsPaid: async (id: string) => {
    const response = await api.patch(`/reminders/${id}/pay`)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/reminders/${id}`)
    return response.data
  },
}

// Profile API
export const profileApi = {
  updateProfile: async (data: { fullName?: string; phone?: string }) => {
    const response = await api.put('/profile', data)
    return response.data
  },

  changePassword: async (data: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }) => {
    const response = await api.put('/profile/password', data)
    return response.data
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)
    const response = await api.post('/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  removeAvatar: async () => {
    const response = await api.delete('/profile/avatar')
    return response.data
  },

  deleteAccount: async () => {
    const response = await api.delete('/profile')
    return response.data
  },
}

// Budget API
export const budgetApi = {
  getAll: async (params?: { month?: number; year?: number }) => {
    const response = await api.get('/budgets', { params })
    return response.data
  },

  getCurrent: async () => {
    const response = await api.get('/budgets/current')
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/budgets/${id}`)
    return response.data
  },

  getOverview: async () => {
    const response = await api.get('/budgets/summary/overview')
    return response.data
  },

  create: async (data: {
    month: number
    year: number
    totalBudget: number
    categoryBudgets?: Array<{
      category: string
      amount: number
      color: string
    }>
    alertThreshold?: number
  }) => {
    const response = await api.post('/budgets', data)
    return response.data
  },

  update: async (id: string, data: {
    totalBudget?: number
    categoryBudgets?: Array<{
      category: string
      amount: number
      color: string
    }>
    alertThreshold?: number
  }) => {
    const response = await api.put(`/budgets/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/budgets/${id}`)
    return response.data
  },
}

export default api
