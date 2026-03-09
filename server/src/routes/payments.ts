/**
 * UPI Payment Routes
 * Endpoints for Razorpay UPI integration, payment verification,
 * webhook handling, and smart insights
 */
import { Router } from 'express';
import { body, query } from 'express-validator';
import { protect } from '../middleware/auth';
import {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  getPaymentHistory,
  getPaymentSummary,
  getSmartInsights,
  categorizePayment,
  overrideCategory,
  getPaymentConfig,
  recategorizePayments,
  requestMoney,
  verifyBankAccount,
  bankTransfer,
} from '../controllers/paymentController';

const router = Router();

// ─── PUBLIC ROUTES ───────────────────────────────────────────
// Webhook (no auth — verified by Razorpay signature)
router.post('/webhook', handleWebhook);

// Payment config check (public so login page can show/hide UPI button)
router.get('/config', getPaymentConfig);

// ─── PROTECTED ROUTES ────────────────────────────────────────
// All below routes require JWT authentication

// Create a new UPI payment order
router.post(
  '/create-order',
  protect,
  [
    body('amount')
      .isFloat({ min: 1 })
      .withMessage('Amount must be at least ₹1'),
    body('merchant')
      .trim()
      .notEmpty()
      .withMessage('Merchant name is required')
      .isLength({ max: 200 })
      .withMessage('Merchant name too long'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }),
  ],
  createPaymentOrder
);

// Verify payment after client-side Razorpay checkout
router.post(
  '/verify',
  protect,
  [
    body('razorpay_order_id').notEmpty().withMessage('Order ID is required'),
    body('razorpay_payment_id').notEmpty().withMessage('Payment ID is required'),
    body('razorpay_signature').notEmpty().withMessage('Signature is required'),
  ],
  verifyPayment
);

// Payment history
router.get(
  '/history',
  protect,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status')
      .optional()
      .isIn(['created', 'authorized', 'captured', 'failed', 'refunded']),
  ],
  getPaymentHistory
);

// UPI spending summary
router.get(
  '/summary',
  protect,
  [
    query('month').optional().isInt({ min: 1, max: 12 }),
    query('year').optional().isInt({ min: 2020 }),
  ],
  getPaymentSummary
);

// Smart budget insights
router.get('/insights', protect, getSmartInsights);

// AI categorize a merchant
router.post(
  '/categorize',
  protect,
  [
    body('merchant').trim().notEmpty().withMessage('Merchant name is required'),
    body('description').optional().trim(),
    body('notes').optional().trim(),
    body('amount').optional().isFloat({ min: 0 }),
  ],
  categorizePayment
);

// Override AI category for a payment
router.patch(
  '/:id/category',
  protect,
  [body('category').trim().notEmpty().withMessage('Category is required')],
  overrideCategory
);

// Recategorize existing payments (fix miscategorized payments)
router.post(
  '/recategorize',
  protect,
  [body('forceAll').optional().isBoolean()],
  recategorizePayments
);

// Request money (UPI collect)
router.post(
  '/request-money',
  protect,
  [
    body('contactName').trim().notEmpty().withMessage('Contact name is required'),
    body('contactUpiId').trim().notEmpty().withMessage('Contact UPI ID is required'),
    body('contactPhone').trim().notEmpty().withMessage('Contact phone is required'),
    body('amount').isFloat({ min: 1, max: 100000 }).withMessage('Amount must be between ₹1 and ₹1,00,000'),
    body('note').optional().trim().isLength({ max: 200 }),
  ],
  requestMoney
);

// Verify bank account
router.post(
  '/verify-bank-account',
  protect,
  [
    body('accountNumber')
      .trim()
      .notEmpty()
      .withMessage('Account number is required')
      .isLength({ min: 9, max: 18 })
      .withMessage('Invalid account number'),
    body('ifscCode')
      .trim()
      .notEmpty()
      .withMessage('IFSC code is required')
      .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/i)
      .withMessage('Invalid IFSC code'),
    body('holderName').trim().notEmpty().withMessage('Account holder name is required'),
  ],
  verifyBankAccount
);

// Bank transfer
router.post(
  '/bank-transfer',
  protect,
  [
    body('holderName').trim().notEmpty().withMessage('Account holder name is required'),
    body('accountNumber')
      .trim()
      .notEmpty()
      .withMessage('Account number is required')
      .isLength({ min: 9, max: 18 }),
    body('ifscCode')
      .trim()
      .notEmpty()
      .withMessage('IFSC code is required')
      .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/i),
    body('bankName').trim().notEmpty().withMessage('Bank name is required'),
    body('amount').isFloat({ min: 1, max: 200000 }).withMessage('Amount must be between ₹1 and ₹2,00,000'),
    body('note').optional().trim().isLength({ max: 200 }),
  ],
  bankTransfer
);

export default router;
