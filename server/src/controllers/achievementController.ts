import { Request, Response } from 'express';
import Achievement from '../models/Achievement';
import { Budget } from '../models/Budget';
import { Transaction } from '../models/Transaction';
import mongoose from 'mongoose';

// Get user's achievements
export const getUserAchievements = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;

    const achievements = await Achievement.find({ 
      userId,
      status: { $in: ['awarded', 'finalized'] }
    })
      .sort({ year: -1, month: -1 })
      .lean();

    const stats = {
      totalAchievements: achievements.length,
      currentYear: achievements.filter(a => a.year === new Date().getFullYear()).length,
      longestStreak: calculateLongestStreak(achievements),
    };

    res.json({
      success: true,
      data: {
        achievements,
        stats,
      },
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch achievements' });
  }
};

// Check budget performance for current month
export const checkMonthlyBudget = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const email = (req as any).user.email;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Check if already awarded
    const existingAchievement = await Achievement.findOne({
      userId,
      month: currentMonth,
      year: currentYear,
    });

    if (existingAchievement && existingAchievement.status !== 'pending') {
      return res.json({
        success: true,
        data: {
          alreadyAwarded: true,
          achievement: existingAchievement,
        },
      });
    }

    // Get monthly budget
    const budget = await Budget.findOne({
      userId,
      period: 'monthly',
      isActive: true,
    });

    if (!budget) {
      return res.json({
        success: false,
        message: 'No active monthly budget found',
      });
    }

    // Calculate total expenses for the month
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const transactions = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'expense',
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
        },
      },
    ]);

    const totalExpenses = transactions[0]?.totalExpenses || 0;
    const budgetAmount = budget.totalBudget;
    const budgetUtilization = (totalExpenses / budgetAmount) * 100;
    const savingsAmount = budgetAmount - totalExpenses;

    // Check if budget was successfully managed
    const isSuccess = totalExpenses <= budgetAmount;

    if (!isSuccess) {
      return res.json({
        success: true,
        data: {
          isSuccess: false,
          budgetAmount,
          totalExpenses,
          budgetUtilization,
          message: 'Budget exceeded this month. Keep trying!',
        },
      });
    }

    // Create or update achievement
    const motivationalMessages = [
      'Great job! You managed your budget well this month ⭐',
      'Fantastic! Your financial discipline is paying off ⭐',
      'Amazing! You stayed within your budget this month ⭐',
      'Well done! Another month of smart spending ⭐',
      'Excellent! You\'re building great financial habits ⭐',
    ];

    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

    const achievement = await Achievement.findOneAndUpdate(
      { userId, month: currentMonth, year: currentYear },
      {
        userId,
        email,
        month: currentMonth,
        year: currentYear,
        budgetAmount,
        totalExpenses,
        status: 'awarded',
        earnedAt: new Date(),
        metadata: {
          savingsAmount,
          budgetUtilization: Math.round(budgetUtilization),
          message: randomMessage,
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: {
        isSuccess: true,
        achievement,
        message: randomMessage,
      },
    });
  } catch (error) {
    console.error('Error checking monthly budget:', error);
    res.status(500).json({ success: false, message: 'Failed to check budget performance' });
  }
};

// Finalize achievements (run on last day of month)
export const finalizeMonthlyAchievements = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Update all awarded achievements to finalized
    const result = await Achievement.updateMany(
      {
        month: currentMonth,
        year: currentYear,
        status: 'awarded',
      },
      {
        $set: {
          status: 'finalized',
          finalizedAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      data: {
        finalized: result.modifiedCount,
        message: `${result.modifiedCount} achievements finalized for ${getMonthName(currentMonth)} ${currentYear}`,
      },
    });
  } catch (error) {
    console.error('Error finalizing achievements:', error);
    res.status(500).json({ success: false, message: 'Failed to finalize achievements' });
  }
};

// Get achievement stats
export const getAchievementStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const currentYear = new Date().getFullYear();

    const achievements = await Achievement.find({
      userId,
      status: { $in: ['awarded', 'finalized'] },
    }).lean();

    const yearlyBreakdown = achievements.reduce((acc: any, achievement) => {
      if (!acc[achievement.year]) {
        acc[achievement.year] = 0;
      }
      acc[achievement.year]++;
      return acc;
    }, {});

    const currentYearAchievements = achievements.filter(a => a.year === currentYear);
    
    const stats = {
      total: achievements.length,
      currentYear: currentYearAchievements.length,
      longestStreak: calculateLongestStreak(achievements),
      yearlyBreakdown,
      recentAchievements: achievements.slice(0, 3),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching achievement stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

// Helper: Calculate longest streak of consecutive months
function calculateLongestStreak(achievements: any[]): number {
  if (achievements.length === 0) return 0;

  // Sort by date
  const sorted = achievements
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    // Check if consecutive months
    const isConsecutive =
      (curr.year === prev.year && curr.month === prev.month + 1) ||
      (curr.year === prev.year + 1 && prev.month === 12 && curr.month === 1);

    if (isConsecutive) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

// Helper: Get month name
function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}
