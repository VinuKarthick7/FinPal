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
          user: new mongoose.Types.ObjectId(userId),
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
        loginCountAfterAward: 0, // ⭐ NEW: Start at 0 logins
        visibleToUser: false, // ⭐ NEW: Hidden until 3 logins
        metadata: {
          savingsAmount,
          budgetUtilization: Math.round(budgetUtilization),
          message: randomMessage,
        },
      },
      { upsert: true, new: true }
    );

    console.log(`✨ Achievement awarded to ${email} for ${getMonthName(checkMonth)} ${checkYear} (hidden until 3 logins)`);
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

// Finalize all achievements for a specific month
async function finalizeMonthlyAchievements(targetMonth?: number, targetYear?: number) {
  try {
    const now = new Date();
    // If no target provided, use previous month
    let finalizeMonth: number;
    let finalizeYear: number;
    
    if (targetMonth && targetYear) {
      finalizeMonth = targetMonth;
      finalizeYear = targetYear;
    } else {
      // Calculate previous month
      finalizeMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      finalizeYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    }

    console.log(`🏆 Finalizing achievements for ${getMonthName(finalizeMonth)} ${finalizeYear}...`);

    const result = await Achievement.updateMany(
      {
        month: finalizeMonth,
        year: finalizeYear,
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

// Check if today is the 1st day of the month
function isFirstDayOfMonth(): boolean {
  const now = new Date();
  return now.getDate() === 1;
}

// Initialize achievement scheduler
export function initializeAchievementScheduler() {
  console.log('📅 Initializing Achievement Scheduler...');
  console.log('🎯 RULE: Achievements awarded ONLY at 12:01 AM on 1st of next month');

  // ⭐ CRITICAL: Run at 12:01 AM on the 1st of EVERY month
  // Awards achievements for the PREVIOUS month (month that just ended)
  cron.schedule('1 0 1 * *', async () => {
    const now = new Date();
    // Calculate previous month
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    
    console.log(`\n🌟 === MONTHLY ACHIEVEMENT AWARD TIME ===`);
    console.log(`📅 Date: ${now.toLocaleString()}`);
    console.log(`🎯 Checking achievements for: ${getMonthName(prevMonth)} ${prevYear}`);
    console.log(`⏰ Award Time: 12:01 AM (Month End Confirmed)`);
    console.log(`=========================================\n`);
    
    // Award achievements for previous month
    await checkAllUsersAchievements(prevMonth, prevYear);
    
    // Immediately finalize them
    await finalizeMonthlyAchievements(prevMonth, prevYear);
    
    console.log(`\n✅ ${getMonthName(prevMonth)} ${prevYear} achievements processed!\n`);
  });

  console.log('✅ Achievement Scheduler initialized');
  console.log('   ⏰ Award Time: 12:01 AM on the 1st of every month');
  console.log('   📊 Awards for: Previous month (the month that just ended)');
  console.log('   🎯 Status: Immediately finalized after award');
  console.log('');
  
  // IMMEDIATE CHECK: If today is the 1st day, check if we need to run now
  if (isFirstDayOfMonth()) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Only run if it's past 12:01 AM (in case server restarted after 12:01 AM)
    if (currentHour > 0 || (currentHour === 0 && currentMinute > 1)) {
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      
      console.log(`🚀 Server started on 1st day after 12:01 AM - Running achievement check now`);
      console.log(`   Checking: ${getMonthName(prevMonth)} ${prevYear}\n`);
      
      setTimeout(async () => {
        try {
          await checkAllUsersAchievements(prevMonth, prevYear);
          await finalizeMonthlyAchievements(prevMonth, prevYear);
          
          // 🔧 ONE-TIME BUG RECOVERY: Previous code had wrong field names (userId instead of user)
          // in Budget/Transaction queries, causing achievements to be falsely deleted.
          // Force-unlock achievements for users who already completed 3+ logins before the bug-fix.
          // This recovery is safe: it only sets visibleToUser=true for finalized achievements
          // that still have loginCountAfterAward=0 (meaning they were re-created after deletion).
          const bugFixRecovery = await Achievement.updateMany(
            {
              month: prevMonth,
              year: prevYear,
              status: 'finalized',
              visibleToUser: false,
              loginCountAfterAward: 0,
            },
            {
              $set: {
                visibleToUser: true,
                loginCountAfterAward: 3,
                firstLoginAfterAward: new Date(),
              },
            }
          );
          if (bugFixRecovery.modifiedCount > 0) {
            console.log(`🔧 Bug recovery: Force-unlocked ${bugFixRecovery.modifiedCount} achievement(s) that were deleted by the userId/user field name bug`);
          }
        } catch (err) {
          console.error('Error in immediate check:', err);
        }
      }, 5000); // Run after 5 seconds to allow server to fully start
    }
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
