import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  User,
  Mail,
  Phone,
  Lock,
  LogOut,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  Bell,
  Shield,
  Loader2,
  Camera,
  Trophy,
  Star,
  ChevronRight,
} from 'lucide-react'
import { Button, LoadingPage } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { profileApi, achievementApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const ProfilePage: React.FC = () => {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);
  
  const { t } = useTranslation()
  const { user, updateUser, logout } = useAuthStore()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedPhone, setEditedPhone] = useState('')

  // Achievement stats
  const [achievementStats, setAchievementStats] = useState<any>(null)

  // Sync form state with user data
  useEffect(() => {
    if (user && !isEditingProfile) {
      setEditedName(user.fullName || '')
      setEditedPhone(user.phone || '')
    }
  }, [user, isEditingProfile])

  // Load achievement stats
  useEffect(() => {
    loadAchievementStats()
  }, [])

  const loadAchievementStats = async () => {
    try {
      const response = await achievementApi.getStats()
      if (response.success) {
        setAchievementStats(response.data)
      }
    } catch (error) {
      console.error('Error loading achievements:', error)
    }
  }

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Notification settings state
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [reminderNotifications, setReminderNotifications] = useState(true)

  // Avatar upload mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: profileApi.uploadAvatar,
    onSuccess: (data) => {
      if (data.success && data.data.user) {
        updateUser(data.data.user)
        toast.success(t('profile.photoUpdated'))
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('profile.photoUploadFailed'))
    },
  })

  // Remove avatar mutation
  const removeAvatarMutation = useMutation({
    mutationFn: profileApi.removeAvatar,
    onSuccess: () => {
      updateUser({ avatar: undefined })
      toast.success(t('profile.photoRemoved'))
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('profile.photoRemoveFailed'))
    },
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: profileApi.updateProfile,
    onSuccess: (data) => {
      if (data.success && data.data.user) {
        updateUser(data.data.user)
        setIsEditingProfile(false)
      }
    },
  })

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: profileApi.changePassword,
    onSuccess: () => {
      setShowChangePassword(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
  })

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: profileApi.deleteAccount,
    onSuccess: () => {
      logout()
    },
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      if (file.type === 'image/gif') {
        toast.error(t('profile.gifNotSupported'))
      } else {
        toast.error(t('profile.invalidImageType'))
      }
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.imageTooLarge'))
      return
    }

    uploadAvatarMutation.mutate(file)
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveAvatar = () => {
    removeAvatarMutation.mutate()
  }

  const isValidAvatarUrl = (avatar: string | undefined): boolean => {
    if (!avatar) return false
    // Check if it's a valid URL or path
    return (
      avatar.startsWith('http') ||
      avatar.startsWith('/uploads/') ||
      avatar.startsWith('/api/uploads/') ||
      avatar.startsWith('data:image')
    )
  }

  const getAvatarUrl = (avatar: string | undefined) => {
    if (!avatar) return null
    if (!isValidAvatarUrl(avatar)) return null
    if (avatar.startsWith('http')) return avatar
    return `${API_URL}${avatar}`
  }

  const handleSaveProfile = () => {
    // Validate name
    if (!editedName.trim() || editedName.trim().length < 2) {
      toast.error(t('profile.nameMinLength'))
      return
    }
    if (editedName.trim().length > 50) {
      toast.error(t('profile.nameMaxLength'))
      return
    }
    // Validate phone (if provided)
    if (editedPhone && !/^[6-9]\d{9}$/.test(editedPhone)) {
      toast.error(t('profile.invalidPhone'))
      return
    }
    
    updateProfileMutation.mutate({
      fullName: editedName.trim(),
      phone: editedPhone,
    })
  }

  const handleChangePassword = () => {
    // Validate passwords
    if (!currentPassword) {
      toast.error(t('auth.currentPasswordRequired'))
      return
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error(t('auth.passwordMinLength'))
      return
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      toast.error(t('auth.passwordRequirements'))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('auth.passwordsMismatch'))
      return
    }
    
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
      confirmPassword,
    })
  }

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate()
  }

  const handleLogout = () => {
    logout()
  }

  // Show loading state if user is not loaded
  if (!user) {
    return <LoadingPage text={t('profile.loading')} />
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('profile.subtitle')}
          </p>
        </div>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-8">
          <div className="flex flex-col items-center text-center">
            {/* Avatar with upload */}
            <div className="relative group mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div 
                onClick={handleAvatarClick}
                className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-bold border-4 border-white/30 cursor-pointer overflow-hidden transition-transform hover:scale-105"
              >
                {uploadAvatarMutation.isPending ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <img
                    src={user?.avatar && isValidAvatarUrl(user.avatar) ? getAvatarUrl(user.avatar)! : '/default-avatar.svg'}
                    alt={user?.fullName || 'User'}
                    className="w-full h-full rounded-full object-cover p-2"
                    style={{ filter: !user?.avatar || !isValidAvatarUrl(user.avatar) ? 'invert(1)' : 'none' }}
                    onError={(e) => {
                      const img = e.currentTarget
                      if (img.src.endsWith('/default-avatar.svg')) return
                      img.src = '/default-avatar.svg'
                      img.style.filter = 'invert(1)'
                    }}
                  />
                )}
              </div>
              {/* Camera overlay */}
              <div 
                onClick={handleAvatarClick}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="w-6 h-6 text-white" />
              </div>
              {/* Remove button */}
              {user?.avatar && isValidAvatarUrl(user.avatar) && !uploadAvatarMutation.isPending && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveAvatar()
                  }}
                  disabled={removeAvatarMutation.isPending}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-colors"
                  title="Remove photo"
                >
                  {removeAvatarMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
            <div className="text-white">
              <h2 className="text-2xl font-bold mb-1">{user?.fullName || 'User'}</h2>
              <p className="text-white/90 mb-3">{user?.email}</p>
              <div className="flex items-center justify-center gap-2">
                {user?.isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs bg-white/20 px-3 py-1 rounded-full">
                    <Shield className="w-3 h-3" />
                    {t('profile.verified')}
                  </span>
                )}
                <button
                  onClick={handleAvatarClick}
                  className="inline-flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
                >
                  <Camera className="w-3 h-3" />
                  {t('profile.changePhoto')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('profile.personalInformation')}</h3>
            {!isEditingProfile ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditedName(user?.fullName || '')
                  setEditedPhone(user?.phone || '')
                  setIsEditingProfile(true)
                }}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                {t('common.edit')}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingProfile(false)}
                >
                  <X className="w-4 h-4 mr-1" />
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-1" />
                  )}
                  {t('common.save')}
                </Button>
              </div>
            )}
          </div>

          {updateProfileMutation.isError && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {(updateProfileMutation.error as any)?.response?.data?.message || t('profile.updateFailed')}
            </div>
          )}

          <div className="space-y-4">
            {/* Full Name */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 mb-1">{t('profile.fullName')}</p>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p className="text-base font-semibold text-gray-900 break-words">{user?.fullName || 'Not provided'}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-1">
                <Mail className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 mb-1">{t('profile.emailAddress')}</p>
                <p className="text-base font-semibold text-gray-900 break-words">{user?.email}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-1">
                <Phone className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 mb-1">{t('profile.phoneNumber')}</p>
                {isEditingProfile ? (
                  <input
                    type="tel"
                    value={editedPhone}
                    onChange={(e) => setEditedPhone(e.target.value)}
                    placeholder={t('profile.enterPhoneNumber')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                ) : (
                  <p className="text-base font-semibold text-gray-900">
                    {user?.phone || t('profile.notProvided')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Security Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.security')}</h3>

        {/* Change Password */}
        <div className="border-b border-gray-100 pb-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{t('profile.password')}</p>
                <p className="text-sm text-gray-500">{t('profile.changePasswordDesc')}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChangePassword(!showChangePassword)}
            >
              {t('common.change')}
            </Button>
          </div>

          <AnimatePresence>
            {showChangePassword && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-3"
              >
                {changePasswordMutation.isError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    {(changePasswordMutation.error as any)?.response?.data?.message || t('profile.passwordChangeFailed')}
                  </div>
                )}

                {changePasswordMutation.isSuccess && (
                  <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">
                    {t('profile.passwordChangeSuccess')}
                  </div>
                )}

                {/* Current Password */}
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t('auth.currentPassword')}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* New Password */}
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('auth.newPassword')}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Confirm Password */}
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.confirmPassword')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowChangePassword(false)
                      setCurrentPassword('')
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {changePasswordMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : null}
                    {t('profile.updatePassword')}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout */}
        <div
          onClick={handleLogout}
          className="flex items-center justify-between p-3 -mx-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{t('profile.logout')}</p>
              <p className="text-sm text-gray-500">{t('profile.logoutDesc')}</p>
            </div>
          </div>
        </div>
      </motion.div>
      {/* Achievements Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Budget Achievements</h3>
          <button
            onClick={() => navigate('/achievements')}
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {achievementStats ? (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 text-center border border-amber-100">
                <div className="flex items-center justify-center mb-2">
                  <Trophy className="w-6 h-6 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{achievementStats.total || 0}</p>
                <p className="text-xs text-gray-600 mt-1">Total Stars</p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 text-center border border-blue-100">
                <div className="flex items-center justify-center mb-2">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{achievementStats.currentYear || 0}</p>
                <p className="text-xs text-gray-600 mt-1">This Year</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 text-center border border-purple-100">
                <div className="flex items-center justify-center mb-2">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{achievementStats.longestStreak || 0}</p>
                <p className="text-xs text-gray-600 mt-1">Best Streak</p>
              </div>
            </div>

            {/* Recent Achievements */}
            {achievementStats.recentAchievements && achievementStats.recentAchievements.length > 0 && (
              <div className="pt-2">
                <p className="text-sm font-medium text-gray-700 mb-3">Recent Achievements</p>
                <div className="flex gap-2">
                  {achievementStats.recentAchievements.slice(0, 6).map((achievement: any, index: number) => (
                    <div
                      key={achievement._id || index}
                      className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg"
                      title={`${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][achievement.month - 1]} ${achievement.year}`}
                    >
                      <Star className="w-6 h-6 text-white fill-white" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-2">No achievements yet</p>
            <p className="text-sm text-gray-500">Stay within your budget to earn stars!</p>
          </div>
        )}
      </motion.div>
      {/* Notifications Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.notifications')}</h3>

        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{t('profile.emailNotifications')}</p>
                <p className="text-sm text-gray-500">{t('profile.emailNotificationsDesc')}</p>
              </div>
            </div>
            <button
              onClick={() => setEmailNotifications(!emailNotifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                emailNotifications ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Reminder Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{t('profile.reminderNotifications')}</p>
                <p className="text-sm text-gray-500">{t('profile.reminderNotificationsDesc')}</p>
              </div>
            </div>
            <button
              onClick={() => setReminderNotifications(!reminderNotifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                reminderNotifications ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  reminderNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl border border-red-200 p-6"
      >
        <h3 className="text-lg font-semibold text-red-600 mb-4">{t('profile.dangerZone')}</h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{t('profile.deleteAccount')}</p>
              <p className="text-sm text-gray-500">{t('profile.deleteAccountDesc')}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setShowDeleteConfirm(true)}
          >
            {t('common.delete')}
          </Button>
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t('profile.deleteAccount')}</h3>
                  <p className="text-sm text-gray-500">{t('profile.cannotBeUndone')}</p>
                </div>
              </div>

              <p className="text-gray-600 mb-6">
                {t('profile.deleteAccountConfirm')}
              </p>

              {deleteAccountMutation.isError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {(deleteAccountMutation.error as any)?.response?.data?.message || t('profile.deleteAccountFailed')}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleDeleteAccount}
                  disabled={deleteAccountMutation.isPending}
                >
                  {deleteAccountMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {t('profile.deleteAccount')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProfilePage
