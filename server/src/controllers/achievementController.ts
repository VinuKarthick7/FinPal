import { Request, Response } from 'express';
import Achievement from '../models/Achievement';
import { Budget } from '../models/Budget';
import { Transaction } from '../models/Transaction';
import mongoose from 'mongoose';

// Get user's achievements
export const getUserAchievements = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const userEmail = (req as any).user.email;

    // Fetch achievements for this specific user only
    // ⭐ ONLY show achievements that are visible (after 3 logins)
    const achievements = await Achievement.find({ 
      userId,
      email: userEmail, // Double-check email matches
      status: { $in: ['awarded', 'finalized'] },
      visibleToUser: true // ⭐ NEW: Only show unlocked achievements
    })
      .sort({ year: -1, month: -1 })
      .lean();

    // 🔐 CRITICAL VALIDATION: Verify each achievement had a valid budget
    const validAchievements = [];
    for (const achievement of achievements) {
      // Verify budget existed for that specific month/year
      const startOfMonth = new Date(achievement.year, achievement.month - 1, 1);
      const endOfMonth = new Date(achievement.year, achievement.month, 0, 23, 59, 59);
      
      const budget = await Budget.findOne({
        user: userId,
        month: achievement.month,
        year: achievement.year,
      });

      // ❌ NO BUDGET → NO ACHIEVEMENT (delete invalid achievement)
      if (!budget || budget.totalBudget <= 0) {
        console.log(`❌ INVALID: Achievement ${achievement.month}/${achievement.year} has NO BUDGET - Removing`);
        await Achievement.deleteOne({ _id: achievement._id });
        continue;
      }

      // Verify expenses were within budget
      if (achievement.totalExpenses > budget.totalBudget) {
        console.log(`❌ INVALID: Achievement ${achievement.month}/${achievement.year} exceeded budget - Removing`);
        await Achievement.deleteOne({ _id: achievement._id });
        continue;
      }

      // 🚫 STRICT: Verify user actually TRACKED expenses (used the app)
      const transactionCount = await Transaction.countDocuments({
        user: new mongoose.Types.ObjectId(userId),
        type: 'expense',
        date: { $gte: startOfMonth, $lte: endOfMonth },
      });

      if (transactionCount === 0) {
        console.log(`❌ INVALID: Achievement ${achievement.month}/${achievement.year} - No app usage (0 transactions)`);
        await Achievement.deleteOne({ _id: achievement._id });
        continue;
      }

      validAchievements.push(achievement);
    }

    const stats = {
      totalAchievements: validAchievements.length,
      currentYear: validAchievements.filter(a => a.year === new Date().getFullYear()).length,
      longestStreak: calculateLongestStreak(validAchievements),
    };

    console.log(`📊 Fetched ${validAchievements.length} VALID achievements for user: ${userEmail}`);

    // Add no-cache headers to prevent browser/proxy caching
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });

    res.json({
      success: true,
      data: {
        achievements: validAchievements,
        stats,
        userEmail, // Include for client validation
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

    console.log(`🔍 Checking budget for ${email} - ${currentMonth}/${currentYear}`);

    // Check if already awarded for this month
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

    // 🔐 CRITICAL: Get user's budget for the SPECIFIC MONTH being evaluated
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    
    const budget = await Budget.findOne({
      user: userId,
      month: currentMonth,
      year: currentYear,
    });

    // ❌ NO BUDGET → NO ACHIEVEMENT (HARD RULE)
    if (!budget || budget.totalBudget <= 0) {
      console.log(`❌ No budget set for ${email} in ${currentMonth}/${currentYear} - NO ACHIEVEMENT`);
      return res.json({
        success: false,
        message: 'No budget set for this month. Set a budget to earn achievements.',
        noBudget: true,
      });
    }

    // Calculate total expenses for the current month
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
        },
      },
    ]);

    const totalExpenses = transactions[0]?.totalExpenses || 0;
    const budgetAmount = budget.totalBudget;
    const budgetUtilization = (totalExpenses / budgetAmount) * 100;
    const savingsAmount = budgetAmount - totalExpenses;

    console.log(`📊 Budget Check for ${email}:`, {
      budget: budgetAmount,
      spent: totalExpenses,
      saved: savingsAmount,
      utilization: `${budgetUtilization.toFixed(1)}%`
    });

    // 🚫 STRICT RULE: User must have ACTUALLY USED THE APP (tracked expenses)
    // If totalExpenses = 0 AND no transactions, user hasn't used the app
    const transactionCount = await Transaction.countDocuments({
      user: new mongoose.Types.ObjectId(userId),
      type: 'expense',
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    if (transactionCount === 0) {
      console.log(`❌ No app usage for ${email} - No transactions tracked in ${currentMonth}/${currentYear}`);
      
      // 🔥 CRITICAL: Delete any existing invalid achievement for this month
      await Achievement.deleteMany({
        userId,
        month: currentMonth,
        year: currentYear
      });
      
      return res.json({
        success: true,
        data: {
          isSuccess: false,
          budgetAmount,
          totalExpenses: 0,
          transactionCount: 0,
          message: 'Track expenses to earn achievements! Add transactions to your budget.',
          noAppUsage: true,
        },
      });
    }

    // ✅ ELIGIBILITY RULE: User must spend WITHIN or EQUAL to budget
    // If totalExpenses > budgetAmount, NO REWARD
    const isSuccess = totalExpenses <= budgetAmount;

    if (!isSuccess) {
      console.log(`❌ No reward for ${email} - Budget exceeded (${totalExpenses} > ${budgetAmount})`);
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
    const userEmail = (req as any).user.email;
    const currentYear = new Date().getFullYear();

    // Fetch achievements for this specific user only
    // ⭐ ONLY count VISIBLE achievements (3-login unlock rule)
    const achievements = await Achievement.find({
      userId,
      email: userEmail, // Double-check email matches
      status: { $in: ['awarded', 'finalized'] },
      visibleToUser: true, // ⭐ CRITICAL: Only count unlocked achievements
    }).lean();

    // 🔐 CRITICAL VALIDATION: Only count achievements with valid budgets
    const validAchievements = [];
    for (const achievement of achievements) {
      const endOfMonth = new Date(achievement.year, achievement.month, 0, 23, 59, 59);
      
      const budget = await Budget.findOne({
        user: userId,
        month: achievement.month,
        year: achievement.year,
      });

      // ❌ NO BUDGET → SKIP THIS ACHIEVEMENT
      if (!budget || budget.totalBudget <= 0) {
        console.log(`❌ Removing invalid achievement: ${achievement.month}/${achievement.year} - No budget`);
        await Achievement.deleteOne({ _id: achievement._id });
        continue;
      }

      // Verify expenses were within budget
      if (achievement.totalExpenses > budget.totalBudget) {
        console.log(`❌ Removing invalid achievement: ${achievement.month}/${achievement.year} - Exceeded budget`);
        await Achievement.deleteOne({ _id: achievement._id });
        continue;
      }

      // 🚫 STRICT: Verify user actually TRACKED expenses (used the app)
      const startOfMonth = new Date(achievement.year, achievement.month - 1, 1);
      const endOfMonth2 = new Date(achievement.year, achievement.month, 0, 23, 59, 59);
      const transactionCount = await Transaction.countDocuments({
        user: new mongoose.Types.ObjectId(userId),
        type: 'expense',
        date: { $gte: startOfMonth, $lte: endOfMonth2 },
      });

      if (transactionCount === 0) {
        console.log(`❌ Removing invalid achievement: ${achievement.month}/${achievement.year} - No app usage`);
        await Achievement.deleteOne({ _id: achievement._id });
        continue;
      }

      validAchievements.push(achievement);
    }

    const yearlyBreakdown = validAchievements.reduce((acc: any, achievement) => {
      if (!acc[achievement.year]) {
        acc[achievement.year] = 0;
      }
      acc[achievement.year]++;
      return acc;
    }, {});

    const currentYearAchievements = validAchievements.filter(a => a.year === currentYear);
    
    const stats = {
      total: validAchievements.length,
      currentYear: currentYearAchievements.length,
      longestStreak: calculateLongestStreak(validAchievements),
      yearlyBreakdown,
      recentAchievements: validAchievements.slice(0, 3),
    };

    console.log(`📊 Stats for ${userEmail}: ${stats.total} VALID stars, ${stats.currentYear} this year`);

    // Add no-cache headers to prevent browser/proxy caching
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });

    res.json({
      success: true,
      data: stats,
      userEmail, // Include for client validation
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

// Check if user should see success announcement (earned star last month)
export const checkSuccessAnnouncement = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const now = new Date();

    // ⏰ POPUP WINDOW: Only show the reward popup during the FIRST 24 HOURS of the 1st day of the month
    // After the 1st day ends (i.e., from the 2nd onwards), the popup window is closed permanently
    const currentDay = now.getDate();
    if (currentDay !== 1) {
      console.log(`⏰ Popup window closed - today is day ${currentDay}, popup only shows on the 1st`);
      return res.json({
        success: true,
        data: {
          showAnnouncement: false,
          reason: 'popup_window_closed',
        },
      });
    }
    
    // Get last month
    let lastMonth = now.getMonth(); // 0-11
    let lastYear = now.getFullYear();
    
    if (lastMonth === 0) {
      lastMonth = 12;
      lastYear = lastYear - 1;
    }

    // Get user's email for proper identification
    const userEmail = (req as any).user.email;
    
    // Check if user earned achievement last month
    // ⭐ ONLY show announcement for VISIBLE achievements (after 3 logins)
    // 🔁 During the 1st day (24-hour window), popup shows on EVERY login — ignore popupShown
    const lastMonthAchievement = await Achievement.findOne({
      userId,
      month: lastMonth,
      year: lastYear,
      status: { $in: ['awarded', 'finalized'] },
      visibleToUser: true, // ⭐ CRITICAL: Only announce visible achievements
      // NO popupShown filter — popup shows on EVERY login during the 1st day
    });

    // 🔐 CRITICAL: Verify budget existed for that month before showing reward
    if (lastMonthAchievement) {
      const endOfMonth = new Date(lastYear, lastMonth, 0, 23, 59, 59);
      const budget = await Budget.findOne({
        user: userId,
        month: lastMonth,
        year: lastYear,
      });

      // ❌ NO BUDGET → DELETE ACHIEVEMENT & NO REWARD
      if (!budget || budget.totalBudget <= 0) {
        console.log(`❌ Invalid achievement detected for ${userEmail} - No budget existed for ${lastMonth}/${lastYear}`);
        await Achievement.deleteOne({ _id: lastMonthAchievement._id });
        return res.json({
          success: true,
          data: {
            showAnnouncement: false,
            userEmail,
          },
        });
      }

      // Verify expenses were within budget
      if (lastMonthAchievement.totalExpenses > budget.totalBudget) {
        console.log(`❌ Invalid achievement detected for ${userEmail} - Exceeded budget`);
        await Achievement.deleteOne({ _id: lastMonthAchievement._id });
        return res.json({
          success: true,
          data: {
            showAnnouncement: false,
            userEmail,
          },
        });
      }

      // 🚫 STRICT: Verify user actually TRACKED expenses (used the app)
      const startOfLastMonth = new Date(lastYear, lastMonth - 1, 1);
      const endOfLastMonth = new Date(lastYear, lastMonth, 0, 23, 59, 59);
      const transactionCount = await Transaction.countDocuments({
        user: new mongoose.Types.ObjectId(userId),
        type: 'expense',
        date: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      });

      if (transactionCount === 0) {
        console.log(`❌ Invalid achievement detected for ${userEmail} - No app usage (0 transactions)`);
        await Achievement.deleteOne({ _id: lastMonthAchievement._id });
        return res.json({
          success: true,
          data: {
            showAnnouncement: false,
            userEmail,
          },
        });
      }
    }

    // Create announcement key using email for unique user identification across devices/browsers
    // This ensures each user sees their own announcement status
    const sanitizedEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const announcementKey = `announcement_${sanitizedEmail}_${now.getMonth() + 1}_${now.getFullYear()}`;
    
    if (lastMonthAchievement) {
      // Verify the achievement belongs to this user
      if (lastMonthAchievement.email !== userEmail) {
        console.warn(`Achievement email mismatch: ${lastMonthAchievement.email} vs ${userEmail}`);
        return res.json({
          success: true,
          data: {
            showAnnouncement: false,
          },
        });
      }

      console.log(`✅ Reward eligible for ${userEmail}: ${getMonthName(lastMonth)} ${lastYear} - Budget: ₹${lastMonthAchievement.budgetAmount}, Spent: ₹${lastMonthAchievement.totalExpenses}`);

      res.json({
        success: true,
        data: {
          showAnnouncement: true,
          achievement: lastMonthAchievement,
          monthName: getMonthName(lastMonth),
          year: lastYear,
          announcementKey,
          userEmail, // Include email for client-side verification
        },
      });
    } else {
      // Check if user had an achievement but already saw the popup
      const alreadyShownAchievement = await Achievement.findOne({
        userId,
        month: lastMonth,
        year: lastYear,
        status: { $in: ['awarded', 'finalized'] },
        popupShown: true
      });

      if (alreadyShownAchievement) {
        console.log(`ℹ️ Reward already shown to ${userEmail} for ${getMonthName(lastMonth)} ${lastYear}`);
      } else {
        console.log(`ℹ️ No reward for ${userEmail} - Either budget exceeded or no budget set for ${getMonthName(lastMonth)} ${lastYear}`);
      }

      res.json({
        success: true,
        data: {
          showAnnouncement: false,
          userEmail,
        },
      });
    }
  } catch (error) {
    console.error('Error checking success announcement:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check announcement' 
    });
  }
};

