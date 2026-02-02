import express from 'express';
import { protect } from '../middleware/auth';
import { achievementScheduler } from '../utils/achievementScheduler';
import Achievement from '../models/Achievement';
import { Budget } from '../models/Budget';
import { Transaction } from '../models/Transaction';
import mongoose from 'mongoose';

const router = express.Router();

// DEVELOPMENT/TESTING ONLY - Manual achievement trigger for specific month
router.post('/manual-check', protect, async (req, res) => {
  try {
    const userId = (req as any).user._id.toString();
    const email = (req as any).user.email;
    
    // Allow checking specific month/year or default to January 2026
    const { month = 1, year = 2026 } = req.body;
    
    console.log(`Manual achievement check for user: ${email} (Month: ${month}, Year: ${year})`);
    
    const achievement = await achievementScheduler.checkUserBudgetAchievement(
      userId,
      email,
      month,
      year
    );
    
    if (achievement) {
      res.json({
        success: true,
        message: `Achievement awarded for ${month}/${year}!`,
        achievement
      });
    } else {
      res.json({
        success: false,
        message: `No achievement earned for ${month}/${year}. Check your budget and expenses.`,
        info: 'Make sure: 1) Budget is set, 2) Expenses are recorded, 3) Expenses ≤ Budget'
      });
    }
  } catch (error) {
    console.error('Manual achievement check error:', error);
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

// Check all users (admin/testing) for specific month
router.post('/manual-check-all', protect, async (req, res) => {
  try {
    // Allow checking specific month/year or default to January 2026
    const { month = 1, year = 2026 } = req.body;
    
    console.log(`Checking all users for ${month}/${year}...`);
    await achievementScheduler.checkAllUsersAchievements(month, year);
    
    res.json({
      success: true,
      message: `Checked all users for achievements (${month}/${year})`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

// ADMIN: Validate and clean all invalid achievements (no auth required in dev)
router.post('/admin/clean-invalid', async (req, res) => {
  try {
    console.log('🔍 Admin: Checking all achievements for validity...');
    
    const achievements = await Achievement.find({});
    const toDelete = [];
    const results = [];

    for (const achievement of achievements) {
      const { userId, email, month, year, budgetAmount, totalExpenses } = achievement;
      
      // Get actual budget for that specific month/year
      const budget = await Budget.findOne({
        user: userId,
        month: month,
        year: year,
      });

      if (!budget) {
        toDelete.push(achievement._id);
        results.push({
          email,
          month,
          year,
          reason: 'No budget found',
          action: 'DELETED'
        });
        continue;
      }

      // Calculate actual expenses for that month
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);

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

      const actualExpenses = transactions[0]?.totalExpenses || 0;
      const actualBudget = budget.totalBudget;

      // CRITICAL: Check if expenses exceeded budget
      if (actualExpenses > actualBudget) {
        toDelete.push(achievement._id);
        results.push({
          email,
          month,
          year,
          budget: actualBudget,
          spent: actualExpenses,
          exceeded: actualExpenses - actualBudget,
          reason: `Budget exceeded: spent ₹${actualExpenses} > budget ₹${actualBudget}`,
          action: 'DELETED'
        });
      } else {
        results.push({
          email,
          month,
          year,
          budget: actualBudget,
          spent: actualExpenses,
          saved: actualBudget - actualExpenses,
          action: 'VALID'
        });
      }
    }

    // Delete invalid achievements
    const deleteResult = await Achievement.deleteMany({
      _id: { $in: toDelete }
    });

    const invalidCount = toDelete.length;
    const validCount = achievements.length - invalidCount;

    console.log(`✅ Cleaned ${deleteResult.deletedCount} invalid achievements`);
    
    res.json({
      success: true,
      data: {
        totalChecked: achievements.length,
        validCount,
        invalidCount,
        deletedCount: deleteResult.deletedCount,
        results: results.filter(r => r.action === 'DELETED'),
        message: `Deleted ${deleteResult.deletedCount} invalid achievement(s)`
      }
    });
  } catch (error) {
    console.error('Error cleaning invalid achievements:', error);
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

export default router;
