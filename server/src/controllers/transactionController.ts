import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Transaction } from '../models';

// @desc    Get all transactions for user
// @route   GET /api/transactions
// @access  Private
export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { page = 1, limit = 20, category, startDate, endDate, type } = req.query;

    const query: any = { user: userId };

    if (category) {
      query.category = category;
    }

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transactions',
    });
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
export const getTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: userId,
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
      return;
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transaction',
    });
  }
};

// @desc    Create transaction
// @route   POST /api/transactions
// @access  Private
export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    const userId = (req as any).user._id;
    const { amount, category, merchant, date, type, paymentMethod, notes } = req.body;

    const transaction = await Transaction.create({
      user: userId,
      amount,
      category,
      merchant,
      date: date || new Date(),
      type: type || 'expense',
      paymentMethod: paymentMethod || 'upi',
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create transaction',
    });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
export const updateTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { amount, category, merchant, date, type, paymentMethod, notes } = req.body;

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      { amount, category, merchant, date, type, paymentMethod, notes },
      { new: true, runValidators: true }
    );

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update transaction',
    });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
export const deleteTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: userId,
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete transaction',
    });
  }
};
