import { Router, Response } from 'express';
import { body, query } from 'express-validator';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth';
import Budget from '../models/Budget';
import Transaction from '../models/Transaction';

const router = Router();

// All routes are protected
router.use(protect);

// Validation rules
const budgetValidation = [
  body('month')
    .isInt({ min: 1, max: 12 })
    .withMessage('Month must be between 1 and 12'),
  body('year')
    .isInt({ min: 2020 })
    .withMessage('Year must be 2020 or later'),
  body('totalBudget')
    .isFloat({ min: 0 })
    .withMessage('Total budget must be a positive number'),
  body('categoryBudgets')
    .optional()
    .isArray()
    .withMessage('Category budgets must be an array'),
  body('alertThreshold')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Alert threshold must be between 0 and 100'),
];

// Helper to calculate spent amounts from transactions
const calculateSpentAmounts = async (userId: string, month: number, year: number) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Use ObjectId for aggregation pipeline
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  const result = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        type: 'expense',
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$category',
        spent: { $sum: '$amount' },
      },
    },
  ]);

  const categorySpending: Record<string, number> = {};
  let totalSpent = 0;

  result.forEach((item: { _id: string; spent: number }) => {
    categorySpending[item._id] = item.spent;
    totalSpent += item.spent;
  });

  return { categorySpending, totalSpent };
};