// Mark reward popup as shown for a user's achievement
export const markPopupShown = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const userEmail = (req as any).user.email;
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    // Find and update the achievement - only mark popup shown for VISIBLE achievements
    const achievement = await Achievement.findOneAndUpdate(
      {
        userId,
        email: userEmail,
        month,
        year,
        status: { $in: ['awarded', 'finalized'] },
        visibleToUser: true
      },
      {
        $set: {
          popupShown: true,
          popupShownAt: new Date()
        }
      },
      { new: true }
    );

    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }

    console.log(`✅ Marked reward popup as shown for ${userEmail} - ${getMonthName(month)} ${year}`);

    res.json({
      success: true,
      data: {
        achievement,
        message: 'Popup marked as shown'
      }
    });
  } catch (error) {
    console.error('Error marking popup as shown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark popup as shown'
    });
  }
};

// Validate and clean invalid achievements (admin utility)
export const validateAndCleanAchievements = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const userEmail = (req as any).user.email;

    console.log(`🔍 Validating achievements for ${userEmail}...`);

    // Get all achievements for this user
    const achievements = await Achievement.find({ userId, email: userEmail });

    const invalidAchievements = [];
    const validAchievements = [];

    for (const achievement of achievements) {
      // Get budget for that month
      const budget = await Budget.findOne({
        user: userId,
        month: achievement.month,
        year: achievement.year,
      });

      if (!budget) {
        invalidAchievements.push({
          ...achievement.toObject(),
          reason: 'No budget found'
        });
        continue;
      }

      // Calculate actual expenses for that month
      const startOfMonth = new Date(achievement.year, achievement.month - 1, 1);
      const endOfMonth = new Date(achievement.year, achievement.month, 0, 23, 59, 59);

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
          },
        },
      ]);

      const totalExpenses = transactions[0]?.totalExpenses || 0;
      const budgetAmount = budget.totalBudget;

      // CRITICAL VALIDATION: expenses must be <= budget
      if (totalExpenses > budgetAmount) {
        invalidAchievements.push({
          ...achievement.toObject(),
          reason: `Budget exceeded: spent ₹${totalExpenses} > budget ₹${budgetAmount}`,
          actualBudget: budgetAmount,
          actualSpent: totalExpenses,
          exceeded: totalExpenses - budgetAmount
        });
      } else {
        validAchievements.push(achievement);
      }
    }

    console.log(`✅ Valid: ${validAchievements.length}, ❌ Invalid: ${invalidAchievements.length}`);

    res.json({
      success: true,
      data: {
        userEmail,
        totalChecked: achievements.length,
        validCount: validAchievements.length,
        invalidCount: invalidAchievements.length,
        invalidAchievements,
      },
    });
  } catch (error) {
    console.error('Error validating achievements:', error);
    res.status(500).json({ success: false, message: 'Failed to validate achievements' });
  }
};

