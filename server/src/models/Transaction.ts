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

// Compound index for user queries with date sorting
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1, date: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);

export default Transaction;
