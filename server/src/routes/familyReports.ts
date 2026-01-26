import { Router, Response, Request, NextFunction } from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth';
import Transaction from '../models/Transaction';
import Family from '../models/Family';
import FamilyBudget from '../models/FamilyBudget';
import FamilyTransaction from '../models/FamilyTransaction';

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
    default:
      return {
        start: new Date(currentYear, currentMonth - 1, 1),
        end: new Date(currentYear, currentMonth, 0, 23, 59, 59),
      };
  }
};

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Validation helper
const validateAndSanitizeAmount = (amount: any): number => {
  if (amount === null || amount === undefined) return 0;
  const num = parseFloat(amount);
  if (isNaN(num)) return 0;
  return Math.round(num * 100) / 100; // Round to 2 decimal places
};

// @route   GET /api/family-reports/monthly
// @desc    Get family monthly report with member-wise breakdown
// @access  Private
router.get('/monthly', async (req: any, res: Response) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const targetMonth = month ? parseInt(month as string) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year as string) : now.getFullYear();
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Find user's family
    const family = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    }).populate('members.userId', 'fullName email avatar');

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'You are not part of any family',
      });
    }

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    // Get all member IDs and emails for proper data mapping
    const memberMap = new Map<string, { userId: string; email: string; nickname: string; relation: string }>();
    family.members.forEach((member: any) => {
      const id = member.userId._id?.toString() || member.userId.toString();
      memberMap.set(id, {
        userId: id,
        email: member.email.toLowerCase(),
        nickname: member.nickname,
        relation: member.relation,
      });
    });
    const memberIds = Array.from(memberMap.keys()).map(id => new mongoose.Types.ObjectId(id));

    // Get all transactions for family members - STRICTLY by user ID (email-mapped)
    const transactions = await Transaction.find({
      user: { $in: memberIds },
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: -1 });

    // Initialize tracking objects
    let totalExpenses = 0;
    let totalIncome = 0;
    const memberSpending: Record<string, { expenses: number; income: number; count: number }> = {};
    const categorySpending: Record<string, number> = {};
    const dailyData: Record<number, { expenses: number; income: number }> = {};

    // Initialize member spending for ALL members (even those with 0 spending)
    memberMap.forEach((member, id) => {
      memberSpending[id] = { expenses: 0, income: 0, count: 0 };
    });

    // Initialize daily data
    for (let day = 1; day <= daysInMonth; day++) {
      dailyData[day] = { expenses: 0, income: 0 };
    }

    // Process transactions - NO data mixing, each transaction strictly mapped to its user
    transactions.forEach((tx) => {
      const amount = validateAndSanitizeAmount(tx.amount);
      const memberId = tx.user.toString();
      const day = new Date(tx.date).getDate();

      if (tx.type === 'expense') {
        totalExpenses += amount;
        categorySpending[tx.category] = (categorySpending[tx.category] || 0) + amount;
        dailyData[day].expenses += amount;
        
        if (memberSpending[memberId]) {
          memberSpending[memberId].expenses += amount;
          memberSpending[memberId].count += 1;
        }
      } else {
        totalIncome += amount;
        dailyData[day].income += amount;
        
        if (memberSpending[memberId]) {
          memberSpending[memberId].income += amount;
        }
      }
    });

    // Build daily breakdown array
    const dailyBreakdown = [];
    for (let day = 1; day <= daysInMonth; day++) {
      dailyBreakdown.push({
        date: `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        day,
        expenses: validateAndSanitizeAmount(dailyData[day].expenses),
        income: validateAndSanitizeAmount(dailyData[day].income),
      });
    }

    // Build category breakdown with percentages
    const categories = Object.entries(categorySpending)
      .map(([name, amount]) => ({
        name,
        amount: validateAndSanitizeAmount(amount),
        percentage: totalExpenses > 0 ? validateAndSanitizeAmount((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Build member breakdown - each member's data strictly separate
    const memberBreakdown = Array.from(memberMap.entries()).map(([id, member]) => {
      const spending = memberSpending[id] || { expenses: 0, income: 0, count: 0 };
      return {
        userId: member.userId,
        email: member.email,
        nickname: member.nickname,
        relation: member.relation,
        expenses: validateAndSanitizeAmount(spending.expenses),
        income: validateAndSanitizeAmount(spending.income),
        transactionCount: spending.count,
        percentage: totalExpenses > 0 
          ? validateAndSanitizeAmount((spending.expenses / totalExpenses) * 100) 
          : 0,
      };
    }).sort((a, b) => b.expenses - a.expenses);

    // Get or create family budget for this month
    let familyBudget = await FamilyBudget.findOne({
      family: family._id,
      month: targetMonth,
      year: targetYear,
    });

    const budgetAmount = familyBudget?.totalBudget || family.sharedBudget.amount;

    res.json({
      success: true,
      data: {
        familyId: family._id,
        familyName: family.familyName,
        month: monthNames[targetMonth - 1],
        monthNumber: targetMonth,
        year: targetYear,
        totalExpenses: validateAndSanitizeAmount(totalExpenses),
        totalIncome: validateAndSanitizeAmount(totalIncome),
        netSavings: validateAndSanitizeAmount(totalIncome - totalExpenses),
        totalBudget: validateAndSanitizeAmount(budgetAmount),
        budgetUsedPercentage: budgetAmount > 0 
          ? validateAndSanitizeAmount((totalExpenses / budgetAmount) * 100) 
          : 0,
        remainingBudget: validateAndSanitizeAmount(budgetAmount - totalExpenses),
        transactionCount: transactions.length,
        memberCount: family.members.length,
        categories,
        dailyBreakdown,
        memberBreakdown,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Get family monthly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate family monthly report',
    });
  }
});

// @route   GET /api/family-reports/member/:memberId
// @desc    Get specific member's report within family context (by email/userId)
// @access  Private
router.get('/member/:memberId', async (req: any, res: Response) => {
  try {
    const { memberId } = req.params;
    const { month, year } = req.query;
    const now = new Date();
    const targetMonth = month ? parseInt(month as string) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year as string) : now.getFullYear();
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Find user's family
    const family = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'You are not part of any family',
      });
    }

    // Check if the requested member is in the family
    const targetMember = family.members.find(
      (m: any) => m.userId.toString() === memberId || m.email.toLowerCase() === memberId.toLowerCase()
    );

    if (!targetMember) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in your family',
      });
    }

    // Check permissions
    const currentMember = family.members.find(
      (m: any) => m.userId.toString() === userId.toString()
    );

    if (!currentMember?.permissions?.canViewExpenses && targetMember.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this member\'s expenses',
      });
    }

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // Get ONLY this member's transactions - strict email/userId mapping
    const transactions = await Transaction.find({
      user: targetMember.userId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: -1 });

    let totalExpenses = 0;
    let totalIncome = 0;
    const categorySpending: Record<string, number> = {};

    transactions.forEach((tx) => {
      const amount = validateAndSanitizeAmount(tx.amount);
      if (tx.type === 'expense') {
        totalExpenses += amount;
        categorySpending[tx.category] = (categorySpending[tx.category] || 0) + amount;
      } else {
        totalIncome += amount;
      }
    });

    const categories = Object.entries(categorySpending)
      .map(([name, amount]) => ({
        name,
        amount: validateAndSanitizeAmount(amount),
        percentage: totalExpenses > 0 ? validateAndSanitizeAmount((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    res.json({
      success: true,
      data: {
        member: {
          userId: targetMember.userId,
          email: targetMember.email,
          nickname: targetMember.nickname,
          relation: targetMember.relation,
        },
        month: monthNames[targetMonth - 1],
        monthNumber: targetMonth,
        year: targetYear,
        totalExpenses: validateAndSanitizeAmount(totalExpenses),
        totalIncome: validateAndSanitizeAmount(totalIncome),
        netSavings: validateAndSanitizeAmount(totalIncome - totalExpenses),
        transactionCount: transactions.length,
        categories,
        transactions: transactions.map((tx) => ({
          _id: tx._id,
          amount: validateAndSanitizeAmount(tx.amount),
          category: tx.category,
          merchant: tx.merchant,
          date: tx.date,
          type: tx.type,
          notes: tx.notes,
        })),
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Get member report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate member report',
    });
  }
});

// @route   GET /api/family-reports/yearly
// @desc    Get family yearly report with monthly breakdown
// @access  Private
router.get('/yearly', async (req: any, res: Response) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Find user's family
    const family = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'You are not part of any family',
      });
    }

    const memberIds = family.members.map((m: any) => m.userId);

    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

    // Get monthly breakdown
    const monthlyData = await Transaction.aggregate([
      {
        $match: {
          user: { $in: memberIds },
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
          count: { $sum: 1 },
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
      
      const expenses = validateAndSanitizeAmount(monthExpenses?.total || 0);
      const income = validateAndSanitizeAmount(monthIncome?.total || 0);
      
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
        familyId: family._id,
        familyName: family.familyName,
        year: targetYear,
        totalExpenses: validateAndSanitizeAmount(totalExpenses),
        totalIncome: validateAndSanitizeAmount(totalIncome),
        netSavings: validateAndSanitizeAmount(totalIncome - totalExpenses),
        monthlyData: monthlyBreakdown,
        averageMonthlyExpense: validateAndSanitizeAmount(totalExpenses / 12),
        highestSpendingMonth: highestSpending,
        lowestSpendingMonth: lowestSpending.amount === Infinity ? { month: 'N/A', amount: 0 } : lowestSpending,
        trend,
        memberCount: family.members.length,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Get family yearly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate family yearly report',
    });
  }
});

// @route   POST /api/family-reports/budget
// @desc    Create or update family budget for a specific month
// @access  Private (Admin only)
router.post('/budget', async (req: any, res: Response) => {
  try {
    const { month, year, totalBudget, categoryBudgets, memberBudgets } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Validate required fields
    if (!month || !year || totalBudget === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Month, year, and totalBudget are required',
      });
    }

    // Find user's family
    const family = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'You are not part of any family',
      });
    }

    // Check if user has permission to edit budget
    const currentMember = family.members.find(
      (m: any) => m.userId.toString() === userId.toString()
    );

    if (!currentMember?.permissions?.canEditBudget) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit family budget',
      });
    }

    // Validate budget amount
    const validatedBudget = validateAndSanitizeAmount(totalBudget);
    if (validatedBudget <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Budget amount must be greater than 0',
      });
    }

    // Build member budgets with email mapping
    const validMemberBudgets = family.members.map((member: any) => {
      const memberBudget = memberBudgets?.find(
        (mb: any) => mb.email?.toLowerCase() === member.email.toLowerCase() || 
                     mb.userId === member.userId.toString()
      );
      return {
        userId: member.userId,
        email: member.email.toLowerCase(),
        allocated: validateAndSanitizeAmount(memberBudget?.allocated || 0),
        spent: 0, // Will be calculated
      };
    });

    // Find or create budget
    let familyBudget = await FamilyBudget.findOne({
      family: family._id,
      month: parseInt(month),
      year: parseInt(year),
    });

    if (familyBudget) {
      // Update existing
      familyBudget.totalBudget = validatedBudget;
      familyBudget.categoryBudgets = categoryBudgets || familyBudget.categoryBudgets;
      familyBudget.memberBudgets = validMemberBudgets;
      familyBudget.lastCalculatedAt = new Date();
    } else {
      // Create new
      familyBudget = new FamilyBudget({
        family: family._id,
        month: parseInt(month),
        year: parseInt(year),
        totalBudget: validatedBudget,
        categoryBudgets: categoryBudgets || [],
        memberBudgets: validMemberBudgets,
        createdBy: userId,
      });
    }

    // Recalculate spent amounts from actual transactions
    await familyBudget.save();
    await (familyBudget as any).recalculateSpent();

    res.json({
      success: true,
      message: 'Family budget saved successfully',
      data: familyBudget,
    });
  } catch (error: any) {
    console.error('Save family budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save family budget',
    });
  }
});

// @route   GET /api/family-reports/budget/:month/:year
// @desc    Get family budget for a specific month
// @access  Private
router.get('/budget/:month/:year', async (req: any, res: Response) => {
  try {
    const { month, year } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Find user's family
    const family = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'You are not part of any family',
      });
    }

    let familyBudget = await FamilyBudget.findOne({
      family: family._id,
      month: parseInt(month),
      year: parseInt(year),
    });

    // If no specific budget exists, create a default one from family shared budget
    if (!familyBudget) {
      return res.json({
        success: true,
        data: {
          family: family._id,
          month: parseInt(month),
          year: parseInt(year),
          totalBudget: family.sharedBudget.amount,
          totalSpent: 0,
          categoryBudgets: family.sharedBudget.categories,
          memberBudgets: family.members.map((m: any) => ({
            userId: m.userId,
            email: m.email,
            allocated: 0,
            spent: 0,
          })),
          isDefault: true,
        },
      });
    }

    // Recalculate spent amounts to ensure accuracy
    await (familyBudget as any).recalculateSpent();

    res.json({
      success: true,
      data: familyBudget,
    });
  } catch (error: any) {
    console.error('Get family budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get family budget',
    });
  }
});

// @route   GET /api/family-reports/export
// @desc    Export family report data for PDF generation
// @access  Private
router.get('/export', async (req: any, res: Response) => {
  try {
    const { month, year, type = 'monthly' } = req.query;
    const now = new Date();
    const targetMonth = month ? parseInt(month as string) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year as string) : now.getFullYear();
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Find user's family
    const family = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    }).populate('members.userId', 'fullName email');

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'You are not part of any family',
      });
    }

    const memberIds = family.members.map((m: any) => m.userId._id || m.userId);

    let startDate: Date;
    let endDate: Date;

    if (type === 'yearly') {
      startDate = new Date(targetYear, 0, 1);
      endDate = new Date(targetYear, 11, 31, 23, 59, 59);
    } else {
      startDate = new Date(targetYear, targetMonth - 1, 1);
      endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
    }

    // Get transactions
    const transactions = await Transaction.find({
      user: { $in: memberIds },
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: -1 });

    // Calculate totals
    let totalExpenses = 0;
    let totalIncome = 0;
    const categorySpending: Record<string, number> = {};
    const memberSpending: Record<string, number> = {};

    transactions.forEach((tx) => {
      const amount = validateAndSanitizeAmount(tx.amount);
      const memberId = tx.user.toString();

      if (tx.type === 'expense') {
        totalExpenses += amount;
        categorySpending[tx.category] = (categorySpending[tx.category] || 0) + amount;
        memberSpending[memberId] = (memberSpending[memberId] || 0) + amount;
      } else {
        totalIncome += amount;
      }
    });

    // Build export data
    const categories = Object.entries(categorySpending)
      .map(([name, amount]) => ({
        name,
        amount: validateAndSanitizeAmount(amount),
        percentage: totalExpenses > 0 ? validateAndSanitizeAmount((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const members = family.members.map((m: any) => {
      const id = (m.userId._id || m.userId).toString();
      return {
        name: m.nickname || (m.userId as any).fullName,
        email: m.email,
        relation: m.relation,
        totalSpent: validateAndSanitizeAmount(memberSpending[id] || 0),
      };
    });

    res.json({
      success: true,
      data: {
        familyName: family.familyName,
        reportType: type,
        period: type === 'yearly' 
          ? `Year ${targetYear}` 
          : `${monthNames[targetMonth - 1]} ${targetYear}`,
        generatedAt: new Date().toISOString(),
        summary: {
          totalExpenses: validateAndSanitizeAmount(totalExpenses),
          totalIncome: validateAndSanitizeAmount(totalIncome),
          netSavings: validateAndSanitizeAmount(totalIncome - totalExpenses),
          transactionCount: transactions.length,
          memberCount: family.members.length,
        },
        categories,
        members,
        transactions: transactions.slice(0, 100).map((tx) => ({
          date: tx.date,
          merchant: tx.merchant,
          category: tx.category,
          amount: validateAndSanitizeAmount(tx.amount),
          type: tx.type,
        })),
      },
    });
  } catch (error: any) {
    console.error('Export family report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export family report',
    });
  }
});

// @route   GET /api/family-reports/sync-status
// @desc    Get data sync status and last update timestamps
// @access  Private
router.get('/sync-status', async (req: any, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Find user's family
    const family = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'You are not part of any family',
      });
    }

    // Get last transaction timestamp for each member
    const memberIds = family.members.map((m: any) => m.userId);
    const lastTransactions = await Transaction.aggregate([
      { $match: { user: { $in: memberIds } } },
      { $group: { _id: '$user', lastTransaction: { $max: '$updatedAt' } } },
    ]);

    const memberSyncStatus = family.members.map((m: any) => {
      const lastTx = lastTransactions.find((lt) => lt._id.toString() === m.userId.toString());
      return {
        userId: m.userId,
        email: m.email,
        nickname: m.nickname,
        lastTransactionAt: lastTx?.lastTransaction || null,
        lastActiveAt: m.lastActive,
      };
    });

    res.json({
      success: true,
      data: {
        familyId: family._id,
        familyLastSynced: family.lastSyncedAt,
        memberSyncStatus,
        serverTime: new Date().toISOString(),
        syncHealthy: true,
      },
    });
  } catch (error: any) {
    console.error('Get sync status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync status',
    });
  }
});

// @route   POST /api/family-reports/validate
// @desc    Validate and reconcile family data
// @access  Private (Admin only)
router.post('/validate', async (req: any, res: Response) => {
  try {
    const { month, year } = req.body;
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Find user's family
    const family = await Family.findOne({
      'members.userId': userId,
      isActive: true,
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'You are not part of any family',
      });
    }

    // Check if user is admin
    const currentMember = family.members.find(
      (m: any) => m.userId.toString() === userId.toString()
    );

    if (currentMember?.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can validate family data',
      });
    }

    const memberIds = family.members.map((m: any) => m.userId);
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // Get all transactions
    const transactions = await Transaction.find({
      user: { $in: memberIds },
      date: { $gte: startDate, $lte: endDate },
    });

    const validationResults = {
      totalTransactions: transactions.length,
      validTransactions: 0,
      invalidTransactions: 0,
      duplicates: 0,
      issues: [] as string[],
    };

    // Check for issues
    const seen = new Set<string>();
    
    transactions.forEach((tx) => {
      // Check for null/undefined values
      if (tx.amount === null || tx.amount === undefined) {
        validationResults.issues.push(`Transaction ${tx._id} has null amount`);
        validationResults.invalidTransactions++;
        return;
      }

      // Check for negative amounts
      if (tx.amount < 0) {
        validationResults.issues.push(`Transaction ${tx._id} has negative amount`);
        validationResults.invalidTransactions++;
        return;
      }

      // Check for duplicates (same user, amount, date, merchant within 1 minute)
      const key = `${tx.user}-${tx.amount}-${tx.merchant}-${Math.floor(new Date(tx.date).getTime() / 60000)}`;
      if (seen.has(key)) {
        validationResults.duplicates++;
        validationResults.issues.push(`Possible duplicate: ${tx.merchant} - ₹${tx.amount} on ${tx.date}`);
      } else {
        seen.add(key);
      }

      validationResults.validTransactions++;
    });

    // Update family budget spent amounts
    const familyBudget = await FamilyBudget.findOne({
      family: family._id,
      month: targetMonth,
      year: targetYear,
    });

    if (familyBudget) {
      await (familyBudget as any).recalculateSpent();
    }

    res.json({
      success: true,
      data: {
        month: monthNames[targetMonth - 1],
        year: targetYear,
        validation: validationResults,
        isHealthy: validationResults.invalidTransactions === 0 && validationResults.duplicates === 0,
        lastValidated: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Validate family data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate family data',
    });
  }
});

export default router;
