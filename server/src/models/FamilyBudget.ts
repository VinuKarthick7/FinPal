import mongoose, { Document, Schema } from 'mongoose';

// Family Budget Category Interface
export interface IFamilyBudgetCategory {
  category: string;
  allocated: number;
  spent: number;
  color: string;
}

// Family Budget Interface - Month-wise tracking for family
export interface IFamilyBudget extends Document {
  _id: mongoose.Types.ObjectId;
  family: mongoose.Types.ObjectId;
  month: number; // 1-12
  year: number;
  totalBudget: number;
  totalSpent: number;
  categoryBudgets: IFamilyBudgetCategory[];
  memberBudgets: {
    userId: mongoose.Types.ObjectId;
    email: string;
    allocated: number;
    spent: number;
  }[];
  alertThreshold: number; // Percentage (e.g., 80 means alert at 80% spent)
  lastCalculatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const familyBudgetCategorySchema = new Schema<IFamilyBudgetCategory>(
  {
    category: {
      type: String,
      required: true,
      trim: true,
    },
    allocated: {
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

const memberBudgetSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    allocated: {
      type: Number,
      default: 0,
      min: 0,
    },
    spent: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const familyBudgetSchema = new Schema<IFamilyBudget>(
  {
    family: {
      type: Schema.Types.ObjectId,
      ref: 'Family',
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
      type: [familyBudgetCategorySchema],
      default: [],
    },
    memberBudgets: {
      type: [memberBudgetSchema],
      default: [],
    },
    alertThreshold: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },
    lastCalculatedAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for family + month + year
familyBudgetSchema.index({ family: 1, month: 1, year: 1 }, { unique: true });

// Method to recalculate spent amounts from transactions
familyBudgetSchema.methods.recalculateSpent = async function() {
  const Transaction = mongoose.model('Transaction');
  const Family = mongoose.model('Family');
  
  const family = await Family.findById(this.family);
  if (!family) return;
  
  const memberIds = family.members.map((m: any) => m.userId);
  
  const startDate = new Date(this.year, this.month - 1, 1);
  const endDate = new Date(this.year, this.month, 0, 23, 59, 59);
  
  // Get all transactions for family members in this month
  const transactions = await Transaction.find({
    user: { $in: memberIds },
    type: 'expense',
    date: { $gte: startDate, $lte: endDate },
  });
  
  // Reset spent amounts
  this.totalSpent = 0;
  this.categoryBudgets.forEach((cat: IFamilyBudgetCategory) => {
    cat.spent = 0;
  });
  this.memberBudgets.forEach((member: any) => {
    member.spent = 0;
  });
  
  // Calculate spent amounts
  transactions.forEach((tx: any) => {
    this.totalSpent += tx.amount;
    
    // Update category spent
    const catBudget = this.categoryBudgets.find(
      (c: IFamilyBudgetCategory) => c.category === tx.category
    );
    if (catBudget) {
      catBudget.spent += tx.amount;
    }
    
    // Update member spent
    const memberBudget = this.memberBudgets.find(
      (m: any) => m.userId.toString() === tx.user.toString()
    );
    if (memberBudget) {
      memberBudget.spent += tx.amount;
    }
  });
  
  this.lastCalculatedAt = new Date();
  await this.save();
  
  return this;
};

export const FamilyBudget = mongoose.model<IFamilyBudget>('FamilyBudget', familyBudgetSchema);

export default FamilyBudget;