// Delete invalid achievements (admin utility)
export const deleteInvalidAchievements = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const userEmail = (req as any).user.email;

    console.log(`🗑️ Cleaning invalid achievements for ${userEmail}...`);

    // Get all achievements for this user
    const achievements = await Achievement.find({ userId, email: userEmail });

    const toDelete = [];

    for (const achievement of achievements) {
      // Get budget for that month
      const budget = await Budget.findOne({
        user: userId,
        month: achievement.month,
        year: achievement.year,
      });

      if (!budget) {
        toDelete.push(achievement._id);
        continue;
      }

      // Calculate actual expenses for that month
      const startOfMonth = new Date(achievement.year, achievement.month - 1, 1);
      const endOfMonth = new Date(achievement.year, achievement.month, 0, 23, 59, 59);

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
          },
        },
      ]);

      const totalExpenses = transactions[0]?.totalExpenses || 0;
      const budgetAmount = budget.totalBudget;

      // CRITICAL VALIDATION: expenses must be <= budget
      if (totalExpenses > budgetAmount) {
        console.log(`❌ Removing invalid achievement: ${getMonthName(achievement.month)} ${achievement.year} - spent ₹${totalExpenses} > budget ₹${budgetAmount}`);
        toDelete.push(achievement._id);
      }
    }

    // Delete invalid achievements
    const result = await Achievement.deleteMany({
      _id: { $in: toDelete }
    });

    console.log(`✅ Deleted ${result.deletedCount} invalid achievements for ${userEmail}`);

    res.json({
      success: true,
      data: {
        userEmail,
        deletedCount: result.deletedCount,
        message: `Removed ${result.deletedCount} invalid achievement(s)`,
      },
    });
  } catch (error) {
    console.error('Error deleting invalid achievements:', error);
    res.status(500).json({ success: false, message: 'Failed to delete invalid achievements' });
  }
};

// ⭐ NEW: Get achievement unlock progress (3-login rule)
export const getAchievementUnlockProgress = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;

    // Find hidden achievements (not yet visible)
    const hiddenAchievements = await Achievement.find({
      userId,
      status: 'finalized',
      visibleToUser: false,
    }).sort({ year: -1, month: -1 });

    const progress = hiddenAchievements.map(ach => ({
      month: ach.month,
      year: ach.year,
      loginsCompleted: ach.loginCountAfterAward,
      loginsRequired: 3,
      loginsRemaining: Math.max(0, 3 - ach.loginCountAfterAward),
      progress: Math.min(100, (ach.loginCountAfterAward / 3) * 100),
      message: ach.loginCountAfterAward < 3 
        ? `Log in ${3 - ach.loginCountAfterAward} more time(s) to unlock your achievement!`
        : 'Ready to unlock!'
    }));

    res.json({
      success: true,
      data: {
        hasHiddenAchievements: progress.length > 0,
        hiddenCount: progress.length,
        unlockProgress: progress,
      },
    });
  } catch (error) {
    console.error('Error getting unlock progress:', error);
    res.status(500).json({ success: false, message: 'Failed to get unlock progress' });
  }
};
