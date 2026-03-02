/**
 * Smart Budget Intelligence Service
 * Provides dynamic, context-aware financial insights including:
 * - Budget threshold alerts
 * - EMI date proximity alerts
 * - Unusual spending pattern detection
 * - Dynamic saving tips
 * - Generative financial advice
 */
import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { Reminder } from '../models/Reminder';
import { UpiPayment } from '../models/UpiPayment';
import config from '../config';

// Types
export interface SmartInsight {
  id: string;
  type:
    | 'budget_warning'
    | 'budget_exceeded'
    | 'emi_reminder'
    | 'unusual_spending'
    | 'saving_tip'
    | 'category_spike'
    | 'spending_trend'
    | 'upi_summary';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  data?: Record<string, any>;
  actionable?: boolean;
  createdAt: Date;
}

/**
 * Generate all smart insights for a user
 */
export async function generateSmartInsights(
  userId: string
): Promise<SmartInsight[]> {
  const insights: SmartInsight[] = [];
  const now = new Date();
  const userOid = new mongoose.Types.ObjectId(userId);

  await Promise.all([
    checkBudgetAlerts(userOid, now, insights),
    checkEmiReminders(userOid, now, insights),
    detectUnusualSpending(userOid, now, insights),
    generateSavingTips(userOid, now, insights),
    checkUpiTrends(userOid, now, insights),
  ]);

  // Sort by severity (critical first)
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  insights.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return insights;
}

/**
 * Check if spending exceeds budget thresholds
 */
