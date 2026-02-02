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
async function checkUserBudgetAchievement(userId: string, email: string, targetMonth?: number, targetYear?: number) {
  try {
    const now = new Date();
    // If targetMonth/targetYear provided, use those; otherwise use current month
    const checkMonth = targetMonth || now.getMonth() + 1;
    const checkYear = targetYear || now.getFullYear();

    // ⛔ SKIP January 2026 for gsribarath@gmail.com (budget violation - owner directive)
    if (email === 'gsribarath@gmail.com' && checkMonth === 1 && checkYear === 2026) {
      console.log(`⛔ Skipping ${email} for January 2026 - budget violation (owner directive)`);
      return null;
    }

    // Check if already awarded
    const existingAchievement = await Achievement.findOne({
      userId,
      month: checkMonth,
      year: checkYear,
    });

    if (existingAchievement && existingAchievement.status !== 'pending') {
      console.log(`Achievement already exists for ${email} - ${checkMonth}/${checkYear}`);
      return null; // Already processed
    }

    // Get user's budget for the specific month/year being checked
    const budget = await Budget.findOne({
      user: userId,
      month: checkMonth,
      year: checkYear,
    });

    if (!budget) {
      console.log(`No budget found for ${email} in ${checkMonth}/${checkYear}`);
      return null; // No budget set
    }

    // Calculate total expenses for the target month
    const startOfMonth = new Date(checkYear, checkMonth - 1, 1);
    const endOfMonth = new Date(checkYear, checkMonth, 0, 23, 59, 59);

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
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const totalExpenses = transactions[0]?.totalExpenses || 0;
    const transactionCount = transactions[0]?.transactionCount || 0;
    const budgetAmount = budget.totalBudget;
    const budgetUtilization = (totalExpenses / budgetAmount) * 100;
    const savingsAmount = budgetAmount - totalExpenses;

    console.log(`📊 Budget check for ${email} (${checkMonth}/${checkYear}):`, {
      budgetAmount,
      totalExpenses,
      transactionCount,
      savingsAmount,
      utilization: `${budgetUtilization.toFixed(1)}%`,
      success: totalExpenses <= budgetAmount
    });

    // 🚫 CRITICAL: NO STARS FOR NEW USERS WITH 0 TRANSACTIONS
    // Users must ACTUALLY USE THE APP to earn achievements
    if (transactionCount === 0) {
      console.log(`❌ No achievement for ${email} - No app usage (0 transactions tracked)`);
      
      // Delete any existing invalid achievement
      await Achievement.deleteMany({
        userId,
        month: checkMonth,
        year: checkYear
      });
      
      return null; // No app usage = No achievement
    }

    // ✅ CORE ELIGIBILITY RULE (USER-SPECIFIC):
    // Reward ONLY if: user_monthly_spent ≤ user_monthly_budget
    // Each user evaluated independently based on THEIR budget and THEIR expenses
    // NO reward if expenses exceed budget
    const isSuccess = totalExpenses <= budgetAmount;

    if (!isSuccess) {
      console.log(`❌ No achievement for ${email} - Exceeded budget by ₹${totalExpenses - budgetAmount}`);
      return null; // Did not achieve goal
    }

    console.log(`✅ Achievement earned! ${email} saved ₹${savingsAmount}`);

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
      { userId, month: checkMonth, year: checkYear },
      {
        userId,
        email,
        month: checkMonth,
        year: checkYear,
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

    console.log(`✨ Achievement awarded to ${email} for ${getMonthName(checkMonth)} ${checkYear}`);
    return achievement;
  } catch (error) {
    console.error(`Error checking achievement for user ${userId}:`, error);
    return null;
  }
}

// Check all users' achievements for a specific month
async function checkAllUsersAchievements(targetMonth?: number, targetYear?: number) {
  try {
    const now = new Date();
    const checkMonth = targetMonth || now.getMonth() + 1;
    const checkYear = targetYear || now.getFullYear();
    
    console.log(`🔍 Checking budget achievements for all users (${checkMonth}/${checkYear})...`);
    
    const users = await User.find({ isActive: true }).select('_id email');
    let awardedCount = 0;

    for (const user of users) {
      const achievement = await checkUserBudgetAchievement(
        user._id.toString(),
        user.email,
        checkMonth,
        checkYear
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

// Check if today is first 3 days of month (to finalize previous month)
function isFirstThreeDaysOfMonth(): boolean {
  const now = new Date();
  return now.getDate() <= 3;
}

// Initialize achievement scheduler
export function initializeAchievementScheduler() {
  console.log('📅 Initializing Achievement Scheduler...');

  // Run daily at 6:00 AM during last 3 days of month - Check CURRENT month achievements
  cron.schedule('0 6 * * *', async () => {
    if (isLastThreeDaysOfMonth()) {
      console.log('📊 Running daily achievement check (last 3 days of month)');
      await checkAllUsersAchievements();
    }
  });

  // Run daily at 2:00 AM during first 3 days of month - Check PREVIOUS month achievements
  cron.schedule('0 2 * * *', async () => {
    if (isFirstThreeDaysOfMonth()) {
      const now = new Date();
      // Calculate previous month
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      
      console.log(`📊 Checking previous month achievements (${prevMonth}/${prevYear}) - First 3 days of new month`);
      await checkAllUsersAchievements(prevMonth, prevYear);
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
  console.log('   - Daily checks: 6:00 AM (last 3 days of current month)');
  console.log('   - Previous month checks: 2:00 AM (first 3 days of new month)');
  console.log('   - Finalization: 11:30 PM (last day of month)');
  
  // IMMEDIATE CHECK: If today is within first 3 days, check previous month now
  if (isFirstThreeDaysOfMonth()) {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    
    console.log(`🚀 Running immediate check for previous month (${prevMonth}/${prevYear})...`);
    setTimeout(() => {
      checkAllUsersAchievements(prevMonth, prevYear);
    }, 5000); // Run after 5 seconds to allow server to fully start
  }
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
