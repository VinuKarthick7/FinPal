import { Request, Response } from 'express';
import { Transaction, Reminder, Budget } from '../models';

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
// @access  Private
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    
    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get transactions for current month
    const monthlyTransactions = await Transaction.find({
      user: userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    // Calculate totals (using Math.round to avoid floating-point precision issues)
    let totalSpent = 0;
    let totalIncome = 0;

    monthlyTransactions.forEach((t) => {
      if (t.type === 'expense') {
        totalSpent += t.amount;
      } else {
        totalIncome += t.amount;
      }
    });

    // Round to 2 decimal places to fix floating-point precision
    totalSpent = Math.round(totalSpent * 100) / 100;
    totalIncome = Math.round(totalIncome * 100) / 100;
    const savings = Math.round((totalIncome - totalSpent) * 100) / 100;

    // Get pending bills (unpaid reminders with due date in the future)
    const pendingReminders = await Reminder.find({
      user: userId,
      isPaid: false,
      dueDate: { $gte: new Date() },
    });

    const pendingBillsAmount = Math.round(pendingReminders.reduce((sum, r) => sum + r.amount, 0) * 100) / 100;
    const pendingBillsCount = pendingReminders.length;

    // Calculate trend (compare with last month)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const lastMonthTransactions = await Transaction.find({
      user: userId,
      date: { $gte: lastMonthStart, $lte: lastMonthEnd },
      type: 'expense',
    });

    const lastMonthSpent = Math.round(lastMonthTransactions.reduce((sum, t) => sum + t.amount, 0) * 100) / 100;
    const spentTrend = lastMonthSpent > 0 
      ? Math.round(((totalSpent - lastMonthSpent) / lastMonthSpent) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        totalSpent,
        totalIncome,
        savings,
        pendingBills: {
          amount: pendingBillsAmount,
          count: pendingBillsCount,
        },
        trends: {
          spent: {
            value: Math.abs(spentTrend),
            isPositive: spentTrend <= 0, // Less spending is positive
          },
        },
        month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch dashboard stats',
    });
  }
};

// @desc    Get category breakdown
// @route   GET /api/dashboard/categories
// @access  Private
export const getCategoryBreakdown = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    
    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Aggregate expenses by category
    const categoryData = await Transaction.aggregate([
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
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { amount: -1 },
      },
    ]);

    // Calculate total and percentages
    const total = Math.round(categoryData.reduce((sum, cat) => sum + cat.amount, 0) * 100) / 100;

    // Category colors
    const categoryColors: { [key: string]: string } = {
      Shopping: '#8B5CF6',
      Food: '#F97316',
      Rent: '#10B981',
      Transport: '#3B82F6',
      Utilities: '#EAB308',
      Entertainment: '#EC4899',
      Healthcare: '#14B8A6',
      Education: '#6366F1',
      Other: '#6B7280',
    };

    const categories = categoryData.map((cat) => ({
      name: cat._id,
      amount: Math.round(cat.amount * 100) / 100,
      percentage: total > 0 ? Math.round((cat.amount / total) * 100) : 0,
      color: categoryColors[cat._id] || '#6B7280',
      count: cat.count,
    }));

    res.json({
      success: true,
      data: {
        categories,
        total,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch category breakdown',
    });
  }
};

// @desc    Get budget progress
// @route   GET /api/dashboard/budget
// @access  Private
export const getBudgetProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Get budget for current month (don't auto-create, let user set it)
    const budget = await Budget.findOne({ user: userId, month, year });

    // Get total spent this month regardless of budget
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const transactions = await Transaction.find({
      user: userId,
      type: 'expense',
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const spent = Math.round(transactions.reduce((sum, t) => sum + t.amount, 0) * 100) / 100;

    // If no budget set, check for previous month's budget
    if (!budget) {
      // Calculate previous month
      let prevMonth = month - 1;
      let prevYear = year;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear--;
      }

      const previousBudget = await Budget.findOne({ user: userId, month: prevMonth, year: prevYear });

      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(year, month, 0).getDate();
      const dailyAverage = dayOfMonth > 0 ? spent / dayOfMonth : 0;
      const projectedTotal = Math.round(dailyAverage * daysInMonth);

      res.json({
        success: true,
        data: {
          hasBudget: false,
          budget: 0,
          spent,
          remaining: 0,
          percentage: 0,
          dailyAverage: Math.round(dailyAverage),
          projectedTotal,
          isOverBudget: false,
          month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
          previousBudget: previousBudget ? {
            _id: previousBudget._id,
            month: previousBudget.month,
            year: previousBudget.year,
            totalBudget: previousBudget.totalBudget,
          } : null,
        },
      });
      return;
    }

    const remaining = Math.round((budget.totalBudget - spent) * 100) / 100;
    const percentage = budget.totalBudget > 0 ? Math.round((spent / budget.totalBudget) * 100) : 0;

    // Calculate daily average and projection
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyAverage = dayOfMonth > 0 ? spent / dayOfMonth : 0;
    const projectedTotal = Math.round(dailyAverage * daysInMonth);

    res.json({
      success: true,
      data: {
        hasBudget: true,
        budget: budget.totalBudget,
        spent,
        remaining,
        percentage: Math.min(percentage, 100),
        dailyAverage: Math.round(dailyAverage),
        projectedTotal,
        isOverBudget: remaining < 0,
        month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch budget progress',
    });
  }
};

// @desc    Update budget
// @route   PUT /api/dashboard/budget
// @access  Private
export const updateBudget = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { totalBudget } = req.body;

    if (!totalBudget || totalBudget < 0) {
      res.status(400).json({
        success: false,
        message: 'Valid budget amount is required',
      });
      return;
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const budget = await Budget.findOneAndUpdate(
      { user: userId, month, year },
      { totalBudget },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Budget updated successfully',
      data: budget,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update budget',
    });
  }
};
