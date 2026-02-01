import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  fullName: string
  email: string
  phone?: string
  avatar?: string
  isVerified: boolean
  aiConsent?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface DataSummary {
  transactions: number
  budgets: number
  reminders: number
}

interface AuthState {
  user: User | null
  token: string | null
  dataSummary: DataSummary | null
  isAuthenticated: boolean
  isLoading: boolean
  setAuth: (user: User, token: string, dataSummary?: DataSummary) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  updateUser: (user: Partial<User>) => void
  updateDataSummary: (summary: DataSummary) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      dataSummary: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, token, dataSummary) => {
        set({
          user,
          token,
          dataSummary,
          isAuthenticated: true,
          isLoading: false,
        })
      },

      logout: () => {
        const currentUser = get().user
        if (currentUser) {
          console.log(`✅ Logging out user: ${currentUser.email} (ID: ${currentUser.id})`)
        }
        
        // Clear all stored auth data from localStorage
        localStorage.removeItem('finpal-auth')
        
        // Clear session storage as well
        sessionStorage.clear()
        
        // Reset all auth state
        set({
          user: null,
          token: null,
          dataSummary: null,
          isAuthenticated: false,
          isLoading: false,
        })
        
        console.log('✅ Session fully cleared')
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }))
      },

      updateDataSummary: (summary) => {
        set({ dataSummary: summary })
      },
    }),
    {
      name: 'finpal-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        dataSummary: state.dataSummary,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
