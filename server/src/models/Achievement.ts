import mongoose, { Schema, Document } from 'mongoose';

export interface IAchievement extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  month: number; // 1-12
  year: number;
  budgetAmount: number;
  totalExpenses: number;
  achievementType: 'budget_success';
  status: 'pending' | 'awarded' | 'finalized';
  earnedAt: Date;
  finalizedAt?: Date;
  popupShown?: boolean; // Track if reward popup was shown to user
  popupShownAt?: Date; // When popup was shown
  // NEW: Login-based visibility control
  loginCountAfterAward: number; // Track logins after achievement awarded
  visibleToUser: boolean; // Only true after 3 logins
  firstLoginAfterAward?: Date; // When first login occurred after award
  metadata?: {
    savingsAmount?: number;
    budgetUtilization?: number; // percentage
    message?: string;
  };
}

const AchievementSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    budgetAmount: {
      type: Number,
      required: true,
    },
    totalExpenses: {
      type: Number,
      required: true,
    },
    achievementType: {
      type: String,
      enum: ['budget_success'],
      default: 'budget_success',
    },
    status: {
      type: String,
      enum: ['pending', 'awarded', 'finalized'],
      default: 'pending',
    },
    earnedAt: {
      type: Date,
      default: Date.now,
    },
    finalizedAt: {
      type: Date,
    },
    popupShown: {
      type: Boolean,
      default: false,
    },
    popupShownAt: {
      type: Date,
    },
    loginCountAfterAward: {
      type: Number,
      default: 0,
      min: 0,
    },
    visibleToUser: {
      type: Boolean,
      default: false,
      index: true,
    },
    firstLoginAfterAward: {
      type: Date,
    },
    metadata: {
      savingsAmount: Number,
      budgetUtilization: Number,
      message: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one achievement per user per month/year
AchievementSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

// Index for querying by email and date
AchievementSchema.index({ email: 1, year: -1, month: -1 });

export default mongoose.model<IAchievement>('Achievement', AchievementSchema);
