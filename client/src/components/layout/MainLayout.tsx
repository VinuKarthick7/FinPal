import React, { useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  LayoutDashboard,
  Wallet,
  PiggyBank,
  BarChart3,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { LanguageSwitcher, FinMateIcon } from '@/components/ui'
import { useTranslation } from 'react-i18next'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const MainLayout: React.FC = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const mainRef = useRef<HTMLElement | null>(null)
  const shouldReduceMotion = useReducedMotion()
  const [finmateClickAnimation, setFinmateClickAnimation] = useState(false)
  const [showLoginAnimation, setShowLoginAnimation] = useState(false)

  // Check for login animation - show when user first loads the app
  useEffect(() => {
    if (user && !sessionStorage.getItem('finmate-welcomed')) {
      setShowLoginAnimation(true)
      sessionStorage.setItem('finmate-welcomed', 'true')
    }
  }, [user])

  // Handle FinMate click animation
  const handleFinMateClick = () => {
    setFinmateClickAnimation(true)
    setTimeout(() => setFinmateClickAnimation(false), 100) // Reset after short delay
  }

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: t('nav.home') },
    { path: '/expenses', icon: Wallet, label: t('nav.expenses') },
    { path: '/finmate', icon: MessageSquare, label: 'FinMate', isFinMate: true },
    { path: '/budget', icon: PiggyBank, label: t('nav.budget') },
    { path: '/reports', icon: BarChart3, label: t('nav.reports') },
  ]

  useEffect(() => {
    // Always scroll to top when route changes
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Scroll the main window/document to top
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
    
    // Also scroll the main container if it exists
    const el = mainRef.current
    if (el) {
      el.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
    }
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
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <LanguageSwitcher />
            {/* Profile Button */}
            <NavLink to="/profile" className="block">
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden ring-2 ring-primary-200 hover:ring-primary-300 active:ring-primary-400 transition-all active:scale-95">
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
          {navItems.map((item) => {
            const isFinMateItem = (item as any).isFinMate
            
            if (isFinMateItem) {
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleFinMateClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-600 font-medium shadow-sm border border-cyan-100'
                        : 'bg-white hover:bg-cyan-50/50 text-gray-600 hover:text-cyan-600'
                    }`
                  }
                >
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center overflow-hidden">
                    <FinMateIcon 
                      size={22} 
                      animate={showLoginAnimation}
                      triggerAnimation={finmateClickAnimation}
                    />
                  </div>
                  <span className="font-medium">{item.label}</span>
                  <Sparkles className="w-4 h-4 text-amber-400 ml-auto" />
                </NavLink>
              )
            }
            
            return (
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
            )
          })}
        </nav>

        {/* Profile Section */}
        <div className="p-4 border-t border-gray-100 space-y-3">
          <div className="flex items-center justify-center px-4">
            <LanguageSwitcher />
          </div>
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
        <div className="flex items-center justify-around px-2 h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const isFinMateButton = (item as any).isFinMate

            if (isFinMateButton) {
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleFinMateClick}
                  className="flex items-center justify-center -mt-1 active:scale-95 transition-transform touch-feedback"
                >
                  <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-md shadow-cyan-200/40 overflow-hidden">
                    {/* Official FinMate Robot Icon */}
                    <FinMateIcon 
                      size={32} 
                      animate={showLoginAnimation}
                      triggerAnimation={finmateClickAnimation}
                    />
                  </div>
                </NavLink>
              )
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 min-w-[64px] transition-all active:scale-95 touch-feedback ${
                  isActive ? 'text-primary-600' : 'text-gray-400'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default MainLayout
