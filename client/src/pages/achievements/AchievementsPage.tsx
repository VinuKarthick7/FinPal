import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Star, Trophy, TrendingUp, Calendar, Award,
  Sparkles, Target, CheckCircle, Zap, Crown,
} from 'lucide-react';
import { achievementApi } from '@/lib/api';
import { Button } from '@/components/ui';

interface Achievement {
  _id: string;
  month: number;
  year: number;
  budgetAmount: number;
  totalExpenses: number;
  status: 'pending' | 'awarded' | 'finalized';
  earnedAt: string;
  metadata?: {
    savingsAmount?: number;
    budgetUtilization?: number;
    message?: string;
  };
}

interface AchievementStats {
  total: number;
  currentYear: number;
  longestStreak: number;
  yearlyBreakdown: Record<string, number>;
  recentAchievements: Achievement[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const AchievementsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    loadAchievements();
    loadStats();
  }, []);

  const loadAchievements = async () => {
    try {
      const response = await achievementApi.getAchievements();
      if (response.success) {
        setAchievements(response.data.achievements);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
      toast.error('Failed to load achievements');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await achievementApi.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getYearsWithAchievements = () => {
    const years = new Set(achievements.map(a => a.year));
    return Array.from(years).sort((a, b) => b - a);
  };

  const filteredAchievements = achievements.filter(a => a.year === selectedYear);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p>Loading achievements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="p-2 text-gray-700 hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Achievements</h1>
                <p className="text-sm text-gray-600">Your Budget Success Journey</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Trophy className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-xs text-amber-600 font-medium uppercase">Total</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stats?.total || 0}</p>
            <p className="text-xs text-gray-600">Stars Earned</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs text-blue-600 font-medium uppercase">This Year</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stats?.currentYear || 0}</p>
            <p className="text-xs text-gray-600">{new Date().getFullYear()}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs text-purple-600 font-medium uppercase">Streak</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stats?.longestStreak || 0}</p>
            <p className="text-xs text-gray-600">Months in a row</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Target className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-xs text-emerald-600 font-medium uppercase">Success Rate</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {stats && stats.total > 0 ? Math.round((stats.currentYear / new Date().getMonth() + 1) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-600">Budget discipline</p>
          </motion.div>
        </div>

        {/* Year Filter */}
        {getYearsWithAchievements().length > 1 && (
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {getYearsWithAchievements().map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                    selectedYear === year
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {year} ({stats?.yearlyBreakdown[year] || 0})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Achievement Grid */}
        {filteredAchievements.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white rounded-2xl border border-gray-200"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No achievements yet</h3>
            <p className="text-gray-600 mb-6">
              Stay within your budget to earn your first star!
            </p>
            <Button onClick={() => navigate('/budget')} className="bg-gradient-to-r from-blue-600 to-purple-600">
              Set Up Budget
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredAchievements.map((achievement, index) => (
              <motion.div
                key={achievement._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="group relative bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer"
              >
                {/* Star Icon with Glow */}
                <div className="relative mb-3">
                  <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-xl animate-pulse"></div>
                  <div className="relative w-16 h-16 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/50">
                    <Star className="w-8 h-8 text-white fill-white" />
                  </div>
                </div>

                {/* Month & Year */}
                <div className="text-center">
                  <p className="text-gray-900 font-semibold text-sm mb-0.5">
                    {MONTH_NAMES[achievement.month - 1]}
                  </p>
                  <p className="text-gray-600 text-xs">{achievement.year}</p>
                </div>

                {/* Hover Details */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-sm rounded-2xl p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs text-emerald-400 font-medium">Success</span>
                      </div>
                      <p className="text-[10px] text-white/80 mb-3 line-clamp-2">
                        {achievement.metadata?.message || 'Budget managed successfully'}
                      </p>
                    </div>
                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between text-white/60">
                        <span>Budget:</span>
                        <span className="text-white">{formatCurrency(achievement.budgetAmount)}</span>
                      </div>
                      <div className="flex justify-between text-white/60">
                        <span>Spent:</span>
                        <span className="text-white">{formatCurrency(achievement.totalExpenses)}</span>
                      </div>
                      {achievement.metadata?.savingsAmount && achievement.metadata.savingsAmount > 0 && (
                        <div className="flex justify-between text-emerald-400 font-medium">
                          <span>Saved:</span>
                          <span>{formatCurrency(achievement.metadata.savingsAmount)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Motivational Section */}
        {achievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Keep Going!</h3>
            <p className="text-gray-700 max-w-2xl mx-auto">
              Every star represents a month of financial discipline. You're building lasting habits that lead to financial freedom. Stay consistent, and watch your achievements grow!
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AchievementsPage;
