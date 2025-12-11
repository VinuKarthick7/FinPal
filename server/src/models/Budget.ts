import mongoose, { Document, Schema } from 'mongoose';

export interface ICategoryBudget {
  category: string;
  amount: number;
  spent: number;
  color: string;
}

export interface IBudget extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  month: number; // 1-12
  year: number;
  totalBudget: number;
  totalSpent: number;
  categoryBudgets: ICategoryBudget[];
  alertThreshold: number; // Percentage (e.g., 80 means alert at 80% spent)
  createdAt: Date;
  updatedAt: Date;
}

const categoryBudgetSchema = new Schema<ICategoryBudget>(
  {
    category: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    spent: {
      type: Number,
      default: 0,
      min: 0,
    },
    color: {
      type: String,
      default: '#6366F1',
    },
  },
  { _id: false }
);

const budgetSchema = new Schema<IBudget>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: [true, 'Month is required'],
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: 2020,
    },
    totalBudget: {
      type: Number,
      required: [true, 'Total budget is required'],
      min: [0, 'Budget cannot be negative'],
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    categoryBudgets: {
      type: [categoryBudgetSchema],
      default: [],
    },
    alertThreshold: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for user + month + year
budgetSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });

export const Budget = mongoose.model<IBudget>('Budget', budgetSchema);

export default Budget;
