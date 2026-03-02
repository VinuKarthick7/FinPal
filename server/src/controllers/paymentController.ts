/**
 * UPI Payment Controller
 * Handles: order creation, payment verification, webhook processing,
 * payment history, UPI spending summary, and smart insights
 */
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { UpiPayment } from '../models/UpiPayment';
import { Transaction } from '../models/Transaction';
import {
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPayment,
  isRazorpayConfigured,
} from '../services/razorpayService';
import {
  processPaymentToExpense,
  getUpiSpendingSummary,
} from '../services/autoExpenseEngine';
import { categorizeTransaction } from '../services/aiCategorizationService';
import { generateSmartInsights } from '../services/smartBudgetIntelligence';
import config from '../config';

/**
 * POST /api/payments/create-order
 * Create a Razorpay order for UPI payment
 */
export const createPaymentOrder = async (req: Request, res: Response) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(501).json({
        success: false,
        message:
          'UPI payments are not configured. Please add Razorpay credentials.',
      });
    }

    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { amount, merchant, description, notes } = req.body;

    if (!amount || amount < 1) {
      return res
        .status(400)
        .json({ success: false, message: 'Amount must be at least ₹1' });
    }
    if (!merchant) {
      return res
        .status(400)
        .json({ success: false, message: 'Merchant name is required' });
    }

    // Generate unique receipt ID
    const receipt = `finpal_${userId.slice(-6)}_${Date.now()}`;

    // Create Razorpay order
    const order = await createOrder({
      amount,
      receipt,
      notes: {
        userId,
        merchant,
        description: description || '',
        ...notes,
      },
    });

    // Store the order in our database
    const upiPayment = await UpiPayment.create({
      user: new mongoose.Types.ObjectId(userId),
      razorpayOrderId: order.id,
      amount,
      merchant,
      description,
      notes,
      status: 'created',
    });

    return res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount, // in paise
        amountInRupees: amount,
        currency: order.currency,
        keyId: config.razorpayKeyId, // Client needs this for checkout
        merchant,
        paymentId: upiPayment._id,
      },
    });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
    });
  }
};

/**
 * POST /api/payments/verify
 * Verify payment after client-side completion
 */
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification parameters',
      });
    }

    // Verify signature
    const isValid = verifyPaymentSignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    if (!isValid) {
      // Mark payment as failed
      await UpiPayment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id, user: userId },
        { status: 'failed' }
      );
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed — invalid signature',
      });
    }

    // Fetch payment details from Razorpay
    const paymentDetails = await fetchPayment(razorpay_payment_id);

    // Find our stored order
    const upiPayment = await UpiPayment.findOne({
      razorpayOrderId: razorpay_order_id,
      user: userId,
    });

    if (!upiPayment) {
      return res.status(404).json({
        success: false,
        message: 'Payment order not found',
      });
    }

    // Process the payment → auto-create expense
    const result = await processPaymentToExpense({
      userId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amount: upiPayment.amount,
      merchant: upiPayment.merchant,
      description: upiPayment.description,
      notes: upiPayment.notes,
      method: (paymentDetails as any).method,
      vpa: (paymentDetails as any).vpa,
      email: (paymentDetails as any).email,
      contact: (paymentDetails as any).contact,
      bank: (paymentDetails as any).bank,
      wallet: (paymentDetails as any).wallet,
      paidAt: new Date(),
    });

    // Store signature (encrypted field)
    await UpiPayment.findByIdAndUpdate(upiPayment._id, {
      razorpaySignature: razorpay_signature,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Payment processing failed',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and expense recorded automatically',
      data: {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: upiPayment.amount,
        category: result.category,
        transactionId: result.transaction?._id,
        budgetAlert: result.budgetAlert,
      },
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment verification failed',
    });
  }
};

