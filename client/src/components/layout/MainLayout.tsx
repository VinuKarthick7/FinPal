import React, { useEffect, useRef } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  LayoutDashboard,
  PlusCircle,
  Wallet,
  PiggyBank,
  BarChart3,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { path: '/expenses', icon: Wallet, label: 'Expenses' },
  { path: '/add-expense', icon: PlusCircle, label: 'Add' },
  { path: '/budget', icon: PiggyBank, label: 'Budget' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
]

export const MainLayout: React.FC = () => {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const mainRef = useRef<HTMLElement | null>(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const el = mainRef.current
    if (!el) return

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    el.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }, [location.pathname])

  // Check if avatar is a valid URL
  const isValidAvatar = (avatar: string | undefined): boolean => {
    if (!avatar) return false
    return (
      avatar.startsWith('http') ||
      avatar.startsWith('/uploads/') ||
      avatar.startsWith('/api/uploads/') ||
      avatar.startsWith('data:image')
    )
  }

  const getAvatarUrl = (avatar: string | undefined) => {
    if (!isValidAvatar(avatar)) return null
    if (avatar!.startsWith('http') || avatar!.startsWith('data:image')) return avatar
    return `${API_URL}${avatar}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/90 supports-[backdrop-filter]:bg-white/70 backdrop-blur-md border-b border-gray-100/70 safe-top">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-3xl bg-primary-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary-600" />
            </div>
            <span className="font-bold text-gray-900">FinPal</span>
          </div>
          <NavLink to="/profile" className="block">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden ring-2 ring-primary-200 hover:ring-primary-300 transition-all">
              <img 
                src={isValidAvatar(user?.avatar) ? getAvatarUrl(user?.avatar)! : '/default-avatar.svg'} 
                alt="Profile" 
                className="w-full h-full rounded-full object-cover"
                style={{ padding: isValidAvatar(user?.avatar) ? 0 : '6px' }}
                onError={(e) => {
                  const img = e.currentTarget
                  if (img.src.endsWith('/default-avatar.svg')) return
                  img.src = '/default-avatar.svg'
                  img.style.padding = '6px'
                }}
              />
            </div>
          </NavLink>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 flex-col z-50">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-100">
          <div className="w-10 h-10 rounded-3xl bg-primary-100 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary-600" />
          </div>
          <span className="font-bold text-xl text-gray-900">FinPal</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-3xl transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Profile Section */}
        <div className="p-4 border-t border-gray-100">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-3xl transition-all duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-600 overflow-hidden">
              <img 
                src={isValidAvatar(user?.avatar) ? getAvatarUrl(user?.avatar)! : '/default-avatar.svg'} 
                alt="" 
                className="w-full h-full rounded-full object-cover"
                style={{ padding: isValidAvatar(user?.avatar) ? 0 : '6px' }}
                onError={(e) => {
                  const img = e.currentTarget
                  if (img.src.endsWith('/default-avatar.svg')) return
                  img.src = '/default-avatar.svg'
                  img.style.padding = '6px'
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName || 'User'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email || ''}</p>
            </div>
          </NavLink>
        </div>
      </aside>

      {/* Main Content */}
      <main
        ref={(node) => {
          mainRef.current = node
        }}
        className="lg:ml-64 pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10, scale: 0.995 }}
            animate={shouldReduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.995 }}
            transition={
              shouldReduceMotion
                ? { duration: 0.01 }
                : { type: 'spring', stiffness: 260, damping: 28, mass: 0.9 }
            }
            className="min-h-full will-change-transform"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 supports-[backdrop-filter]:bg-white/70 backdrop-blur-md border-t border-gray-100/70 safe-bottom z-40">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const isAddButton = item.path === '/add-expense'

            if (isAddButton) {
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="flex items-center justify-center -mt-6 active:scale-[0.98] transition-transform"
                >
                  <div className="w-14 h-14 rounded-full bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                    <PlusCircle className="w-7 h-7 text-white" />
                  </div>
                </NavLink>
              )
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-2 transition-transform active:scale-[0.98] ${
                  isActive ? 'text-primary-500' : 'text-gray-400'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default MainLayout
