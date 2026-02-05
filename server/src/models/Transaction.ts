import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  amount: number;
  category: string;
  merchant: string;
  date: Date;
  type: 'expense' | 'income';
  paymentMethod: 'cash' | 'upi' | 'card' | 'netbanking' | 'other';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      enum: [
        'Food',
        'Groceries',
        'Shopping',
        'Transport',
        'Entertainment',
        'Utilities',
        'Healthcare',
        'Education',
        'Rent',
        'Salary',
        'Investment',
        'Gift',
        'Other',
      ],
    },
    merchant: {
      type: String,
      required: [true, 'Merchant/Description is required'],
      trim: true,
      maxlength: [100, 'Merchant name cannot exceed 100 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['expense', 'income'],
      default: 'expense',
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['cash', 'upi', 'card', 'netbanking', 'other'],
      default: 'upi',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save validation to ensure data integrity
transactionSchema.pre('save', function(next) {
  // Validate amount is not null or undefined
  if (this.amount === null || this.amount === undefined) {
    return next(new Error('Transaction amount cannot be null or undefined'));
  }
  
  // Validate amount is a positive number
  if (this.amount < 0) {
    return next(new Error('Transaction amount cannot be negative'));
  }
  
  // Ensure amount is rounded to 2 decimal places
  this.amount = Math.round(this.amount * 100) / 100;
  
  // Validate date is not in the future
  const now = new Date();
  if (new Date(this.date) > now) {
    // Allow up to end of current day
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    if (new Date(this.date) > endOfToday) {
      return next(new Error('Transaction date cannot be in the future'));
    }
  }
  
  // Validate merchant is not empty
  if (!this.merchant || this.merchant.trim() === '') {
    return next(new Error('Merchant/Description is required'));
  }
  
  next();
});

// Static method to validate transaction data before saving
transactionSchema.statics.validateTransactionData = function(data: any) {
  const errors: string[] = [];
  
  if (data.amount === null || data.amount === undefined) {
    errors.push('Amount is required');
  } else if (typeof data.amount !== 'number' || isNaN(data.amount)) {
    errors.push('Amount must be a valid number');
  } else if (data.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }
  
  if (!data.category) {
    errors.push('Category is required');
  }
  
  if (!data.merchant || data.merchant.trim() === '') {
    errors.push('Merchant/Description is required');
  }
  
  if (!data.date) {
    errors.push('Date is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Compound index for user queries with date sorting
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1, date: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);

export default Transaction;
