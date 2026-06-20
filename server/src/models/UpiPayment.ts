import mongoose, { Document, Schema } from 'mongoose';

export interface IUpiPayment extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  // Razorpay identifiers
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  // Payment details
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';
  // UPI-specific
  upiTransactionRef?: string;
  vpa?: string; // UPI Virtual Payment Address (e.g., user@upi)
  // Merchant/payee info
  merchant: string;
  merchantCategory?: string;
  description?: string;
  // Linked records
  transactionId?: mongoose.Types.ObjectId; // Link to auto-created Transaction
  familyId?: mongoose.Types.ObjectId;
  // AI categorization
  aiCategory?: string;
  aiConfidence?: number;
  categoryOverridden?: boolean;
  // Metadata
  method?: string; // upi, card, netbanking etc.
  bank?: string;
  wallet?: string;
  email?: string;
  contact?: string;
  notes?: Record<string, string>;
  // Webhook tracking
  webhookReceivedAt?: Date;
  webhookVerified?: boolean;
  // Timestamps
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const upiPaymentSchema = new Schema<IUpiPayment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    razorpaySignature: {
      type: String,
      select: false, // Don't return in queries for security
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least ₹1'],
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR'],
    },
    status: {
      type: String,
      required: true,
      enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
      default: 'created',
      index: true,
    },
    upiTransactionRef: {
      type: String,
      sparse: true,
    },
    vpa: {
      type: String,
      trim: true,
    },
    merchant: {
      type: String,
      required: [true, 'Merchant name is required'],
      trim: true,
      maxlength: 200,
    },
    merchantCategory: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    familyId: {
      type: Schema.Types.ObjectId,
      ref: 'Family',
    },
    aiCategory: {
      type: String,
      trim: true,
    },
    aiConfidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    categoryOverridden: {
      type: Boolean,
      default: false,
    },
    method: {
      type: String,
      trim: true,
    },
    bank: String,
    wallet: String,
    email: String,
    contact: String,
    notes: {
      type: Schema.Types.Mixed,
    },
    webhookReceivedAt: Date,
    webhookVerified: {
      type: Boolean,
      default: false,
    },
    paidAt: Date,
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
upiPaymentSchema.index({ user: 1, status: 1, createdAt: -1 });
upiPaymentSchema.index({ user: 1, paidAt: -1 });

// Prevent duplicate transaction processing
upiPaymentSchema.index(
  { razorpayPaymentId: 1, status: 1 },
  { sparse: true }
);

export const UpiPayment = mongoose.model<IUpiPayment>('UpiPayment', upiPaymentSchema);
export default UpiPayment;
