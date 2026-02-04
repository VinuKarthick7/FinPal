import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import LoginPage from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { DashboardPage } from './pages/dashboard'
import { AddExpensePage } from './pages/expense'
import { ExpensesPage, AllExpensesPage } from './pages/expenses'
import { RemindersPage } from './pages/reminders'
import { ProfilePage } from './pages/profile'
import { BudgetPage } from './pages/budget'
import { ReportsPage } from './pages/reports/ReportsPage'
import { FamilyModePage } from './pages/family'
import { AchievementsPage } from './pages/achievements'
import { FinMatePage } from './pages/finmate'
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
  const { setAuth } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const token = params.get('token')
    const userStr = params.get('user')
    const error = params.get('error')

    // Handle OAuth errors
    if (error) {
      const errorMessages: Record<string, string> = {
        'google_not_configured': 'Google login is not configured',
        'google_failed': 'Google login failed. Please try again.',
        'apple_not_configured': 'Apple login is not configured',
        'apple_failed': 'Apple login failed. Please try again.',
        'oauth_failed': 'Authentication failed. Please try again.',
      }
      toast.error(errorMessages[error] || 'Authentication failed. Please try again.')
      navigate('/login')
      return
    }

    // Validate token and user data
    if (!token || !userStr) {
      console.error('❌ OAuth callback missing required parameters')
      toast.error('Authentication failed. Please try again.')
      navigate('/login')
      return
    }

    try {
      const user = JSON.parse(decodeURIComponent(userStr))

      // Validate user object has required fields
      if (!user.id || !user.email) {
        console.error('❌ Invalid user data from OAuth')
        toast.error('Authentication failed. Please try again.')
        navigate('/login')
        return
      }

      // User ID is the source of truth - log it
      console.log(`✅ OAuth login successful for user: ${user.email} (ID: ${user.id})`)

      // Set auth state immediately
      setAuth(user, token)

      // Fetch fresh user data with summary for complete profile
      authApi.getMe().then(response => {
        if (response.success && response.data?.user) {
          setAuth(response.data.user, token, response.data.dataSummary)
          console.log('✅ User data refreshed after OAuth login')
        }
      }).catch(error => {
        console.error('⚠️ Failed to fetch user data after OAuth:', error)
        // Continue anyway - we have basic user info
      })

      toast.success(`Welcome back, ${user.fullName}!`)
      navigate('/dashboard')
    } catch (error) {
      console.error('❌ OAuth callback parse error:', error)
      toast.error('Authentication failed. Please try again.')
      navigate('/login')
    }
  }, [location, navigate, setAuth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Authenticating...</p>
      </div>
    </div>
  )
}

function App() {
  const { isAuthenticated, setLoading, token, setAuth, user } = useAuthStore()

  // Verify token on app load and refresh user data
  useEffect(() => {
    const verifyAuth = async () => {
      if (token) {
        try {
          const response = await authApi.getMe()
          if (response.success && response.data) {
            // Update user data and data summary from server
            setAuth(
              response.data.user,
              token,
              response.data.dataSummary
            )
            console.log('✅ User session restored for:', response.data.user.email)
          }
          setLoading(false)
        } catch (error) {
          console.log('❌ Token expired or invalid, logging out')
          useAuthStore.getState().logout()
        }
      } else {
        setLoading(false)
      }
    }
    verifyAuth()
  }, [token, setLoading, setAuth])

  // Log current user for debugging
  useEffect(() => {
    if (user) {
      console.log('📧 Current user:', user.email, '| Authenticated:', isAuthenticated)
    }
  }, [user, isAuthenticated])

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

          {/* Family Mode - Full screen standalone page */}
          <Route path="/family" element={
            <ProtectedRoute>
              <FamilyModePage />
            </ProtectedRoute>
          } />

          {/* Achievements - Full screen standalone page */}
          <Route path="/achievements" element={
            <ProtectedRoute>
              <AchievementsPage />
            </ProtectedRoute>
          } />

          {/* FinMate Chatbot - Full screen standalone page */}
          <Route path="/finmate" element={
            <ProtectedRoute>
              <FinMatePage />
            </ProtectedRoute>
          } />

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
            <Route path="/expenses/all" element={<AllExpensesPage />} />
            <Route path="/add-expense" element={<AddExpensePage />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/reports" element={<ReportsPage />} />
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
