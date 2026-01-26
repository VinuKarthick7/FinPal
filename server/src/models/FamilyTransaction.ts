import mongoose, { Document, Schema } from 'mongoose';

// Shared Family Transaction Interface
// This tracks transactions that are marked as shared family expenses
export interface IFamilyTransaction extends Document {
  _id: mongoose.Types.ObjectId;
  family: mongoose.Types.ObjectId;
  originalTransaction: mongoose.Types.ObjectId; // Reference to the original Transaction
  addedBy: {
    userId: mongoose.Types.ObjectId;
    email: string;
    nickname: string;
  };
  amount: number;
  category: string;
  merchant: string;
  date: Date;
  type: 'expense' | 'income';
  notes?: string;
  splitType: 'equal' | 'custom' | 'full'; // How the expense is split among members
  splitDetails?: {
    userId: mongoose.Types.ObjectId;
    email: string;
    share: number; // Amount or percentage depending on splitType
    isPaid: boolean;
  }[];
  isReconciled: boolean;
  reconciledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const splitDetailSchema = new Schema(
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
    share: {
      type: Number,
      required: true,
      min: 0,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const familyTransactionSchema = new Schema<IFamilyTransaction>(
  {
    family: {
      type: Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
      index: true,
    },
    originalTransaction: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
    },
    addedBy: {
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
      nickname: {
        type: String,
        required: true,
        trim: true,
      },
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
    },
    merchant: {
      type: String,
      required: [true, 'Merchant/Description is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['expense', 'income'],
      default: 'expense',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    splitType: {
      type: String,
      enum: ['equal', 'custom', 'full'],
      default: 'full',
    },
    splitDetails: {
      type: [splitDetailSchema],
      default: [],
    },
    isReconciled: {
      type: Boolean,
      default: false,
    },
    reconciledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
familyTransactionSchema.index({ family: 1, date: -1 });
familyTransactionSchema.index({ family: 1, 'addedBy.userId': 1, date: -1 });
familyTransactionSchema.index({ family: 1, 'addedBy.email': 1, date: -1 });
familyTransactionSchema.index({ family: 1, category: 1, date: -1 });

// Prevent duplicate entries for the same original transaction in a family
familyTransactionSchema.index({ family: 1, originalTransaction: 1 }, { unique: true });

export const FamilyTransaction = mongoose.model<IFamilyTransaction>(
  'FamilyTransaction',
  familyTransactionSchema
);

export default FamilyTransaction;