async function checkBudgetAlerts(
  userId: mongoose.Types.ObjectId,
  now: Date,
  insights: SmartInsight[]
): Promise<void> {
  try {
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const budget = await Budget.findOne({ user: userId, month, year });
    if (!budget || budget.totalBudget <= 0) return;

    const aggregation = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      { $group: { _id: null, totalSpent: { $sum: '$amount' } } },
    ]);

    const totalSpent = aggregation[0]?.totalSpent || 0;
    const percentage = Math.round((totalSpent / budget.totalBudget) * 100);
    const remaining = budget.totalBudget - totalSpent;
    const daysLeft = Math.max(
      1,
      Math.ceil(
        (endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
    const dailyBudgetRemaining = remaining > 0 ? Math.round(remaining / daysLeft) : 0;

    if (percentage >= 100) {
      insights.push({
        id: `budget_exceeded_${month}_${year}`,
        type: 'budget_exceeded',
        severity: 'critical',
        title: 'Budget Exceeded! 🚨',
        message: `You've spent ₹${totalSpent.toLocaleString('en-IN')} which is ${percentage}% of your ₹${budget.totalBudget.toLocaleString('en-IN')} monthly budget. You're over by ₹${Math.abs(remaining).toLocaleString('en-IN')}.`,
        data: { totalSpent, totalBudget: budget.totalBudget, percentage, overspent: Math.abs(remaining) },
        actionable: true,
        createdAt: now,
      });
    } else if (percentage >= (budget.alertThreshold || 80)) {
      insights.push({
        id: `budget_warning_${month}_${year}`,
        type: 'budget_warning',
        severity: 'warning',
        title: 'Budget Alert ⚡',
        message: `You've used ${percentage}% of your budget. ₹${remaining.toLocaleString('en-IN')} remaining for ${daysLeft} days (≈ ₹${dailyBudgetRemaining.toLocaleString('en-IN')}/day).`,
        data: { totalSpent, totalBudget: budget.totalBudget, percentage, remaining, daysLeft, dailyBudgetRemaining },
        actionable: true,
        createdAt: now,
      });
    }

    // Check category-level budgets
    if (budget.categoryBudgets?.length) {
      const categoryAgg = await Transaction.aggregate([
        {
          $match: {
            user: userId,
            type: 'expense',
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $group: { _id: '$category', spent: { $sum: '$amount' } } },
      ]);

      const categorySpending = new Map(
        categoryAgg.map((c) => [c._id, c.spent])
      );

      for (const cb of budget.categoryBudgets) {
        const spent = categorySpending.get(cb.category) || 0;
        const catPercentage = cb.amount > 0 ? Math.round((spent / cb.amount) * 100) : 0;
        if (catPercentage >= 100) {
          insights.push({
            id: `cat_exceeded_${cb.category}_${month}`,
            type: 'category_spike',
            severity: 'warning',
            title: `${cb.category} Over Budget`,
            message: `${cb.category} spending (₹${spent.toLocaleString('en-IN')}) has exceeded the ₹${cb.amount.toLocaleString('en-IN')} allocation by ₹${(spent - cb.amount).toLocaleString('en-IN')}.`,
            data: { category: cb.category, spent, allocated: cb.amount, percentage: catPercentage },
            actionable: true,
            createdAt: now,
          });
        }
      }
    }
  } catch (error) {
    console.error('Budget alert check failed:', error);
  }
}

/**
 * Alert if EMI or bill dates are approaching
 */
async function checkEmiReminders(
  userId: mongoose.Types.ObjectId,
  now: Date,
  insights: SmartInsight[]
): Promise<void> {
  try {
    const threeDaysLater = new Date(
      now.getTime() + 3 * 24 * 60 * 60 * 1000
    );

    const upcomingReminders = await Reminder.find({
      user: userId,
      status: { $ne: 'paid' },
      dueDate: { $gte: now, $lte: threeDaysLater },
    }).sort({ dueDate: 1 });

    for (const reminder of upcomingReminders) {
      const daysUntil = Math.ceil(
        (new Date(reminder.dueDate).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      const isToday = daysUntil <= 0;
      const severity = isToday ? 'critical' : daysUntil <= 1 ? 'warning' : 'info';

      insights.push({
        id: `emi_reminder_${reminder._id}`,
        type: 'emi_reminder',
        severity,
        title: isToday ? `${reminder.title} Due Today! 🔔` : `${reminder.title} Due Soon`,
        message: isToday
          ? `₹${reminder.amount.toLocaleString('en-IN')} payment for ${reminder.title} is due today!`
          : `₹${reminder.amount.toLocaleString('en-IN')} payment for ${reminder.title} is due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}.`,
        data: {
          reminderId: reminder._id,
          amount: reminder.amount,
          dueDate: reminder.dueDate,
          type: reminder.type,
          daysUntil,
        },
        actionable: true,
        createdAt: now,
      });
    }
  } catch (error) {
    console.error('EMI reminder check failed:', error);
  }
}

/**
 * Detect unusual high spending patterns
 */
async function detectUnusualSpending(
  userId: mongoose.Types.ObjectId,
  now: Date,
  insights: SmartInsight[]
): Promise<void> {
  try {
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    // Get last 3 months averages
    const threeMonthsAgo = new Date(currentYear, currentMonth - 4, 1);

    const [currentSpending, historicalSpending] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            type: 'expense',
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$amount' },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            type: 'expense',
            date: { $gte: threeMonthsAgo, $lt: startOfMonth },
          },
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 1,
            monthlyAvg: { $divide: ['$total', 3] },
            count: 1,
          },
        },
      ]),
    ]);

    const historyMap = new Map(
      historicalSpending.map((h) => [h._id, h.monthlyAvg])
    );

    // Day-of-month factor (pro-rate comparison)
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const proRateFactor = daysInMonth / dayOfMonth;

    for (const current of currentSpending) {
      const historicalAvg = historyMap.get(current._id);
      if (!historicalAvg || historicalAvg < 100) continue; // Skip categories with no history or tiny amounts

      // Project current spending to full month
      const projected = current.total * proRateFactor;
      const ratio = projected / historicalAvg;

      if (ratio > 1.5) {
        const increasePercent = Math.round((ratio - 1) * 100);
        insights.push({
          id: `unusual_${current._id}_${currentMonth}`,
          type: 'unusual_spending',
          severity: ratio > 2 ? 'warning' : 'info',
          title: `Unusual ${current._id} Spending 📊`,
          message: `${current._id} spending is tracking ${increasePercent}% higher than your 3-month average. Current: ₹${current.total.toLocaleString('en-IN')}, projected: ₹${Math.round(projected).toLocaleString('en-IN')} (avg: ₹${Math.round(historicalAvg).toLocaleString('en-IN')}/month).`,
          data: {
            category: current._id,
            currentSpent: current.total,
            projected: Math.round(projected),
            historicalAvg: Math.round(historicalAvg),
            increasePercent,
          },
          actionable: false,
          createdAt: now,
        });
      }
    }

    // Detect single high transactions (> 3x average per transaction)
    const recentHighTxns = await Transaction.find({
      user: userId,
      type: 'expense',
      date: { $gte: startOfMonth, $lte: endOfMonth },
    })
      .sort({ amount: -1 })
      .limit(3);

    const overallAvgResult = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          date: { $gte: threeMonthsAgo, $lt: startOfMonth },
        },
      },
      { $group: { _id: null, avgAmount: { $avg: '$amount' } } },
    ]);

    const avgTxnAmount = overallAvgResult[0]?.avgAmount || 0;
    if (avgTxnAmount > 0) {
      for (const txn of recentHighTxns) {
        if (txn.amount > avgTxnAmount * 3 && txn.amount > 500) {
          insights.push({
            id: `high_txn_${txn._id}`,
            type: 'unusual_spending',
            severity: 'info',
            title: `Large Transaction Detected`,
            message: `₹${txn.amount.toLocaleString('en-IN')} spent at ${txn.merchant} is significantly higher than your average transaction of ₹${Math.round(avgTxnAmount).toLocaleString('en-IN')}.`,
            data: { transactionId: txn._id, amount: txn.amount, merchant: txn.merchant, avgAmount: Math.round(avgTxnAmount) },
            actionable: false,
            createdAt: now,
          });
        }
      }
    }
  } catch (error) {
    console.error('Unusual spending detection failed:', error);
  }
}

