import mongoose, { Document, Schema } from 'mongoose';

export interface IReminder extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  dueDate: Date;
  type: 'bill' | 'loan' | 'subscription';
  isPaid: boolean;
  paidDate?: Date;
  recurring: boolean;
  recurringPeriod?: 'monthly' | 'quarterly' | 'yearly';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reminderSchema = new Schema<IReminder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['bill', 'loan', 'subscription'],
      default: 'bill',
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidDate: {
      type: Date,
    },
    recurring: {
      type: Boolean,
      default: false,
    },
    recurringPeriod: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
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

// Compound index for user queries
reminderSchema.index({ user: 1, dueDate: 1 });
reminderSchema.index({ user: 1, isPaid: 1, dueDate: 1 });

export const Reminder = mongoose.model<IReminder>('Reminder', reminderSchema);

export default Reminder;
