import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
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
} from 'lucide-react'
import { Button, LoadingPage } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { profileApi } from '@/lib/api'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const ProfilePage: React.FC = () => {
  const { user, updateUser, logout } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedPhone, setEditedPhone] = useState('')

  // Sync form state with user data
  useEffect(() => {
    if (user && !isEditingProfile) {
      setEditedName(user.fullName || '')
      setEditedPhone(user.phone || '')
    }
  }, [user, isEditingProfile])

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
        toast.success('Profile photo updated!')
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload photo')
    },
  })

  // Remove avatar mutation
  const removeAvatarMutation = useMutation({
    mutationFn: profileApi.removeAvatar,
    onSuccess: () => {
      updateUser({ avatar: undefined })
      toast.success('Profile photo removed')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove photo')
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
        toast.error("GIFs aren't supported for profile photos. Please use JPEG, PNG, or WebP.")
      } else {
        toast.error('Please select a valid image file (JPEG, PNG, or WebP)')
      }
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
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
      toast.error('Name must be at least 2 characters')
      return
    }
    if (editedName.trim().length > 50) {
      toast.error('Name must be less than 50 characters')
      return
    }
    // Validate phone (if provided)
    if (editedPhone && !/^[6-9]\d{9}$/.test(editedPhone)) {
      toast.error('Please enter a valid 10-digit phone number')
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
      toast.error('Please enter your current password')
      return
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      toast.error('Password must contain uppercase, lowercase, and number')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
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
    return <LoadingPage text="Loading profile..." />
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account settings and preferences
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
          <div className="flex items-center gap-4">
            {/* Avatar with upload */}
            <div className="relative group">
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
              {user?.avatar && !uploadAvatarMutation.isPending && (
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
            <div className="text-white flex-1">
              <h2 className="text-xl font-bold">{user?.fullName}</h2>
              <p className="text-white/80">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                {user?.isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    <Shield className="w-3 h-3" />
                    Verified
                  </span>
                )}
                <button
                  onClick={handleAvatarClick}
                  className="inline-flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-full transition-colors"
                >
                  <Camera className="w-3 h-3" />
                  Change Photo
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
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
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingProfile(false)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
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
                  Save
                </Button>
              </div>
            )}
          </div>

          {updateProfileMutation.isError && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {(updateProfileMutation.error as any)?.response?.data?.message || 'Failed to update profile'}
            </div>
          )}

          <div className="space-y-4">
            {/* Full Name */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Full Name</p>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{user?.fullName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="font-medium text-gray-900">{user?.email}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Phone Number</p>
                {isEditingProfile ? (
                  <input
                    type="tel"
                    value={editedPhone}
                    onChange={(e) => setEditedPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                ) : (
                  <p className="font-medium text-gray-900">
                    {user?.phone || 'Not provided'}
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security</h3>

        {/* Change Password */}
        <div className="border-b border-gray-100 pb-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Password</p>
                <p className="text-sm text-gray-500">Change your password</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChangePassword(!showChangePassword)}
            >
              Change
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
                    {(changePasswordMutation.error as any)?.response?.data?.message || 'Failed to change password'}
                  </div>
                )}

                {changePasswordMutation.isSuccess && (
                  <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">
                    Password changed successfully!
                  </div>
                )}

                {/* Current Password */}
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
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
                    placeholder="New password"
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
                  placeholder="Confirm new password"
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
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {changePasswordMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : null}
                    Update Password
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
              <p className="font-medium text-gray-900">Log Out</p>
              <p className="text-sm text-gray-500">Sign out of your account</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Notifications Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>

        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive updates via email</p>
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
                <p className="font-medium text-gray-900">Reminder Notifications</p>
                <p className="text-sm text-gray-500">Get notified about due bills</p>
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
        <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Delete Account</p>
              <p className="text-sm text-gray-500">Permanently delete your account and data</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete
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
                  <h3 className="text-lg font-semibold text-gray-900">Delete Account</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-gray-600 mb-6">
                Are you sure you want to delete your account? All your data including transactions,
                reminders, and settings will be permanently removed.
              </p>

              {deleteAccountMutation.isError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {(deleteAccountMutation.error as any)?.response?.data?.message || 'Failed to delete account'}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleDeleteAccount}
                  disabled={deleteAccountMutation.isPending}
                >
                  {deleteAccountMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Delete Account
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