// @route   GET /api/budgets
// @desc    Get all budgets for user (with optional month/year filter)
// @access  Private
router.get('/', async (req: any, res: Response) => {
  try {
    const { month, year } = req.query;
    const userId = req.user._id;

    const filter: any = { user: userId };
    
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    const budgets = await Budget.find(filter).sort({ year: -1, month: -1 });

    // Calculate current spending for each budget
    const budgetsWithSpending = await Promise.all(
      budgets.map(async (budget) => {
        const { categorySpending, totalSpent } = await calculateSpentAmounts(
          userId.toString(),
          budget.month,
          budget.year
        );

        // Update category spent amounts
        const updatedCategoryBudgets = budget.categoryBudgets.map((cb: any) => ({
          category: cb.category,
          budgetAmount: cb.budgetAmount,
          color: cb.color,
          icon: cb.icon,
          spent: categorySpending[cb.category] || 0,
        }));

        return {
          ...budget.toObject(),
          totalSpent,
          categoryBudgets: updatedCategoryBudgets,
        };
      })
    );

    res.json({
      success: true,
      data: { budgets: budgetsWithSpending },
    });
  } catch (error: any) {
    console.error('Get budgets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/budgets/current
// @desc    Get current month's budget
// @access  Private
router.get('/current', async (req: any, res: Response) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let budget = await Budget.findOne({
      user: userId,
      month: currentMonth,
      year: currentYear,
    });

    if (!budget) {
      return res.json({
        success: true,
        data: { budget: null },
      });
    }

    // Calculate current spending
    const { categorySpending, totalSpent } = await calculateSpentAmounts(
      userId.toString(),
      currentMonth,
      currentYear
    );

    // Update category spent amounts
    const updatedCategoryBudgets = budget.categoryBudgets.map((cb: any) => ({
      category: cb.category,
      budgetAmount: cb.budgetAmount,
      color: cb.color,
      icon: cb.icon,
      spent: categorySpending[cb.category] || 0,
    }));

    res.json({
      success: true,
      data: {
        budget: {
          ...budget.toObject(),
          totalSpent,
          categoryBudgets: updatedCategoryBudgets,
        },
      },
    });
  } catch (error: any) {
    console.error('Get current budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/budgets/:id
// @desc    Get budget by ID
// @access  Private
router.get('/:id', async (req: any, res: Response) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found',
      });
    }

    // Calculate current spending
    const { categorySpending, totalSpent } = await calculateSpentAmounts(
      req.user._id.toString(),
      budget.month,
      budget.year
    );

    const updatedCategoryBudgets = budget.categoryBudgets.map((cb: any) => ({
      category: cb.category,
      budgetAmount: cb.budgetAmount,
      color: cb.color,
      icon: cb.icon,
      spent: categorySpending[cb.category] || 0,
    }));

    res.json({
      success: true,
      data: {
        budget: {
          ...budget.toObject(),
          totalSpent,
          categoryBudgets: updatedCategoryBudgets,
        },
      },
    });
  } catch (error: any) {
    console.error('Get budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/budgets
// @desc    Create a new budget
// @access  Private
router.post('/', budgetValidation, async (req: any, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { month, year, totalBudget, categoryBudgets, alertThreshold } = req.body;
    const userId = req.user._id;

    // Check if budget already exists for this month/year
    const existingBudget = await Budget.findOne({
      user: userId,
      month,
      year,
    });

    if (existingBudget) {
      return res.status(400).json({
        success: false,
        message: 'Budget already exists for this month. Please edit the existing budget.',
      });
    }

    const budget = await Budget.create({
      user: userId,
      month,
      year,
      totalBudget,
      categoryBudgets: categoryBudgets || [],
      alertThreshold: alertThreshold || 80,
    });

    res.status(201).json({
      success: true,
      message: 'Budget created successfully',
      data: { budget },
    });
  } catch (error: any) {
    console.error('Create budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/budgets/:id
// @desc    Update a budget
// @access  Private
router.put('/:id', async (req: any, res: Response) => {
  try {
    const { totalBudget, categoryBudgets, alertThreshold } = req.body;
    const userId = req.user._id;

    const budget = await Budget.findOne({
      _id: req.params.id,
      user: userId,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found',
      });
    }

    // Update fields
    if (totalBudget !== undefined) budget.totalBudget = totalBudget;
    if (categoryBudgets !== undefined) budget.categoryBudgets = categoryBudgets;
    if (alertThreshold !== undefined) budget.alertThreshold = alertThreshold;

    await budget.save();

    res.json({
      success: true,
      message: 'Budget updated successfully',
      data: { budget },
    });
  } catch (error: any) {
    console.error('Update budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   DELETE /api/budgets/:id
// @desc    Delete a budget
// @access  Private
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found',
      });
    }

    res.json({
      success: true,
      message: 'Budget deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/budgets/summary/overview
// @desc    Get budget overview with spending analysis
// @access  Private
router.get('/summary/overview', async (req: any, res: Response) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get current month budget
    const currentBudget = await Budget.findOne({
      user: userId,
      month: currentMonth,
      year: currentYear,
    });

    // Calculate spending
    const { categorySpending, totalSpent } = await calculateSpentAmounts(
      userId.toString(),
      currentMonth,
      currentYear
    );

    // Calculate daily average and projected total
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const dailyAverage = totalSpent / dayOfMonth;
    const projectedTotal = dailyAverage * daysInMonth;

    // Find categories over budget
    const overBudgetCategories: string[] = [];
    if (currentBudget) {
      currentBudget.categoryBudgets.forEach((cb) => {
        const spent = categorySpending[cb.category] || 0;
        if (spent > cb.amount) {
          overBudgetCategories.push(cb.category);
        }
      });
    }

    res.json({
      success: true,
      data: {
        hasBudget: !!currentBudget,
        totalBudget: currentBudget?.totalBudget || 0,
        totalSpent,
        remaining: (currentBudget?.totalBudget || 0) - totalSpent,
        percentage: currentBudget ? (totalSpent / currentBudget.totalBudget) * 100 : 0,
        dailyAverage,
        projectedTotal,
        daysRemaining: daysInMonth - dayOfMonth,
        isOverBudget: currentBudget ? totalSpent > currentBudget.totalBudget : false,
        overBudgetCategories,
        alertThreshold: currentBudget?.alertThreshold || 80,
      },
    });
  } catch (error: any) {
    console.error('Get budget overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
