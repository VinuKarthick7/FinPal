import express from 'express';
import { User } from '../models/User';
import { Budget } from '../models/Budget';
import { Transaction } from '../models/Transaction';
import Achievement from '../models/Achievement';
import mongoose from 'mongoose';

const router = express.Router();

// Debug endpoint to check specific user's data
router.get('/debug/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const { month = 1, year = 2026 } = req.query;
    
    console.log(`🔍 Debugging data for ${email} - ${month}/${year}`);
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: 'User not found' });
    }
    
    // Get budget
    const budget = await Budget.findOne({
      userId: user._id,
      period: 'monthly',
      isActive: true
    });
    
    // Get transactions for specified month
    const startOfMonth = new Date(Number(year), Number(month) - 1, 1);
    const endOfMonth = new Date(Number(year), Number(month), 0, 23, 59, 59);
    
    const transactions = await Transaction.find({
      userId: user._id,
      type: 'expense',
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).sort({ date: -1 });
    
    const totalExpenses = transactions.reduce((sum, t) => sum + t.amount, 0);
    
    // Get achievement
    const achievement = await Achievement.findOne({
      userId: user._id,
      month: Number(month),
      year: Number(year)
    });
    
    const budgetAmount = budget?.totalBudget || 0;
    const isEligible = totalExpenses <= budgetAmount;
    
    res.json({
      success: true,
      data: {
        email,
        month,
        year,
        budget: {
          amount: budgetAmount,
          exists: !!budget
        },
        transactions: {
          count: transactions.length,
          total: totalExpenses,
          list: transactions.map(t => ({
            merchant: t.merchant,
            amount: t.amount,
            category: t.category,
            date: t.date
          }))
        },
        achievement: achievement ? {
          exists: true,
          budgetAmount: achievement.budgetAmount,
          totalExpenses: achievement.totalExpenses,
          status: achievement.status,
          earnedAt: achievement.earnedAt
        } : null,
        validation: {
          eligible: isEligible,
          formula: `${totalExpenses} <= ${budgetAmount} = ${isEligible}`,
          shouldHaveAchievement: isEligible,
          hasAchievement: !!achievement,
          isValid: isEligible === !!achievement
        }
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
