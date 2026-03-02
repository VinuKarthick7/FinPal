/**
 * Auto Expense Engine
 * Automatically creates expense entries from successful UPI payments.
 * Handles:
 * - Transaction creation from webhook data
 * - AI-based categorization
 * - Monthly spending recalculation
 * - Budget utilization updates
 * - Duplicate prevention
 */
import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction';
import { UpiPayment } from '../models/UpiPayment';
import { Budget } from '../models/Budget';
import { categorizeTransaction } from './aiCategorizationService';
import Family from '../models/Family';

interface PaymentData {
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number; // in rupees
  merchant: string;
  description?: string;
  notes?: Record<string, string>;
  method?: string;
  vpa?: string;
  email?: string;
  contact?: string;
  bank?: string;
  wallet?: string;
  paidAt?: Date;
}

interface AutoExpenseResult {
  success: boolean;
  transaction?: any;
  upiPayment?: any;
  category?: string;
  budgetAlert?: {
    type: 'warning' | 'exceeded';
    message: string;
    percentage: number;
  } | null;
  error?: string;
}

/**
 * Process a successful payment and auto-create expense
 * Uses sequential operations (no MongoDB transactions needed)
 */
export async function processPaymentToExpense(
  data: PaymentData
): Promise<AutoExpenseResult> {
  try {
    // 1. Check for duplicate payment processing
    const existingPayment = await UpiPayment.findOne({
      razorpayPaymentId: data.razorpayPaymentId,
      status: 'captured',
    });

    if (existingPayment) {
      return {
        success: false,
        error: 'Payment already processed (duplicate)',
      };
    }

    // 2. AI categorize the transaction
    const categorization = await categorizeTransaction({
      merchant: data.merchant,
      description: data.description,
      notes: data.notes ? Object.values(data.notes).join(' ') : undefined,
      amount: data.amount,
    });

    const transactionDate = data.paidAt || new Date();

    // 3. Create the Transaction record (expense)
    const transaction = await Transaction.create({
      user: new mongoose.Types.ObjectId(data.userId),
      amount: data.amount,
      category: categorization.category,
      merchant: data.merchant,
      date: transactionDate,
      type: 'expense',
      paymentMethod: 'upi',
      notes: data.description
        ? `[UPI Auto] ${data.description}`
        : `[UPI Auto] Payment to ${data.merchant}`,
    });

    // 4. Update the UPI Payment record
    const upiPayment = await UpiPayment.findOneAndUpdate(
      { razorpayOrderId: data.razorpayOrderId },
      {
        $set: {
          razorpayPaymentId: data.razorpayPaymentId,
          status: 'captured',
          transactionId: transaction._id,
          aiCategory: categorization.category,
          aiConfidence: categorization.confidence,
          method: data.method || 'upi',
          vpa: data.vpa,
          email: data.email,
          contact: data.contact,
          bank: data.bank,
          wallet: data.wallet,
          paidAt: transactionDate,
          webhookReceivedAt: new Date(),
          webhookVerified: true,
        },
      },
      { new: true }
    );

    // 5. Check and update budget
    const budgetAlert = await checkBudgetImpact(
      data.userId,
      data.amount,
      transactionDate
    );

    // 6. Update family spending if user is in a family
    await updateFamilySpending(data.userId);

    console.log(
      `✅ Auto-expense created: ₹${data.amount} → ${categorization.category} (${(categorization.confidence * 100).toFixed(0)}% confidence) for payment ${data.razorpayPaymentId}`
    );

    return {
      success: true,
      transaction,
      upiPayment,
      category: categorization.category,
      budgetAlert,
    };
  } catch (error) {
    console.error('❌ Auto-expense creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check how this payment impacts the user's monthly budget
 */
async function checkBudgetImpact(
  userId: string,
  amount: number,
  date: Date
): Promise<AutoExpenseResult['budgetAlert']> {
  try {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const budget = await Budget.findOne({
      user: new mongoose.Types.ObjectId(userId),
      month,
      year,
    });

    if (!budget) return null;

    // Aggregate all expenses for this month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const aggregation = await Transaction.aggregate([
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
          totalSpent: { $sum: '$amount' },
        },
      },
    ]);

    const totalSpent = (aggregation[0]?.totalSpent || 0);
    const percentage = budget.totalBudget > 0
      ? Math.round((totalSpent / budget.totalBudget) * 100)
      : 0;

    if (percentage >= 100) {
      return {
        type: 'exceeded',
        message: `⚠️ Budget exceeded! You've spent ₹${totalSpent.toLocaleString('en-IN')} of ₹${budget.totalBudget.toLocaleString('en-IN')} budget (${percentage}%)`,
        percentage,
      };
    }

    if (percentage >= (budget.alertThreshold || 80)) {
      return {
        type: 'warning',
        message: `⚡ Budget alert! You've used ${percentage}% of your monthly budget (₹${totalSpent.toLocaleString('en-IN')} / ₹${budget.totalBudget.toLocaleString('en-IN')})`,
        percentage,
      };
    }

    return null;
  } catch (error) {
    console.error('Budget impact check failed:', error);
    return null;
  }
}

/**
 * Update family spending totals if user belongs to a family
 */
async function updateFamilySpending(
  userId: string
): Promise<void> {
  try {
    const family = await Family.findOne({
      'members.user': new mongoose.Types.ObjectId(userId),
    });

    if (!family) return;

    // Family spending recalculation happens via existing family report endpoints
    // We just flag a timestamp for sync purposes
    family.updatedAt = new Date();
    await family.save();
  } catch (error) {
    console.error('Family spending update notification failed:', error);
    // Non-critical — don't fail the transaction
  }
}

/**
 * Get monthly UPI spending summary for a user
 */
export async function getUpiSpendingSummary(
  userId: string,
  month?: number,
  year?: number
): Promise<{
  totalUpiSpent: number;
  transactionCount: number;
  categoryBreakdown: Array<{ category: string; total: number; count: number }>;
  recentPayments: any[];
}> {
  const now = new Date();
  const m = month || now.getMonth() + 1;
  const y = year || now.getFullYear();
  const startOfMonth = new Date(y, m - 1, 1);
  const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

  const [summary, categoryBreakdown, recentPayments] = await Promise.all([
    UpiPayment.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          status: 'captured',
          paidAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalUpiSpent: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
        },
      },
    ]),
    UpiPayment.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          status: 'captured',
          paidAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: '$aiCategory',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]),
    UpiPayment.find({
      user: new mongoose.Types.ObjectId(userId),
      status: 'captured',
    })
      .sort({ paidAt: -1 })
      .limit(10)
      .select('-razorpaySignature'),
  ]);

  return {
    totalUpiSpent: summary[0]?.totalUpiSpent || 0,
    transactionCount: summary[0]?.transactionCount || 0,
    categoryBreakdown: categoryBreakdown.map((c) => ({
      category: c._id || 'Other',
      total: c.total,
      count: c.count,
    })),
    recentPayments,
  };
}

export default {
  processPaymentToExpense,
  getUpiSpendingSummary,
};
