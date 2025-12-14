import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import LoginPage from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { DashboardPage } from './pages/dashboard'
import { AddExpensePage } from './pages/expense'
import { ExpensesPage } from './pages/expenses'
import { RemindersPage } from './pages/reminders'
import { ProfilePage } from './pages/profile'
import { BudgetPage } from './pages/budget'
import { ReportsPage } from './pages/reports/ReportsPage'
import { MainLayout } from './components/layout'
import { ErrorBoundary } from './components/ui'
import { useAuthStore } from './stores/authStore'
import { authApi } from './lib/api'

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

// OAuth Callback handler
const OAuthCallback = () => {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const token = params.get('token')
    const userStr = params.get('user')
    const error = params.get('error')

    if (error) {
      toast.error('Authentication failed. Please try again.')
      navigate('/login')
      return
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr))
        setAuth(user, token)
        toast.success('Welcome back!')
        navigate('/dashboard')
      } catch (error) {
        toast.error('Authentication failed. Please try again.')
        navigate('/login')
      }
    } else {
      navigate('/login')
    }
  }, [location, navigate, setAuth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
    </div>
  )
}

function App() {
  const { isAuthenticated, setLoading, token } = useAuthStore()

  // Verify token on app load
  useEffect(() => {
    const verifyAuth = async () => {
      if (token) {
        try {
          await authApi.getMe()
          setLoading(false)
        } catch {
          useAuthStore.getState().logout()
        }
      } else {
        setLoading(false)
      }
    }
    verifyAuth()
  }, [token, setLoading])

  return (
    <ErrorBoundary>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <div className="min-h-screen min-h-[100dvh] bg-gray-50">
        <Routes>
          {/* Auth Routes */}
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
          />
          <Route 
            path="/register" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} 
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          
          {/* Protected Routes with MainLayout */}
          <Route element={
            <ProtectedRoute>
              <ErrorBoundary>
                <MainLayout />
              </ErrorBoundary>
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/add-expense" element={<AddExpensePage />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/family" element={<DashboardPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </ErrorBoundary>
  )
}

export default App
