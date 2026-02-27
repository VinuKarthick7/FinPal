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
    // Normalize email (trim and lowercase) before sending
    const normalizedEmail = email.toLowerCase().trim()
    // Trim password but preserve case
    const trimmedPassword = password.trim()
    const response = await api.post('/auth/login', {
      email: normalizedEmail,
      password: trimmedPassword
    })
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

  resendVerification: async (email: string) => {
    const response = await api.post('/auth/resend-verification', { email })
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

  copyFromPrevious: async () => {
    const response = await api.post('/budgets/copy-previous')
    return response.data
  },
}

// Reports API
export const reportsApi = {
  getMonthly: async (params?: { month?: number; year?: number }) => {
    const response = await api.get('/reports/monthly', { params })
    return response.data
  },

  getYearly: async (params?: { year?: number }) => {
    const response = await api.get('/reports/yearly', { params })
    return response.data
  },

  getCategoryTrends: async (params?: { months?: number }) => {
    const response = await api.get('/reports/category-trends', { params })
    return response.data
  },

  getComparison: async () => {
    const response = await api.get('/reports/comparison')
    return response.data
  },

  exportData: async (params?: { month?: number; year?: number; format?: string }) => {
    const response = await api.get('/reports/export', { params })
    return response.data
  },
}

// Family API
export const familyApi = {
  // Get user's family
  getMyFamily: async () => {
    const response = await api.get('/family')
    return response.data
  },

  // Get full family dashboard with real data
  getDashboard: async () => {
    const response = await api.get('/family/dashboard')
    return response.data
  },

  // Create a new family
  createFamily: async (data: {
    familyName: string
    nickname?: string
    relation?: string
    sharedBudget?: {
      amount: number
      period: 'weekly' | 'monthly' | 'yearly'
      categories?: Array<{
        name: string
        allocated: number
      }>
    }
  }) => {
    const response = await api.post('/family/create', data)
    return response.data
  },

  // Join family using 6-digit code
  joinFamily: async (data: {
    familyCode: string
    nickname?: string
    relation: string
  }) => {
    const response = await api.post('/family/join', data)
    return response.data
  },

  // Update family settings
  updateFamily: async (data: {
    familyName?: string
    sharedBudget?: {
      amount?: number
      period?: 'weekly' | 'monthly' | 'yearly'
      categories?: Array<{
        name: string
        allocated: number
        spent?: number
      }>
    }
    settings?: {
      currency?: string
      timezone?: string
      notificationsEnabled?: boolean
      autoSyncEnabled?: boolean
      privacyLevel?: 'open' | 'restricted' | 'private'
    }
  }) => {
    const response = await api.put('/family/update', data)
    return response.data
  },

  // Leave family
  leaveFamily: async () => {
    const response = await api.post('/family/leave')
    return response.data
  },

  // Regenerate family code
  regenerateCode: async () => {
    const response = await api.post('/family/regenerate-code')
    return response.data
  },

  // Invite member
  inviteMember: async (data: {
    email: string
    relation: string
    role?: 'Member' | 'Viewer'
  }) => {
    const response = await api.post('/family/invite', data)
    return response.data
  },

  // Update member
  updateMember: async (memberId: string, data: {
    nickname?: string
    relation?: string
    role?: 'Admin' | 'Member' | 'Viewer'
    permissions?: {
      canViewBudget?: boolean
      canEditBudget?: boolean
      canViewExpenses?: boolean
      canAddExpenses?: boolean
      canViewReminders?: boolean
      canManageMembers?: boolean
    }
    monthlySpendingLimit?: number
  }) => {
    const response = await api.put(`/family/members/${memberId}`, data)
    return response.data
  },

  // Remove member
  removeMember: async (memberId: string) => {
    const response = await api.delete(`/family/members/${memberId}`)
    return response.data
  },

  // Get member's expenses
  getMemberExpenses: async (memberId: string, params?: {
    startDate?: string
    endDate?: string
    category?: string
    page?: number
    limit?: number
  }) => {
    const response = await api.get(`/family/members/${memberId}/expenses`, { params })
    return response.data
  },
}

// Family Reports API - Comprehensive family financial reporting
export const familyReportsApi = {
  // Get family monthly report with member-wise breakdown
  getMonthly: async (params?: { month?: number; year?: number }) => {
    const response = await api.get('/family-reports/monthly', { params })
    return response.data
  },

  // Get specific member's report within family context
  getMemberReport: async (memberId: string, params?: { month?: number; year?: number }) => {
    const response = await api.get(`/family-reports/member/${memberId}`, { params })
    return response.data
  },

  // Get family yearly report
  getYearly: async (params?: { year?: number }) => {
    const response = await api.get('/family-reports/yearly', { params })
    return response.data
  },

  // Get or create family budget for a month
  getBudget: async (month: number, year: number) => {
    const response = await api.get(`/family-reports/budget/${month}/${year}`)
    return response.data
  },

  // Save family budget for a month
  saveBudget: async (data: {
    month: number
    year: number
    totalBudget: number
    categoryBudgets?: Array<{
      category: string
      allocated: number
      color?: string
    }>
    memberBudgets?: Array<{
      email: string
      allocated: number
    }>
  }) => {
    const response = await api.post('/family-reports/budget', data)
    return response.data
  },

  // Export family report data
  exportReport: async (params?: { month?: number; year?: number; type?: 'monthly' | 'yearly' }) => {
    const response = await api.get('/family-reports/export', { params })
    return response.data
  },

  // Get data sync status
  getSyncStatus: async () => {
    const response = await api.get('/family-reports/sync-status')
    return response.data
  },

  // Validate and reconcile family data
  validateData: async (data?: { month?: number; year?: number }) => {
    const response = await api.post('/family-reports/validate', data)
    return response.data
  },
}

// Achievement API
export const achievementApi = {
  // Get user's achievements
  getAchievements: async () => {
    const response = await api.get('/achievements')
    return response.data
  },

  // Get achievement statistics
  getStats: async () => {
    const response = await api.get('/achievements/stats')
    return response.data
  },

  // Check if user should see success announcement
  checkAnnouncement: async () => {
    const response = await api.get('/achievements/announcement')
    return response.data
  },

  // Mark reward popup as shown
  markPopupShown: async (month: number, year: number) => {
    const response = await api.post('/achievements/popup-shown', { month, year })
    return response.data
  },

  // Check current month's budget performance
  checkMonthlyBudget: async () => {
    const response = await api.post('/achievements/check')
    return response.data
  },
}

// Chatbot API (FinMate)
export const chatbotApi = {
  // Send a message to FinMate with optional conversation history
  sendMessage: async (message: string, conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    const response = await api.post('/chatbot/message', {
      message,
      conversationHistory: conversationHistory ?? [],
    })
    return response.data
  },

  // Get chat context for initializing chat (clears server history too)
  getContext: async () => {
    const response = await api.get('/chatbot/context')
    return response.data
  },

  // Clear conversation history for a new session
  clearHistory: async () => {
    const response = await api.delete('/chatbot/history')
    return response.data
  },
}

export default api