/**
 * Generate dynamic saving tips based on user's spending patterns
 */
async function generateSavingTips(
  userId: mongoose.Types.ObjectId,
  now: Date,
  insights: SmartInsight[]
): Promise<void> {
  try {
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const categorySpending = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const totalSpent = categorySpending.reduce((sum, c) => sum + c.total, 0);
    if (totalSpent === 0) return;

    // Tip: Food/Entertainment optimization
    const foodSpending = categorySpending.find((c) => c._id === 'Food');
    const entertainmentSpending = categorySpending.find(
      (c) => c._id === 'Entertainment'
    );

    if (foodSpending && foodSpending.total > totalSpent * 0.3) {
      insights.push({
        id: `tip_food_${month}`,
        type: 'saving_tip',
        severity: 'info',
        title: 'Food Spending Tip 💡',
        message: `Food takes up ${Math.round((foodSpending.total / totalSpent) * 100)}% of your spending. Try meal planning or cooking at home 2-3 more days a week to save ₹${Math.round(foodSpending.total * 0.2).toLocaleString('en-IN')}/month.`,
        data: { category: 'Food', spent: foodSpending.total, percentage: Math.round((foodSpending.total / totalSpent) * 100) },
        actionable: false,
        createdAt: now,
      });
    }

    if (entertainmentSpending && entertainmentSpending.total > totalSpent * 0.15) {
      insights.push({
        id: `tip_entertainment_${month}`,
        type: 'saving_tip',
        severity: 'info',
        title: 'Entertainment Saving Tip 💡',
        message: `Consider free alternatives for entertainment. Setting a weekly entertainment budget of ₹${Math.round(entertainmentSpending.total / 5).toLocaleString('en-IN')} could help you save more.`,
        data: { category: 'Entertainment', spent: entertainmentSpending.total },
        actionable: false,
        createdAt: now,
      });
    }

    // Tip: Small recurring expenses add up
    const shoppingSpending = categorySpending.find(
      (c) => c._id === 'Shopping'
    );
    if (shoppingSpending && shoppingSpending.count > 8) {
      insights.push({
        id: `tip_shopping_${month}`,
        type: 'saving_tip',
        severity: 'info',
        title: 'Shopping Pattern Tip 💡',
        message: `You've made ${shoppingSpending.count} shopping transactions this month. Try batching purchases to avoid impulse buys — this alone can save 10-15% on shopping expenses.`,
        data: { category: 'Shopping', count: shoppingSpending.count, spent: shoppingSpending.total },
        actionable: false,
        createdAt: now,
      });
    }

    // Tip: UPI-based saving
    const budget = await Budget.findOne({ user: userId, month, year });
    if (budget && budget.totalBudget > 0) {
      const percentage = Math.round((totalSpent / budget.totalBudget) * 100);
      const daysElapsed = now.getDate();
      const daysInMonth = new Date(year, month, 0).getDate();
      const pacePercentage = Math.round((daysElapsed / daysInMonth) * 100);

      if (percentage < pacePercentage - 10) {
        insights.push({
          id: `tip_on_track_${month}`,
          type: 'saving_tip',
          severity: 'info',
          title: 'Great Pace! 🎉',
          message: `You're spending below budget pace! You've used ${percentage}% of your budget with ${pacePercentage}% of the month elapsed. Keep it up!`,
          data: { budgetPercentage: percentage, timePercentage: pacePercentage },
          actionable: false,
          createdAt: now,
        });
      }
    }
  } catch (error) {
    console.error('Saving tips generation failed:', error);
  }
}

/**
 * Check UPI payment trends
 */
async function checkUpiTrends(
  userId: mongoose.Types.ObjectId,
  now: Date,
  insights: SmartInsight[]
): Promise<void> {
  try {
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const upiSummary = await UpiPayment.aggregate([
      {
        $match: {
          user: userId,
          status: 'captured',
          paidAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avgPayment: { $avg: '$amount' },
        },
      },
    ]);

    if (upiSummary[0] && upiSummary[0].count > 0) {
      insights.push({
        id: `upi_summary_${month}`,
        type: 'upi_summary',
        severity: 'info',
        title: 'UPI Payment Summary 📱',
        message: `This month: ${upiSummary[0].count} UPI payments totalling ₹${Math.round(upiSummary[0].total).toLocaleString('en-IN')} (avg ₹${Math.round(upiSummary[0].avgPayment).toLocaleString('en-IN')}/payment).`,
        data: {
          total: upiSummary[0].total,
          count: upiSummary[0].count,
          avgPayment: Math.round(upiSummary[0].avgPayment),
        },
        actionable: false,
        createdAt: now,
      });
    }
  } catch (error) {
    console.error('UPI trend check failed:', error);
  }
}

export default {
  generateSmartInsights,
};
