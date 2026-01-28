import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  Users, ArrowLeft, Plus, Lock, Shield, Settings, TrendingUp, TrendingDown,
  PieChart, Calendar, Bell, RefreshCw, Copy, CheckCircle, XCircle, Edit3,
  Eye, UserPlus, Crown, Clock, Wallet, Home, ShoppingCart, Car, Heart,
  GraduationCap, Zap, Coffee, Plane, Gift, Share2, LogOut,
} from 'lucide-react';
import { familyApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui';

// Types
interface FamilyMember {
  userId: string;
  email: string;
  nickname: string;
  fullName?: string;
  relation: 'Father' | 'Mother' | 'Son' | 'Daughter' | 'Spouse' | 'Grandparent' | 'Other';
  role: 'Admin' | 'Member' | 'Viewer';
  permissions: { canViewBudget: boolean; canEditBudget: boolean; canViewExpenses: boolean; canAddExpenses: boolean; canViewReminders: boolean; canManageMembers: boolean; };
  monthlySpending: number;
  monthlySpendingLimit?: number;
  joinedAt: string;
  status: 'active' | 'pending' | 'inactive';
  avatar?: string;
  lastActive?: string;
}

interface BudgetCategory { name: string; allocated: number; spent: number; }

interface Family {
  _id: string;
  familyCode: string;
  familyName: string;
  createdBy: string;
  members: FamilyMember[];
  sharedBudget: { amount: number; period: 'weekly' | 'monthly' | 'yearly'; categories: BudgetCategory[]; };
  settings: { currency: string; timezone: string; notificationsEnabled: boolean; autoSyncEnabled: boolean; privacyLevel: 'open' | 'restricted' | 'private'; };
  lastSyncedAt: string;
  isActive: boolean;
}

interface Transaction { _id: string; amount: number; category: string; merchant: string; date: string; type: 'expense' | 'income'; user: string; }
interface Reminder { _id: string; title: string; amount: number; dueDate: string; type: string; user: string; }

interface FamilyDashboardData {
  family: Family;
  summary: { totalMembers: number; totalBudget: number; totalExpenses: number; totalIncome: number; budgetUsedPercentage: number; remainingBudget: number; categoryBreakdown: Array<{ name: string; amount: number; percentage: number; }>; };
  recentTransactions: Transaction[];
  upcomingReminders: Reminder[];
  lastSyncedAt: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  Groceries: <ShoppingCart className="w-4 h-4" />, Food: <Coffee className="w-4 h-4" />, Transport: <Car className="w-4 h-4" />,
  Healthcare: <Heart className="w-4 h-4" />, Education: <GraduationCap className="w-4 h-4" />, Utilities: <Zap className="w-4 h-4" />,
  Entertainment: <Gift className="w-4 h-4" />, Travel: <Plane className="w-4 h-4" />, Shopping: <ShoppingCart className="w-4 h-4" />,
  Home: <Home className="w-4 h-4" />, Other: <Wallet className="w-4 h-4" />,
};

const relationAvatars: Record<string, string> = { Father: '👨‍💼', Mother: '👩‍💼', Son: '👦', Daughter: '👧', Spouse: '💑', Grandparent: '👴', Other: '👤' };
const relationColors: Record<string, string> = {
  Father: 'bg-blue-100 text-blue-700 border-blue-200', Mother: 'bg-pink-100 text-pink-700 border-pink-200',
  Son: 'bg-purple-100 text-purple-700 border-purple-200', Daughter: 'bg-rose-100 text-rose-700 border-rose-200',
  Spouse: 'bg-amber-100 text-amber-700 border-amber-200', Grandparent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Other: 'bg-gray-100 text-gray-700 border-gray-200',
};

const FamilyModePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'expenses' | 'budget' | 'reminders' | 'connect' | 'join'>('overview');
  const [hasFamily, setHasFamily] = useState(false);
  const [dashboardData, setDashboardData] = useState<FamilyDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<FamilyMember | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ familyName: '', nickname: '', relation: 'Father' as FamilyMember['relation'], budgetAmount: 50000 });
  const [joinForm, setJoinForm] = useState({ familyCode: '', nickname: '', relation: 'Other' as FamilyMember['relation'] });
  const [inviteForm, setInviteForm] = useState({ email: '', relation: 'Other' as FamilyMember['relation'], role: 'Member' as FamilyMember['role'] });

  const loadFamilyData = async () => {
    try {
      const response = await familyApi.getDashboard();
      if (response.success && response.data) {
        setDashboardData(response.data);
        setHasFamily(true);
      } else {
        setHasFamily(false);
      }
    } catch (error) {
      setHasFamily(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFamilyData();
  }, []);

  const handleCopyCode = async () => {
    if (dashboardData?.family.familyCode) {
      await navigator.clipboard.writeText(dashboardData.family.familyCode);
      setCopiedCode(true);
      toast.success(t('common.copied'));
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadFamilyData();
    setIsRefreshing(false);
    toast.success(t('common.refresh') + '!');
  };

  useEffect(() => {
    loadFamilyData();
  }, []);

  const handleCreateFamily = async () => {
    if (!createForm.familyName.trim()) { toast.error(t('family.familyName') + ' required'); return; }
    try {
      const response = await familyApi.createFamily({ familyName: createForm.familyName, nickname: createForm.nickname, relation: createForm.relation, sharedBudget: { amount: createForm.budgetAmount, period: 'monthly' } });
      if (response.success) { toast.success(t('family.createFamily') + '!'); setShowCreateModal(false); loadFamilyData(); }
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to create family'); }
  };

  const handleJoinFamily = async () => {
    if (joinForm.familyCode.length !== 6) { toast.error('Enter valid 6-digit code'); return; }
    try {
      const response = await familyApi.joinFamily({ familyCode: joinForm.familyCode.toUpperCase(), nickname: joinForm.nickname, relation: joinForm.relation });
      if (response.success) { toast.success(response.message || t('family.joinFamily') + '!'); setShowJoinModal(false); loadFamilyData(); }
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to join'); }
  };

  const handleInviteMember = async () => {
    if (!inviteForm.email.trim()) { toast.error(t('auth.email') + ' required'); return; }
    try {
      const response = await familyApi.inviteMember({ email: inviteForm.email, relation: inviteForm.relation, role: inviteForm.role === 'Admin' ? 'Member' : inviteForm.role });
      if (response.success) { toast.success(`${t('family.inviteMember')} sent to ${inviteForm.email}`); setShowInviteModal(false); setInviteForm({ email: '', relation: 'Other', role: 'Member' }); }
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed'); }
  };

  const handleLeaveFamily = async () => {
    if (!confirm(t('family.leaveFamily') + '?')) return;
    try { const response = await familyApi.leaveFamily(); if (response.success) { toast.success(t('family.leaveFamily')); setHasFamily(false); setDashboardData(null); } }
    catch (error: any) { toast.error(error.response?.data?.message || 'Failed'); }
  };

  const handleRegenerateCode = async () => {
    if (!confirm(t('family.regenerateCode') + '?')) return;
    try { const response = await familyApi.regenerateCode(); if (response.success) { toast.success(t('family.regenerateCode')); loadFamilyData(); } }
    catch (error: any) { toast.error(error.response?.data?.message || 'Failed'); }
  };

  const currentMember = dashboardData?.family.members.find(m => m.userId === (user as any)?._id || m.email === user?.email);
  const isAdmin = currentMember?.role === 'Admin';

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTimeAgo = (date: string) => { const diffMins = Math.floor((Date.now() - new Date(date).getTime()) / 60000); if (diffMins < 1) return 'Just now'; if (diffMins < 60) return `${diffMins}m ago`; if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`; return `${Math.floor(diffMins / 1440)}d ago`; };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">{t('common.loading')} {t('family.title')}...</p>
        </div>
      </div>
    );
  }

  // No family - Welcome screen
  if (!hasFamily) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-2 text-white hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></Button>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg shadow-blue-500/30"><Users className="w-7 h-7 text-white" /></div>
                <div><h1 className="text-2xl font-bold text-white">{t('family.title')}</h1><p className="text-sm text-white/60">{t('family.trackExpensesTogether')}</p></div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-500/30 mb-6">
              <Shield className="w-4 h-4 text-green-400" /><span className="text-green-400 text-sm font-medium">{t('family.secure')} & {t('family.private')}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('common.welcome')} to <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{t('family.title')}</span></h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">{t('family.connectYourFamily')}. {t('family.trackExpensesTogether')}. Share budgets, monitor spending, and achieve financial goals as a family.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid md:grid-cols-3 gap-6 mb-12">
            {[{ icon: <Wallet className="w-6 h-6" />, title: t('family.shared') + ' ' + t('family.budget'), desc: 'Set and track family budgets together' },
              { icon: <TrendingUp className="w-6 h-6" />, title: 'Real-time Sync', desc: 'See expenses as they happen' },
              { icon: <Lock className="w-6 h-6" />, title: 'Privacy Controls', desc: 'Control who sees what' }].map((f, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3><p className="text-white/60 text-sm">{f.desc}</p>
              </div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => setShowCreateModal(true)} className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all hover:scale-105 flex items-center justify-center gap-3"><Plus className="w-5 h-5" />{t('family.createFamily')}</button>
            <button onClick={() => setShowJoinModal(true)} className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all hover:scale-105 flex items-center justify-center gap-3"><UserPlus className="w-5 h-5" />{t('family.joinFamily')}</button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-16 flex flex-wrap items-center justify-center gap-6 text-white/40 text-sm">
            <div className="flex items-center gap-2"><Lock className="w-4 h-4" /><span>End-to-end encrypted</span></div>
            <div className="flex items-center gap-2"><Shield className="w-4 h-4" /><span>Bank-grade security</span></div>
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /><span>Real-time data sync</span></div>
          </motion.div>
        </div>

        {showCreateModal && <CreateFamilyModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} form={createForm} setForm={setCreateForm} onSubmit={handleCreateFamily} />}
        {showJoinModal && <JoinFamilyModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} form={joinForm} setForm={setJoinForm} onSubmit={handleJoinFamily} />}
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-2 text-white hover:bg-white/10 flex-shrink-0"><ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl shadow-lg shadow-blue-500/30 flex-shrink-0"><Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
                <div className="min-w-0 flex-1"><h1 className="text-base sm:text-lg font-bold text-white truncate">{dashboardData?.family.familyName}</h1>
                  <div className="flex items-center gap-1.5 sm:gap-2"><div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0"></div><span className="text-[10px] sm:text-xs text-green-400 font-medium whitespace-nowrap">{t('family.connected')}</span><span className="text-white/40 hidden sm:inline">•</span><span className="text-[10px] sm:text-xs text-white/60 whitespace-nowrap hidden sm:inline">{dashboardData?.family.members.length} {t('family.members').toLowerCase()}</span></div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button onClick={handleCopyCode} className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl border border-white/10 hover:bg-white/20 transition-all">
                <Share2 className="w-4 h-4 text-white/60" /><span className="text-white/60 text-xs">{t('family.shareCode')}</span>
                {copiedCode ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/60" />}
              </button>
              <button onClick={handleRefresh} disabled={isRefreshing} className="p-1.5 sm:p-2 bg-white/10 rounded-lg sm:rounded-xl border border-white/10 hover:bg-white/20 transition-all"><RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} /></button>
              {isAdmin && <button onClick={() => setShowSettingsModal(true)} className="p-1.5 sm:p-2 bg-white/10 rounded-lg sm:rounded-xl border border-white/10 hover:bg-white/20 transition-all"><Settings className="w-4 h-4 sm:w-5 sm:h-5 text-white" /></button>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - Mobile optimized with horizontal scroll */}
      <div className="bg-white/5 border-b border-white/10 sticky top-[57px] sm:top-[65px] z-10 relative mb-1">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex gap-1 overflow-x-auto hide-scrollbar py-2.5 sm:py-2 -mx-2 px-2 scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
            {[{ id: 'overview', label: t('family.overview'), icon: <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> }, { id: 'members', label: t('family.members'), icon: <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> }, { id: 'expenses', label: t('family.expenses'), icon: <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> }, { id: 'budget', label: t('family.budget'), icon: <PieChart className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> }, { id: 'reminders', label: t('family.reminders'), icon: <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> }].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-[11px] sm:text-sm whitespace-nowrap transition-all flex-shrink-0 min-w-fit ${activeTab === tab.id ? 'bg-white/20 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>{tab.icon}<span>{tab.label}</span></button>
            ))}
          </div>
        </div>
        {/* Right fade indicator for mobile scroll hint */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900/80 to-transparent pointer-events-none sm:hidden" />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 mt-1">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3"><div className="p-2 bg-blue-500/20 rounded-lg"><Wallet className="w-5 h-5 text-blue-400" /></div><span className="text-xs text-blue-400 font-medium uppercase">{t('dashboard.budget')}</span></div>
                  <p className="text-2xl font-bold text-white mb-1">{formatCurrency(dashboardData?.summary.totalBudget || 0)}</p><p className="text-xs text-white/60">Monthly allocation</p>
                </div>
                <div className="bg-gradient-to-br from-rose-500/20 to-rose-600/10 backdrop-blur-sm border border-rose-500/20 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3"><div className="p-2 bg-rose-500/20 rounded-lg"><TrendingDown className="w-5 h-5 text-rose-400" /></div><span className="text-xs text-rose-400 font-medium uppercase">{t('dashboard.spent')}</span></div>
                  <p className="text-2xl font-bold text-white mb-1">{formatCurrency(dashboardData?.summary.totalExpenses || 0)}</p><p className="text-xs text-white/60">This month</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3"><div className="p-2 bg-emerald-500/20 rounded-lg"><TrendingUp className="w-5 h-5 text-emerald-400" /></div><span className="text-xs text-emerald-400 font-medium uppercase">{t('dashboard.remaining')}</span></div>
                  <p className="text-2xl font-bold text-white mb-1">{formatCurrency(dashboardData?.summary.remainingBudget || 0)}</p><p className="text-xs text-white/60">Left to spend</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3"><div className="p-2 bg-purple-500/20 rounded-lg"><PieChart className="w-5 h-5 text-purple-400" /></div><span className="text-xs text-purple-400 font-medium uppercase">Progress</span></div>
                  <p className="text-2xl font-bold text-white mb-1">{dashboardData?.summary.budgetUsedPercentage || 0}%</p>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${(dashboardData?.summary.budgetUsedPercentage || 0) > 90 ? 'bg-rose-500' : (dashboardData?.summary.budgetUsedPercentage || 0) > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(dashboardData?.summary.budgetUsedPercentage || 0, 100)}%` }} /></div>
                </div>
              </div>

              {/* Family Head & Quick Actions */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4"><Crown className="w-5 h-5 text-amber-400" /><span className="text-white/80 font-medium">Family Head</span></div>
                  {dashboardData?.family.members.filter(m => m.role === 'Admin').slice(0, 1).map((admin) => (
                    <div key={admin.userId} className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center text-4xl border-2 border-amber-500/30">{relationAvatars[admin.relation]}</div>
                      <div className="flex-1"><p className="text-xl font-bold text-white">{admin.nickname || admin.fullName}</p><p className="text-white/60 text-sm">{admin.email}</p>
                        <div className="flex items-center gap-2 mt-1"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${relationColors[admin.relation]}`}>{admin.relation}</span><div className="flex items-center gap-1"><Lock className="w-3 h-3 text-green-400" /><span className="text-xs text-green-400">Admin</span></div></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-white/80 font-medium mb-4">{t('dashboard.quickActions')}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setShowInviteModal(true)} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/5 hover:border-white/20"><UserPlus className="w-6 h-6 text-blue-400" /><span className="text-white/80 text-xs font-medium">{t('family.inviteMember')}</span></button>
                    <button onClick={() => setShowBudgetModal(true)} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/5 hover:border-white/20"><Edit3 className="w-6 h-6 text-emerald-400" /><span className="text-white/80 text-xs font-medium">{t('budget.editBudget')}</span></button>
                    <button onClick={handleCopyCode} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/5 hover:border-white/20"><Share2 className="w-6 h-6 text-purple-400" /><span className="text-white/80 text-xs font-medium">{t('family.shareCode')}</span></button>
                    <button onClick={handleRefresh} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/5 hover:border-white/20"><RefreshCw className={`w-6 h-6 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} /><span className="text-white/80 text-xs font-medium">Sync Data</span></button>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-white/80 font-medium mb-4">Sync Status</h3>
                  <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-400" /></div><div><p className="text-white font-medium">All data synced</p><p className="text-white/60 text-sm">Last updated: {dashboardData?.lastSyncedAt ? formatTimeAgo(dashboardData.lastSyncedAt) : 'Just now'}</p></div></div>
                  <div className="flex items-center gap-2 text-white/40 text-xs"><Shield className="w-4 h-4" /><span>End-to-end encrypted sync</span></div>
                </div>
              </div>

              {/* Category & Recent */}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><PieChart className="w-5 h-5 text-blue-400" />{t('dashboard.categoryBreakdown')}</h3>
                  <div className="space-y-3">
                    {dashboardData?.summary.categoryBreakdown.slice(0, 6).map((cat, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="p-1.5 bg-white/10 rounded-lg">{categoryIcons[cat.name] || <Wallet className="w-4 h-4 text-white/60" />}</div><span className="text-white/80 text-sm">{cat.name}</span></div><div className="text-right"><span className="text-white font-medium text-sm">{formatCurrency(cat.amount)}</span><span className="text-white/40 text-xs ml-2">{cat.percentage}%</span></div></div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: `${cat.percentage}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-rose-400" />{t('dashboard.recentTransactions')} ({t('family.title')})</h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {dashboardData?.recentTransactions.slice(0, 8).map((tx) => {
                      const member = dashboardData.family.members.find(m => m.userId === tx.user);
                      return (
                        <div key={tx._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg">{member ? relationAvatars[member.relation] : '👤'}</div><div><p className="text-white font-medium text-sm">{tx.merchant}</p><p className="text-white/50 text-xs">{member?.nickname} • {tx.category}</p></div></div>
                          <div className="text-right"><p className={`font-semibold ${tx.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'}`}>{tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}</p><p className="text-white/40 text-xs">{formatDate(tx.date)}</p></div>
                        </div>
                      );
                    })}
                    {(!dashboardData?.recentTransactions || dashboardData.recentTransactions.length === 0) && <div className="text-center py-8 text-white/40"><TrendingDown className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>{t('dashboard.noTransactions')}</p></div>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'members' && (
            <motion.div key="members" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="flex items-center justify-between"><h2 className="text-xl font-semibold text-white">{t('family.members')}</h2>{isAdmin && <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all"><UserPlus className="w-4 h-4" />{t('family.inviteMember')}</button>}</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData?.family.members.map((member) => (
                  <MemberCard key={member.userId} member={member} isCurrentUser={member.userId === (user as any)?._id || member.email === user?.email} isAdmin={isAdmin} formatCurrency={formatCurrency} formatDate={formatDate} onEdit={() => { setMemberToEdit(member); setShowMemberModal(true); }} onViewExpenses={() => { setSelectedMember(member.userId); setActiveTab('expenses'); }} />
                ))}
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-3"><div className="p-2 bg-purple-500/20 rounded-lg"><Share2 className="w-5 h-5 text-purple-400" /></div><div><h3 className="text-white font-semibold">{t('family.inviteMember')}</h3><p className="text-white/60 text-sm">Share invite code with family members to join</p></div></div></div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-white/10 rounded-xl p-4 flex items-center justify-center"><span className="text-white/60 text-sm">Code hidden for security</span></div>
                  <div className="flex flex-col gap-2">
                    <button onClick={handleCopyCode} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl hover:shadow-lg transition-all">{copiedCode ? <CheckCircle className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}<span className="text-white text-sm font-medium">{copiedCode ? t('common.copied') : t('common.copy') + ' Code'}</span></button>
                    {isAdmin && <button onClick={handleRegenerateCode} className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"><RefreshCw className="w-4 h-4 text-white" /><span className="text-white text-sm">New Code</span></button>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'expenses' && (
            <motion.div key="expenses" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="flex items-center gap-4 overflow-x-auto pb-2">
                <button onClick={() => setSelectedMember(null)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${!selectedMember ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}><Users className="w-4 h-4" />{t('family.allMembers')}</button>
                {dashboardData?.family.members.map((member) => (<button key={member.userId} onClick={() => setSelectedMember(member.userId)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${selectedMember === member.userId ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}><span>{relationAvatars[member.relation]}</span>{member.nickname}</button>))}
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10"><h3 className="text-white font-semibold">{selectedMember ? `${dashboardData?.family.members.find(m => m.userId === selectedMember)?.nickname}'s ${t('family.expenses')}` : `All ${t('family.title')} ${t('family.expenses')}`}</h3></div>
                <div className="divide-y divide-white/5">
                  {dashboardData?.recentTransactions.filter(tx => !selectedMember || tx.user === selectedMember).map((tx) => {
                    const member = dashboardData.family.members.find(m => m.userId === tx.user);
                    const isCurrentUser = tx.user === user?.id;
                    const displayName = isCurrentUser ? 'You' : member?.nickname;
                    return (
                      <div key={tx._id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-all">
                        <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl">{categoryIcons[tx.category] || <Wallet className="w-5 h-5 text-white/60" />}</div><div><p className="text-white font-medium">{tx.merchant}</p><div className="flex items-center gap-2 text-white/50 text-sm"><span>{relationAvatars[member?.relation || 'Other']}</span><span>{displayName}</span><span>•</span><span>{tx.category}</span></div></div></div>
                        <div className="text-right"><p className={`font-bold ${tx.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'}`}>{tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}</p><p className="text-white/40 text-sm">{formatDate(tx.date)}</p></div>
                      </div>
                    );
                  })}
                  {(!dashboardData?.recentTransactions || dashboardData.recentTransactions.filter(tx => !selectedMember || tx.user === selectedMember).length === 0) && <div className="text-center py-12 text-white/40"><TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-50" /><p className="text-lg">{t('family.noExpensesFound')}</p></div>}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'budget' && (
            <motion.div key="budget" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-600/20 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div><h3 className="text-white/80 text-sm font-medium uppercase tracking-wide mb-1">{t('family.title')} {t('family.budget')} ({dashboardData?.family.sharedBudget.period})</h3><p className="text-4xl font-bold text-white">{formatCurrency(dashboardData?.family.sharedBudget.amount || 0)}</p></div>
                  {isAdmin && <button onClick={() => setShowBudgetModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"><Edit3 className="w-4 h-4 text-white" /><span className="text-white text-sm">{t('common.edit')}</span></button>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm"><span className="text-white/60">{t('dashboard.spent')}: {formatCurrency(dashboardData?.summary.totalExpenses || 0)}</span><span className="text-white font-medium">{dashboardData?.summary.budgetUsedPercentage || 0}% used</span></div>
                  <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${(dashboardData?.summary.budgetUsedPercentage || 0) > 90 ? 'bg-gradient-to-r from-rose-500 to-red-500' : (dashboardData?.summary.budgetUsedPercentage || 0) > 70 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-green-500'}`} style={{ width: `${Math.min(dashboardData?.summary.budgetUsedPercentage || 0, 100)}%` }} /></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-white/60">{t('dashboard.remaining')}: {formatCurrency(dashboardData?.summary.remainingBudget || 0)}</span></div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><PieChart className="w-5 h-5 text-purple-400" />Category-wise Budget</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {dashboardData?.family.sharedBudget.categories.map((cat, idx) => {
                    const percentage = cat.allocated > 0 ? Math.round((cat.spent / cat.allocated) * 100) : 0;
                    return (
                      <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><div className="p-2 bg-white/10 rounded-lg">{categoryIcons[cat.name] || <Wallet className="w-4 h-4 text-white/60" />}</div><span className="text-white font-medium">{cat.name}</span></div><span className={`text-sm font-medium ${percentage > 90 ? 'text-rose-400' : percentage > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>{percentage}%</span></div>
                        <div className="space-y-2"><div className="w-full h-2 bg-white/10 rounded-full overflow-hidden"><div className={`h-full rounded-full ${percentage > 90 ? 'bg-rose-500' : percentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(percentage, 100)}%` }} /></div><div className="flex items-center justify-between text-xs text-white/60"><span>Spent: {formatCurrency(cat.spent)}</span><span>Budget: {formatCurrency(cat.allocated)}</span></div></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-400" />{t('family.members')} Spending Overview</h3>
                <div className="space-y-4">
                  {dashboardData?.family.members.map((member) => {
                    const limit = member.monthlySpendingLimit || dashboardData.family.sharedBudget.amount / dashboardData.family.members.length;
                    const percentage = limit > 0 ? Math.round((member.monthlySpending / limit) * 100) : 0;
                    return (
                      <div key={member.userId} className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">{relationAvatars[member.relation]}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2"><span className="text-white font-medium">{member.nickname}</span><span className={`text-xs px-2 py-0.5 rounded-full ${relationColors[member.relation]}`}>{member.relation}</span></div><span className="text-white font-medium">{formatCurrency(member.monthlySpending)}</span></div>
                          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden"><div className={`h-full rounded-full ${percentage > 90 ? 'bg-rose-500' : percentage > 70 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(percentage, 100)}%` }} /></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'reminders' && (
            <motion.div key="reminders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="flex items-center justify-between"><h2 className="text-xl font-semibold text-white">Upcoming Bills & {t('family.reminders')}</h2></div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                {dashboardData?.upcomingReminders && dashboardData.upcomingReminders.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {dashboardData.upcomingReminders.map((reminder) => {
                      const member = dashboardData.family.members.find(m => m.userId === reminder.user);
                      const dueDate = new Date(reminder.dueDate);
                      const isOverdue = dueDate < new Date();
                      const isDueSoon = dueDate <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                      return (
                        <div key={reminder._id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-all">
                          <div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-rose-500/20 text-rose-400' : isDueSoon ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}><Bell className="w-5 h-5" /></div><div><p className="text-white font-medium">{reminder.title}</p><div className="flex items-center gap-2 text-white/50 text-sm"><span>{relationAvatars[member?.relation || 'Other']}</span><span>{member?.nickname}</span><span>•</span><span className="capitalize">{reminder.type}</span></div></div></div>
                          <div className="text-right"><p className="text-white font-bold">{formatCurrency(reminder.amount)}</p><p className={`text-sm ${isOverdue ? 'text-rose-400' : isDueSoon ? 'text-amber-400' : 'text-white/50'}`}>{isOverdue ? t('dashboard.overdue') : formatDate(reminder.dueDate)}</p></div>
                        </div>
                      );
                    })}
                  </div>
                ) : (<div className="text-center py-12 text-white/40"><Bell className="w-12 h-12 mx-auto mb-3 opacity-50" /><p className="text-lg">{t('dashboard.noReminders')}</p><p className="text-sm">{t('dashboard.noRemindersDesc')}</p></div>)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 border-t border-white/10"><button onClick={handleLeaveFamily} className="flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors text-sm"><LogOut className="w-4 h-4" />{t('family.leaveFamily')}</button></div>

      {showCreateModal && <CreateFamilyModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} form={createForm} setForm={setCreateForm} onSubmit={handleCreateFamily} />}
      {showJoinModal && <JoinFamilyModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} form={joinForm} setForm={setJoinForm} onSubmit={handleJoinFamily} />}
      {showInviteModal && <InviteMemberModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} form={inviteForm} setForm={setInviteForm} onSubmit={handleInviteMember} familyCode={dashboardData?.family.familyCode} />}
      {showSettingsModal && <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} family={dashboardData?.family} onUpdate={loadFamilyData} onRegenerateCode={handleRegenerateCode} />}
      {showBudgetModal && <EditBudgetModal isOpen={showBudgetModal} onClose={() => setShowBudgetModal(false)} family={dashboardData?.family} onUpdate={loadFamilyData} />}
      {showMemberModal && <EditMemberModal isOpen={showMemberModal} onClose={() => { setShowMemberModal(false); setMemberToEdit(null); }} member={memberToEdit!} isAdmin={isAdmin} onUpdate={loadFamilyData} />}
    </div>
  );
};

// Member Card Component
const MemberCard: React.FC<{ member: FamilyMember; isCurrentUser: boolean; isAdmin: boolean; formatCurrency: (n: number) => string; formatDate: (d: string) => string; onEdit: () => void; onViewExpenses: () => void; }> = ({ member, isCurrentUser, isAdmin, formatCurrency, formatDate, onEdit, onViewExpenses }) => {
  const { t } = useTranslation();
  return (
  <div className={`bg-white/5 backdrop-blur-sm border rounded-2xl p-5 transition-all hover:bg-white/10 ${isCurrentUser ? 'border-blue-500/30 ring-1 ring-blue-500/20' : 'border-white/10'}`}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-3xl border border-white/10">{relationAvatars[member.relation]}</div>
        <div><div className="flex items-center gap-2"><p className="text-white font-semibold">{member.nickname || member.fullName}</p>{member.role === 'Admin' && <Crown className="w-4 h-4 text-amber-400" />}</div><p className="text-white/50 text-sm truncate max-w-[150px]">{member.email}</p></div>
      </div>
      <div className={`w-3 h-3 rounded-full ${member.status === 'active' ? 'bg-green-400' : 'bg-amber-400'} animate-pulse`} />
    </div>
    <div className="flex flex-wrap gap-2 mb-4">
      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${relationColors[member.relation]}`}>{member.relation}</span>
      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${member.role === 'Admin' ? 'bg-amber-100 text-amber-700 border border-amber-200' : member.role === 'Viewer' ? 'bg-gray-100 text-gray-700 border border-gray-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>{member.role}</span>
      {isCurrentUser && <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700 border border-green-200">You</span>}
    </div>
    <div className="bg-white/5 rounded-xl p-3 mb-4"><div className="flex items-center justify-between"><span className="text-white/60 text-sm">Monthly Spending</span><span className="text-white font-bold">{formatCurrency(member.monthlySpending)}</span></div></div>
    <div className="flex items-center justify-between text-xs text-white/40 mb-4"><div className="flex items-center gap-1"><Calendar className="w-3 h-3" /><span>Joined {formatDate(member.joinedAt)}</span></div>{member.lastActive && <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>Active recently</span></div>}</div>
    <div className="flex gap-2"><button onClick={onViewExpenses} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-white/80 text-sm"><Eye className="w-4 h-4" />{t('family.expenses')}</button>{(isAdmin || isCurrentUser) && <button onClick={onEdit} className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-white/80 text-sm"><Edit3 className="w-4 h-4" /></button>}</div>
  </div>
  );
};

// Modal Components
const CreateFamilyModal: React.FC<{ isOpen: boolean; onClose: () => void; form: any; setForm: any; onSubmit: () => void; }> = ({ isOpen, onClose, form, setForm, onSubmit }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;
  const relations = ['Father', 'Mother', 'Son', 'Daughter', 'Spouse', 'Grandparent', 'Other'];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-white/10"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-white">{t('family.createFamily')}</h2><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all"><XCircle className="w-5 h-5 text-white/60" /></button></div></div>
        <div className="p-6 space-y-4">
          <div><label className="block text-sm font-medium text-white/80 mb-2">{t('family.familyName')}</label><input type="text" value={form.familyName} onChange={(e) => setForm({ ...form, familyName: e.target.value })} placeholder="e.g., Kumar Family" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
          <div><label className="block text-sm font-medium text-white/80 mb-2">Your Nickname</label><input type="text" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="How family members call you" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
          <div><label className="block text-sm font-medium text-white/80 mb-2">Your Role</label><div className="grid grid-cols-4 gap-2">{relations.map((rel) => (<button key={rel} onClick={() => setForm({ ...form, relation: rel })} className={`p-2 rounded-xl text-xs font-medium transition-all ${form.relation === rel ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}><span className="text-lg block mb-1">{relationAvatars[rel]}</span>{rel}</button>))}</div></div>
          <div><label className="block text-sm font-medium text-white/80 mb-2">Monthly {t('family.title')} {t('family.budget')} ({t('currency.symbol')})</label><input type="number" value={form.budgetAmount} onChange={(e) => setForm({ ...form, budgetAmount: Number(e.target.value) })} placeholder="50000" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
        </div>
        <div className="p-6 border-t border-white/10 flex gap-3"><button onClick={onClose} className="flex-1 px-4 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all font-medium">{t('common.cancel')}</button><button onClick={onSubmit} className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all font-medium">{t('family.createFamily')}</button></div>
      </motion.div>
    </div>
  );
};

const JoinFamilyModal: React.FC<{ isOpen: boolean; onClose: () => void; form: any; setForm: any; onSubmit: () => void; }> = ({ isOpen, onClose, form, setForm, onSubmit }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;
  const relations = ['Father', 'Mother', 'Son', 'Daughter', 'Spouse', 'Grandparent', 'Other'];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-white/10"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-white">{t('family.joinFamily')}</h2><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all"><XCircle className="w-5 h-5 text-white/60" /></button></div></div>
        <div className="p-6 space-y-4">
          <div><label className="block text-sm font-medium text-white/80 mb-2">6-Digit {t('family.familyCode')}</label><input type="text" value={form.familyCode} onChange={(e) => setForm({ ...form, familyCode: e.target.value.toUpperCase().slice(0, 6) })} placeholder="ABC123" className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-center text-2xl font-mono tracking-widest placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 uppercase" maxLength={6} /><p className="text-white/40 text-xs mt-2 text-center">Ask your family member for this code</p></div>
          <div><label className="block text-sm font-medium text-white/80 mb-2">Your Nickname</label><input type="text" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="How family members call you" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
          <div><label className="block text-sm font-medium text-white/80 mb-2">Your Relation</label><div className="grid grid-cols-4 gap-2">{relations.map((rel) => (<button key={rel} onClick={() => setForm({ ...form, relation: rel })} className={`p-2 rounded-xl text-xs font-medium transition-all ${form.relation === rel ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}><span className="text-lg block mb-1">{relationAvatars[rel]}</span>{rel}</button>))}</div></div>
        </div>
        <div className="p-6 border-t border-white/10 flex gap-3"><button onClick={onClose} className="flex-1 px-4 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all font-medium">{t('common.cancel')}</button><button onClick={onSubmit} disabled={form.familyCode.length !== 6} className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed">{t('family.joinFamily')}</button></div>
      </motion.div>
    </div>
  );
};

const InviteMemberModal: React.FC<{ isOpen: boolean; onClose: () => void; form: any; setForm: any; onSubmit: () => void; familyCode?: string; }> = ({ isOpen, onClose, form, setForm, onSubmit, familyCode }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;
  const relations = ['Father', 'Mother', 'Son', 'Daughter', 'Spouse', 'Grandparent', 'Other'];
  const roles = ['Member', 'Viewer'];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-white/10"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-white">{t('family.inviteMember')}</h2><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all"><XCircle className="w-5 h-5 text-white/60" /></button></div></div>
        <div className="p-6 space-y-4">
          <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 rounded-xl p-4"><p className="text-white/80 text-sm mb-2">Share invite code with family members:</p><div className="flex items-center justify-between bg-white/10 rounded-lg p-3"><span className="text-white/60 text-sm">Click to copy code</span><button onClick={() => { navigator.clipboard.writeText(familyCode || ''); toast.success(t('common.copied')); }} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:shadow-lg transition-all flex items-center gap-2"><Copy className="w-4 h-4 text-white" /><span className="text-white text-sm font-medium">{t('common.copy')} Code</span></button></div></div>
          <div className="flex items-center gap-4 text-white/40 text-sm"><div className="flex-1 h-px bg-white/10"></div><span>Or send invitation</span><div className="flex-1 h-px bg-white/10"></div></div>
          <div><label className="block text-sm font-medium text-white/80 mb-2">{t('auth.emailAddress')}</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="member@example.com" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
          <div><label className="block text-sm font-medium text-white/80 mb-2">Relation</label><div className="grid grid-cols-4 gap-2">{relations.map((rel) => (<button key={rel} onClick={() => setForm({ ...form, relation: rel })} className={`p-2 rounded-xl text-xs font-medium transition-all ${form.relation === rel ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}><span className="text-lg block mb-1">{relationAvatars[rel]}</span>{rel}</button>))}</div></div>
          <div><label className="block text-sm font-medium text-white/80 mb-2">Access Level</label><div className="grid grid-cols-2 gap-2">{roles.map((role) => (<button key={role} onClick={() => setForm({ ...form, role })} className={`p-3 rounded-xl text-sm font-medium transition-all ${form.role === role ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>{role === 'Member' ? <><Edit3 className="w-4 h-4 inline mr-2" />Member</> : <><Eye className="w-4 h-4 inline mr-2" />Viewer</>}</button>))}</div></div>
        </div>
        <div className="p-6 border-t border-white/10 flex gap-3"><button onClick={onClose} className="flex-1 px-4 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all font-medium">{t('common.cancel')}</button><button onClick={onSubmit} className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all font-medium">{t('family.inviteMember')}</button></div>
      </motion.div>
    </div>
  );
};

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; family?: Family; onUpdate: () => void; onRegenerateCode: () => void; }> = ({ isOpen, onClose, family, onUpdate, onRegenerateCode }) => {
  const { t } = useTranslation();
  const [familyName, setFamilyName] = useState(family?.familyName || '');
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => { if (family) setFamilyName(family.familyName); }, [family]);
  const handleSave = async () => { try { setIsLoading(true); await familyApi.updateFamily({ familyName }); toast.success(t('common.settings') + ' updated'); onUpdate(); onClose(); } catch (error: any) { toast.error(error.response?.data?.message || 'Failed'); } finally { setIsLoading(false); } };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-white/10"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-white">{t('family.title')} {t('common.settings')}</h2><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all"><XCircle className="w-5 h-5 text-white/60" /></button></div></div>
        <div className="p-6 space-y-4"><div><label className="block text-sm font-medium text-white/80 mb-2">{t('family.familyName')}</label><input type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div><div><label className="block text-sm font-medium text-white/80 mb-2">{t('family.familyCode')}</label><div className="flex items-center gap-2"><div className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl"><span className="text-white/60 text-sm">Hidden for security</span></div><button onClick={() => { navigator.clipboard.writeText(family?.familyCode || ''); toast.success(t('common.copied')); }} className="px-4 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all flex items-center gap-2"><Copy className="w-4 h-4 text-white" /><span className="text-white text-sm">{t('common.copy')}</span></button><button onClick={onRegenerateCode} className="px-4 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all"><RefreshCw className="w-5 h-5 text-white" /></button></div></div></div>
        <div className="p-6 border-t border-white/10 flex gap-3"><button onClick={onClose} className="flex-1 px-4 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all font-medium">{t('common.cancel')}</button><button onClick={handleSave} disabled={isLoading} className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all font-medium disabled:opacity-50">{isLoading ? t('common.loading') : t('common.save')}</button></div>
      </motion.div>
    </div>
  );
};

const EditBudgetModal: React.FC<{ isOpen: boolean; onClose: () => void; family?: Family; onUpdate: () => void; }> = ({ isOpen, onClose, family, onUpdate }) => {
  const { t } = useTranslation();
  const [budgetAmount, setBudgetAmount] = useState(family?.sharedBudget.amount || 50000);
  const [categories, setCategories] = useState(family?.sharedBudget.categories || []);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => { if (family) { setBudgetAmount(family.sharedBudget.amount); setCategories(family.sharedBudget.categories); } }, [family]);
  const handleSave = async () => { try { setIsLoading(true); await familyApi.updateFamily({ sharedBudget: { amount: budgetAmount, categories } }); toast.success(t('budget.budgetUpdated')); onUpdate(); onClose(); } catch (error: any) { toast.error(error.response?.data?.message || 'Failed'); } finally { setIsLoading(false); } };
  const updateCategory = (index: number, field: string, value: number) => { const updated = [...categories]; (updated[index] as any)[field] = value; setCategories(updated); };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-white/10"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-white">{t('budget.editBudget')}</h2><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all"><XCircle className="w-5 h-5 text-white/60" /></button></div></div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div><label className="block text-sm font-medium text-white/80 mb-2">Total Monthly {t('family.budget')} ({t('currency.symbol')})</label><input type="number" value={budgetAmount} onChange={(e) => setBudgetAmount(Number(e.target.value))} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-xl font-bold placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
          <div><label className="block text-sm font-medium text-white/80 mb-3">Category Allocation</label><div className="space-y-3">{categories.map((cat, idx) => (<div key={idx} className="flex items-center gap-3 bg-white/5 rounded-xl p-3"><div className="p-2 bg-white/10 rounded-lg">{categoryIcons[cat.name] || <Wallet className="w-4 h-4 text-white/60" />}</div><span className="flex-1 text-white font-medium">{cat.name}</span><input type="number" value={cat.allocated} onChange={(e) => updateCategory(idx, 'allocated', Number(e.target.value))} className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>))}</div></div>
        </div>
        <div className="p-6 border-t border-white/10 flex gap-3"><button onClick={onClose} className="flex-1 px-4 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all font-medium">{t('common.cancel')}</button><button onClick={handleSave} disabled={isLoading} className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all font-medium disabled:opacity-50">{isLoading ? t('common.loading') : t('common.save')}</button></div>
      </motion.div>
    </div>
  );
};

const EditMemberModal: React.FC<{ isOpen: boolean; onClose: () => void; member: FamilyMember; isAdmin: boolean; onUpdate: () => void; }> = ({ isOpen, onClose, member, isAdmin, onUpdate }) => {
  const { t } = useTranslation();
  const [nickname, setNickname] = useState(member.nickname);
  const [relation, setRelation] = useState(member.relation);
  const [role, setRole] = useState(member.role);
  const [spendingLimit, setSpendingLimit] = useState(member.monthlySpendingLimit || 0);
  const [isLoading, setIsLoading] = useState(false);
  const relations = ['Father', 'Mother', 'Son', 'Daughter', 'Spouse', 'Grandparent', 'Other'];
  const roles = ['Admin', 'Member', 'Viewer'];
  const handleSave = async () => { try { setIsLoading(true); await familyApi.updateMember(member.userId, { nickname, relation, role: isAdmin ? role : undefined, monthlySpendingLimit: isAdmin ? spendingLimit : undefined }); toast.success('Member updated'); onUpdate(); onClose(); } catch (error: any) { toast.error(error.response?.data?.message || 'Failed'); } finally { setIsLoading(false); } };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-white/10"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-white">{t('common.edit')} Member</h2><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all"><XCircle className="w-5 h-5 text-white/60" /></button></div></div>
        <div className="p-6 space-y-4">
          <div><label className="block text-sm font-medium text-white/80 mb-2">{t('auth.email')} (Read-only)</label><div className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl"><Lock className="w-4 h-4 text-white/40" /><span className="text-white/60">{member.email}</span></div></div>
          <div><label className="block text-sm font-medium text-white/80 mb-2">Nickname</label><input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
          <div><label className="block text-sm font-medium text-white/80 mb-2">Relation</label><div className="grid grid-cols-4 gap-2">{relations.map((rel) => (<button key={rel} onClick={() => setRelation(rel as any)} className={`p-2 rounded-xl text-xs font-medium transition-all ${relation === rel ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}><span className="text-lg block mb-1">{relationAvatars[rel]}</span>{rel}</button>))}</div></div>
          {isAdmin && <div><label className="block text-sm font-medium text-white/80 mb-2">Role</label><div className="grid grid-cols-3 gap-2">{roles.map((r) => (<button key={r} onClick={() => setRole(r as any)} className={`p-3 rounded-xl text-sm font-medium transition-all ${role === r ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>{r === 'Admin' && <Crown className="w-4 h-4 inline mr-1" />}{r}</button>))}</div></div>}
          {isAdmin && <div><label className="block text-sm font-medium text-white/80 mb-2">Monthly Spending Limit ({t('currency.symbol')})</label><input type="number" value={spendingLimit} onChange={(e) => setSpendingLimit(Number(e.target.value))} placeholder="No limit" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50" /><p className="text-white/40 text-xs mt-1">Leave 0 for no limit</p></div>}
        </div>
        <div className="p-6 border-t border-white/10 flex gap-3"><button onClick={onClose} className="flex-1 px-4 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all font-medium">{t('common.cancel')}</button><button onClick={handleSave} disabled={isLoading} className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all font-medium disabled:opacity-50">{isLoading ? t('common.loading') : t('common.save')}</button></div>
      </motion.div>
    </div>
  );
};

export default FamilyModePage;