/**
 * POST /api/payments/webhook
 * Razorpay webhook handler (no auth — verified by signature)
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);

    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing signature' });
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.warn('⚠️ Invalid webhook signature received');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`📩 Webhook received: ${event}`);

    switch (event) {
      case 'payment.captured': {
        const payment = payload.payment?.entity;
        if (!payment) break;

        const orderId = payment.order_id;
        const paymentId = payment.id;

        // Find the stored order
        const upiPayment = await UpiPayment.findOne({
          razorpayOrderId: orderId,
        });

        if (!upiPayment) {
          console.warn(`⚠️ Webhook: No order found for ${orderId}`);
          break;
        }

        // Skip if already processed
        if (upiPayment.status === 'captured') {
          console.log(`ℹ️ Payment ${paymentId} already processed`);
          break;
        }

        // Process payment → auto-create expense
        await processPaymentToExpense({
          userId: upiPayment.user.toString(),
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          amount: upiPayment.amount,
          merchant: upiPayment.merchant,
          description: upiPayment.description,
          notes: payment.notes || upiPayment.notes,
          method: payment.method,
          vpa: payment.vpa,
          email: payment.email,
          contact: payment.contact,
          bank: payment.bank,
          wallet: payment.wallet,
          paidAt: payment.created_at
            ? new Date(payment.created_at * 1000)
            : new Date(),
        });

        break;
      }

      case 'payment.failed': {
        const payment = payload.payment?.entity;
        if (payment?.order_id) {
          await UpiPayment.findOneAndUpdate(
            { razorpayOrderId: payment.order_id },
            {
              status: 'failed',
              razorpayPaymentId: payment.id,
              webhookReceivedAt: new Date(),
              webhookVerified: true,
            }
          );
        }
        break;
      }

      case 'refund.created':
      case 'refund.processed': {
        const refund = payload.refund?.entity;
        if (refund?.payment_id) {
          await UpiPayment.findOneAndUpdate(
            { razorpayPaymentId: refund.payment_id },
            { status: 'refunded' }
          );
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled webhook event: ${event}`);
    }

    // Always return 200 to Razorpay
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to prevent Razorpay retries for processing errors
    return res.status(200).json({ success: true });
  }
};

/**
 * GET /api/payments/history
 * Get user's UPI payment history
 */
export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string;

    const filter: Record<string, any> = {
      user: new mongoose.Types.ObjectId(userId),
    };
    if (status) filter.status = status;

    const [payments, total] = await Promise.all([
      UpiPayment.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-razorpaySignature')
        .populate('transactionId', 'category amount date'),
      UpiPayment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Payment history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
    });
  }
};

/**
 * GET /api/payments/summary
 * Get UPI spending summary for current/specified month
 */
export const getPaymentSummary = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const month = parseInt(req.query.month as string) || undefined;
    const year = parseInt(req.query.year as string) || undefined;

    const summary = await getUpiSpendingSummary(userId, month, year);

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Payment summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment summary',
    });
  }
};

/**
 * GET /api/payments/insights
 * Get smart budget intelligence insights
 */
export const getSmartInsights = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const insights = await generateSmartInsights(userId);

    return res.status(200).json({
      success: true,
      data: { insights },
    });
  } catch (error) {
    console.error('Smart insights error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate insights',
    });
  }
};

/**
 * POST /api/payments/categorize
 * AI categorize a merchant/description
 */
export const categorizePayment = async (req: Request, res: Response) => {
  try {
    const { merchant, description, notes, amount } = req.body;

    if (!merchant) {
      return res
        .status(400)
        .json({ success: false, message: 'Merchant name is required' });
    }

    const result = await categorizeTransaction({
      merchant,
      description,
      notes,
      amount,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Categorize payment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to categorize payment',
    });
  }
};

/**
 * PATCH /api/payments/:id/category
 * Override the AI category for a payment
 */
export const overrideCategory = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { category } = req.body;

    if (!category) {
      return res
        .status(400)
        .json({ success: false, message: 'Category is required' });
    }

    const payment = await UpiPayment.findOneAndUpdate(
      { _id: id, user: userId },
      {
        aiCategory: category,
        categoryOverridden: true,
      },
      { new: true }
    ).select('-razorpaySignature');

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: 'Payment not found' });
    }

    // Also update the linked transaction category
    if (payment.transactionId) {
      await Transaction.findByIdAndUpdate(payment.transactionId, {
        category,
      });
    }

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Override category error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update category',
    });
  }
};

/**
 * GET /api/payments/config
 * Check if Razorpay/UPI is configured (for frontend conditional rendering)
 */
export const getPaymentConfig = async (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    data: {
      upiEnabled: isRazorpayConfigured(),
      keyId: isRazorpayConfigured() ? config.razorpayKeyId : null,
    },
  });
};
