import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth';
import Transaction from '../models/Transaction';
import Budget from '../models/Budget';

const router = Router();

// All routes are protected
router.use(protect);

// Helper to get date range
const getDateRange = (period: string, year?: number, month?: number) => {
  const now = new Date();
  const currentYear = year || now.getFullYear();
  const currentMonth = month || now.getMonth() + 1;

  switch (period) {
    case 'month':
      return {
        start: new Date(currentYear, currentMonth - 1, 1),
        end: new Date(currentYear, currentMonth, 0, 23, 59, 59),
      };
    case 'quarter':
      const quarterStart = Math.floor((currentMonth - 1) / 3) * 3;
      return {
        start: new Date(currentYear, quarterStart, 1),
        end: new Date(currentYear, quarterStart + 3, 0, 23, 59, 59),
      };
    case 'year':
      return {
        start: new Date(currentYear, 0, 1),
        end: new Date(currentYear, 11, 31, 23, 59, 59),
      };
    case 'all':
      return {
        start: new Date(2020, 0, 1),
        end: new Date(currentYear + 1, 0, 1),
      };
    default:
      return {
        start: new Date(currentYear, currentMonth - 1, 1),
        end: new Date(currentYear, currentMonth, 0, 23, 59, 59),
      };
  }
};

// Month names helper
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// @route   GET /api/reports/monthly
// @desc    Get monthly report with daily breakdown
// @access  Private
router.get('/monthly', async (req: any, res: Response) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const targetMonth = month ? parseInt(month as string) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year as string) : now.getFullYear();
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    // Get totals
    const totals = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const expenses = totals.find((t) => t._id === 'expense') || { total: 0, count: 0 };
    const income = totals.find((t) => t._id === 'income') || { total: 0, count: 0 };

    // Get daily breakdown
    const dailyData = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
    ]);

    // Build daily breakdown array
    const dailyBreakdown = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayExpenses = dailyData.find((d) => d._id.day === day && d._id.type === 'expense');
      const dayIncome = dailyData.find((d) => d._id.day === day && d._id.type === 'income');
      dailyBreakdown.push({
        date: `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        day,
        expenses: Math.round((dayExpenses?.total || 0) * 100) / 100,
        income: Math.round((dayIncome?.total || 0) * 100) / 100,
      });
    }

    // Get category breakdown
    const categories = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    const totalExpenses = Math.round((expenses.total || 0) * 100) / 100;
    const categoriesWithPercentage = categories.map((cat) => ({
      name: cat._id,
      amount: Math.round(cat.amount * 100) / 100,
      count: cat.count,
      percentage: totalExpenses > 0 ? Math.round((cat.amount / totalExpenses) * 10000) / 100 : 0,
    }));

    // Get top merchants (all merchants sorted by amount)
    const topMerchants = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$merchant',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    // Get budget for the month
    const budget = await Budget.findOne({
      user: userId,
      month: targetMonth,
      year: targetYear,
    });

    res.json({
      success: true,
      data: {
        month: monthNames[targetMonth - 1],
        year: targetYear,
        totalExpenses: Math.round((expenses.total || 0) * 100) / 100,
        totalIncome: Math.round((income.total || 0) * 100) / 100,
        budget: budget ? budget.totalBudget : 0,
        netSavings: Math.round(((income.total || 0) - (expenses.total || 0)) * 100) / 100,
        transactionCount: (expenses.count || 0) + (income.count || 0),
        averageExpense: expenses.count > 0 ? Math.round((expenses.total || 0) / expenses.count) : 0,
        categories: categoriesWithPercentage,
        dailyBreakdown,
        topMerchants: topMerchants.map((m) => ({
          merchant: m._id,
          amount: Math.round(m.amount * 100) / 100,
          count: m.count,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get monthly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate monthly report',
    });
  }
});

// @route   GET /api/reports/yearly
// @desc    Get yearly overview with monthly breakdown
// @access  Private
router.get('/yearly', async (req: any, res: Response) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

    // Get monthly breakdown
    const monthlyData = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
    ]);

    // Build monthly breakdown array
    const monthlyBreakdown = [];
    let totalExpenses = 0;
    let totalIncome = 0;
    let highestSpending = { month: '', amount: 0 };
    let lowestSpending = { month: '', amount: Infinity };

    for (let month = 1; month <= 12; month++) {
      const monthExpenses = monthlyData.find((d) => d._id.month === month && d._id.type === 'expense');
      const monthIncome = monthlyData.find((d) => d._id.month === month && d._id.type === 'income');
      
      const expenses = Math.round((monthExpenses?.total || 0) * 100) / 100;
      const income = Math.round((monthIncome?.total || 0) * 100) / 100;
      
      totalExpenses += expenses;
      totalIncome += income;

      if (expenses > highestSpending.amount) {
        highestSpending = { month: monthNames[month - 1], amount: expenses };
      }
      if (expenses < lowestSpending.amount && expenses > 0) {
        lowestSpending = { month: monthNames[month - 1], amount: expenses };
      }

      monthlyBreakdown.push({
        month,
        monthName: monthNames[month - 1],
        expenses,
        income,
        savings: income - expenses,
      });
    }

    // Determine trend
    const firstHalf = monthlyBreakdown.slice(0, 6).reduce((sum, m) => sum + m.expenses, 0);
    const secondHalf = monthlyBreakdown.slice(6).reduce((sum, m) => sum + m.expenses, 0);
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (secondHalf > firstHalf * 1.1) trend = 'increasing';
    else if (secondHalf < firstHalf * 0.9) trend = 'decreasing';

    res.json({
      success: true,
      data: {
        year: targetYear,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalIncome: Math.round(totalIncome * 100) / 100,
        netSavings: Math.round((totalIncome - totalExpenses) * 100) / 100,
        monthlyData: monthlyBreakdown,
        averageMonthlyExpense: Math.round(totalExpenses / 12),
        highestSpendingMonth: highestSpending,
        lowestSpendingMonth: lowestSpending.amount === Infinity ? { month: 'N/A', amount: 0 } : lowestSpending,
        trend,
      },
    });
  } catch (error: any) {
    console.error('Get yearly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate yearly report',
    });
  }
});

// @route   GET /api/reports/export
// @desc    Export report data for PDF generation
// @access  Private
router.get('/export', async (req: any, res: Response) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const targetMonth = month ? parseInt(month as string) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year as string) : now.getFullYear();
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // Get totals
    const totals = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const expenses = totals.find((t) => t._id === 'expense') || { total: 0, count: 0 };
    const income = totals.find((t) => t._id === 'income') || { total: 0, count: 0 };

    // Get categories
    const categories = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    const totalExpenses = expenses.total || 0;

    // Get top merchants (all merchants sorted by amount)
    const topMerchants = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$merchant',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        month: monthNames[targetMonth - 1],
        year: targetYear,
        generatedAt: new Date().toISOString(),
        summary: {
          totalExpenses: expenses.total || 0,
          totalIncome: income.total || 0,
          netSavings: (income.total || 0) - (expenses.total || 0),
          transactionCount: (expenses.count || 0) + (income.count || 0),
          averageExpense: expenses.count > 0 ? Math.round((expenses.total || 0) / expenses.count) : 0,
        },
        categories: categories.map((cat) => ({
          name: cat._id,
          amount: cat.amount,
          percentage: totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0,
          count: cat.count,
        })),
        topMerchants: topMerchants.map((m) => ({
          merchant: m._id,
          amount: m.amount,
          count: m.count,
        })),
      },
    });
  } catch (error: any) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report',
    });
  }
});

// @route   GET /api/reports/summary
// @desc    Get expense summary for a period
// @access  Private
router.get('/summary', async (req: any, res: Response) => {
  try {
    const { period = 'month', year, month } = req.query;
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const { start, end } = getDateRange(
      period as string,
      year ? parseInt(year as string) : undefined,
      month ? parseInt(month as string) : undefined
    );

    // Get total expenses and income
    const totals = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
        },
      },
    ]);

    const expenses = totals.find((t) => t._id === 'expense') || { total: 0, count: 0, avgAmount: 0 };
    const income = totals.find((t) => t._id === 'income') || { total: 0, count: 0, avgAmount: 0 };

    // Get daily breakdown
    const dailyBreakdown = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get category breakdown
    const categoryBreakdown = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          date: { $gte: start, $lte: end },
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
      { $sort: { total: -1 } },
    ]);

    const totalExpenses = expenses.total || 0;
    const categoriesWithPercentage = categoryBreakdown.map((cat) => ({
      category: cat._id,
      total: cat.total,
      count: cat.count,
      avgAmount: Math.round(cat.avgAmount),
      percentage: totalExpenses > 0 ? Math.round((cat.total / totalExpenses) * 100) : 0,
    }));

    res.json({
      success: true,
      data: {
        period: { start, end, type: period },
        summary: {
          totalExpenses: expenses.total || 0,
          totalIncome: income.total || 0,
          netSavings: (income.total || 0) - (expenses.total || 0),
          transactionCount: (expenses.count || 0) + (income.count || 0),
          avgExpense: Math.round(expenses.avgAmount || 0),
          avgIncome: Math.round(income.avgAmount || 0),
        },
        dailyBreakdown,
        categoryBreakdown: categoriesWithPercentage,
      },
    });
  } catch (error: any) {
    console.error('Get report summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
    });
  }
});

// @route   GET /api/reports/trends
// @desc    Get expense trends over time
// @access  Private
router.get('/trends', async (req: any, res: Response) => {
  try {
    const { months = 6 } = req.query;
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const monthCount = Math.min(parseInt(months as string) || 6, 24);

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthCount + 1, 1);

    // Monthly trends
    const monthlyTrends = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Transform to chart-friendly format
    const monthlyData: Record<string, { expenses: number; income: number; savings: number; month: string }> = {};
    
    for (let i = 0; i < monthCount; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - monthCount + 1 + i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyData[key] = { expenses: 0, income: 0, savings: 0, month: monthName };
    }

    monthlyTrends.forEach((item) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (monthlyData[key]) {
        if (item._id.type === 'expense') {
          monthlyData[key].expenses = item.total;
        } else {
          monthlyData[key].income = item.total;
        }
        monthlyData[key].savings = monthlyData[key].income - monthlyData[key].expenses;
      }
    });

    const trendData = Object.values(monthlyData);

    // Calculate trend direction
    const recentMonths = trendData.slice(-3);
    const olderMonths = trendData.slice(-6, -3);
    
    const recentAvg = recentMonths.reduce((sum, m) => sum + m.expenses, 0) / recentMonths.length;
    const olderAvg = olderMonths.length > 0 
      ? olderMonths.reduce((sum, m) => sum + m.expenses, 0) / olderMonths.length 
      : recentAvg;
    
    const trendPercentage = olderAvg > 0 
      ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) 
      : 0;

    res.json({
      success: true,
      data: {
        monthlyData: trendData,
        trend: {
          direction: trendPercentage > 0 ? 'up' : trendPercentage < 0 ? 'down' : 'stable',
          percentage: Math.abs(trendPercentage),
          recentAverage: Math.round(recentAvg),
        },
      },
    });
  } catch (error: any) {
    console.error('Get trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trends',
    });
  }
});

// @route   GET /api/reports/category-trends
// @desc    Get category-wise spending trends
// @access  Private
router.get('/category-trends', async (req: any, res: Response) => {
  try {
    const { months = 6 } = req.query;
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const monthCount = Math.min(parseInt(months as string) || 6, 12);

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthCount + 1, 1);

    const categoryTrends = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            category: '$category',
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Get unique categories
    const categories = [...new Set(categoryTrends.map((t) => t._id.category))];

    // Build monthly data per category
    const categoryData: Record<string, { category: string; data: { month: string; amount: number }[] }> = {};

    categories.forEach((cat) => {
      categoryData[cat] = { category: cat, data: [] };
      
      for (let i = 0; i < monthCount; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - monthCount + 1 + i, 1);
        const monthName = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        const found = categoryTrends.find(
          (t) => t._id.category === cat && t._id.year === year && t._id.month === month
        );
        
        categoryData[cat].data.push({
          month: monthName,
          amount: found ? found.total : 0,
        });
      }
    });

    // Calculate top growing categories
    const categoryGrowth = categories.map((cat) => {
      const data = categoryData[cat].data;
      const recent = data.slice(-2).reduce((sum, d) => sum + d.amount, 0) / 2;
      const older = data.slice(0, 2).reduce((sum, d) => sum + d.amount, 0) / 2;
      const growth = older > 0 ? ((recent - older) / older) * 100 : recent > 0 ? 100 : 0;
      
      return {
        category: cat,
        growth: Math.round(growth),
        recentAvg: Math.round(recent),
      };
    }).sort((a, b) => b.growth - a.growth);

    res.json({
      success: true,
      data: {
        categoryTrends: Object.values(categoryData),
        topGrowing: categoryGrowth.slice(0, 5),
        topDecreasing: categoryGrowth.slice(-5).reverse(),
      },
    });
  } catch (error: any) {
    console.error('Get category trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get category trends',
    });
  }
});

// @route   GET /api/reports/comparison
// @desc    Compare two periods
// @access  Private
router.get('/comparison', async (req: any, res: Response) => {
  try {
    const { type = 'month' } = req.query; // month, quarter, year
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const now = new Date();

    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;

    if (type === 'month') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (type === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
      currentEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59);
      previousStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
      previousEnd = new Date(now.getFullYear(), currentQuarter * 3, 0, 23, 59, 59);
    } else {
      currentStart = new Date(now.getFullYear(), 0, 1);
      currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      previousEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    }

    // Get current period data
    const currentData = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: currentStart, $lte: currentEnd },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get previous period data
    const previousData = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: previousStart, $lte: previousEnd },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get category comparison
    const currentCategories = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          date: { $gte: currentStart, $lte: currentEnd },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const previousCategories = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          date: { $gte: previousStart, $lte: previousEnd },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const currentExpense = currentData.find((d) => d._id === 'expense')?.total || 0;
    const currentIncome = currentData.find((d) => d._id === 'income')?.total || 0;
    const previousExpense = previousData.find((d) => d._id === 'expense')?.total || 0;
    const previousIncome = previousData.find((d) => d._id === 'income')?.total || 0;

    const expenseChange = previousExpense > 0 
      ? Math.round(((currentExpense - previousExpense) / previousExpense) * 100) 
      : currentExpense > 0 ? 100 : 0;
    const incomeChange = previousIncome > 0 
      ? Math.round(((currentIncome - previousIncome) / previousIncome) * 100) 
      : currentIncome > 0 ? 100 : 0;

    // Build category comparison
    const allCategories = [...new Set([
      ...currentCategories.map((c) => c._id),
      ...previousCategories.map((c) => c._id),
    ])];

    const categoryComparison = allCategories.map((cat) => {
      const current = currentCategories.find((c) => c._id === cat)?.total || 0;
      const previous = previousCategories.find((c) => c._id === cat)?.total || 0;
      const change = previous > 0 
        ? Math.round(((current - previous) / previous) * 100) 
        : current > 0 ? 100 : 0;

      return {
        category: cat,
        current,
        previous,
        change,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      };
    }).sort((a, b) => b.current - a.current);

    res.json({
      success: true,
      data: {
        periodType: type,
        current: {
          period: { start: currentStart, end: currentEnd },
          expenses: currentExpense,
          income: currentIncome,
          savings: currentIncome - currentExpense,
        },
        previous: {
          period: { start: previousStart, end: previousEnd },
          expenses: previousExpense,
          income: previousIncome,
          savings: previousIncome - previousExpense,
        },
        changes: {
          expenses: { amount: currentExpense - previousExpense, percentage: expenseChange },
          income: { amount: currentIncome - previousIncome, percentage: incomeChange },
          savings: {
            amount: (currentIncome - currentExpense) - (previousIncome - previousExpense),
            percentage: 0,
          },
        },
        categoryComparison,
      },
    });
  } catch (error: any) {
    console.error('Get comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get comparison',
    });
  }
});

// @route   GET /api/reports/top-expenses
// @desc    Get top expenses for a period
// @access  Private
router.get('/top-expenses', async (req: any, res: Response) => {
  try {
    const { period = 'month', limit = 10 } = req.query;
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const { start, end } = getDateRange(period as string);

    const topExpenses = await Transaction.find({
      user: userId,
      type: 'expense',
      date: { $gte: start, $lte: end },
    })
      .sort({ amount: -1 })
      .limit(parseInt(limit as string) || 10)
      .select('title amount category date description');

    res.json({
      success: true,
      data: {
        period: { start, end },
        topExpenses,
      },
    });
  } catch (error: any) {
    console.error('Get top expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get top expenses',
    });
  }
});

export default router;
