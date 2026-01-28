import cron from 'node-cron';
import Achievement from '../models/Achievement';
import { Budget } from '../models/Budget';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import mongoose from 'mongoose';

/**
 * Achievement Scheduler Service
 * 
 * Runs automated checks for budget achievements:
 * - Daily check during last 3 days of month (awards achievements)
 * - Final check on last day of month (finalizes achievements)
 */

// Check if user achieved budget goal for the month
async function checkUserBudgetAchievement(userId: string, email: string) {
  try {
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
      return null; // Already processed
    }

    // Get user's active monthly budget
    const budget = await Budget.findOne({
      userId,
      period: 'monthly',
      isActive: true,
    });

    if (!budget) {
      return null; // No budget set
    }

    // Calculate total expenses for current month
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

    // Check if user stayed within budget
    const isSuccess = totalExpenses <= budgetAmount;

    if (!isSuccess) {
      return null; // Did not achieve goal
    }

    // Award achievement
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

    console.log(`✨ Achievement awarded to ${email} for ${getMonthName(currentMonth)} ${currentYear}`);
    return achievement;
  } catch (error) {
    console.error(`Error checking achievement for user ${userId}:`, error);
    return null;
  }
}

// Check all users' achievements
async function checkAllUsersAchievements() {
  try {
    console.log('🔍 Checking budget achievements for all users...');
    
    const users = await User.find({ isActive: true }).select('_id email');
    let awardedCount = 0;

    for (const user of users) {
      const achievement = await checkUserBudgetAchievement(
        user._id.toString(),
        user.email
      );
      if (achievement) {
        awardedCount++;
      }
    }

    console.log(`✅ Achievement check complete. ${awardedCount} achievements awarded.`);
  } catch (error) {
    console.error('Error checking achievements for all users:', error);
  }
}

// Finalize all achievements on last day of month
async function finalizeMonthlyAchievements() {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    console.log(`🏆 Finalizing achievements for ${getMonthName(currentMonth)} ${currentYear}...`);

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

    console.log(`✅ ${result.modifiedCount} achievements finalized.`);
  } catch (error) {
    console.error('Error finalizing achievements:', error);
  }
}

// Check if today is within last 3 days of month
function isLastThreeDaysOfMonth(): boolean {
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  return currentDay >= lastDayOfMonth - 2;
}

// Check if today is last day of month
function isLastDayOfMonth(): boolean {
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return now.getDate() === lastDayOfMonth;
}

// Initialize achievement scheduler
export function initializeAchievementScheduler() {
  console.log('📅 Initializing Achievement Scheduler...');

  // Run daily at 6:00 AM - Check achievements during last 3 days
  cron.schedule('0 6 * * *', async () => {
    if (isLastThreeDaysOfMonth()) {
      console.log('📊 Running daily achievement check (last 3 days of month)');
      await checkAllUsersAchievements();
    }
  });

  // Run on last day of month at 11:30 PM - Finalize achievements
  cron.schedule('30 23 * * *', async () => {
    if (isLastDayOfMonth()) {
      console.log('🎯 Running final achievement check and finalization');
      await checkAllUsersAchievements();
      await finalizeMonthlyAchievements();
    }
  });

  console.log('✅ Achievement Scheduler initialized');
  console.log('   - Daily checks: 6:00 AM (last 3 days of month)');
  console.log('   - Finalization: 11:30 PM (last day of month)');
}

// Helper: Get month name
function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}

// Export for manual testing
export const achievementScheduler = {
  checkAllUsersAchievements,
  finalizeMonthlyAchievements,
  checkUserBudgetAchievement,
};
