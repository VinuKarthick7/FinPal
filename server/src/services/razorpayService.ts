/**
 * Razorpay Payment Gateway Service
 * Handles order creation, payment verification, and webhook signature validation
 */
import Razorpay from 'razorpay';
import crypto from 'crypto';
import config from '../config';

// Lazy-initialize Razorpay instance
let razorpayInstance: InstanceType<typeof Razorpay> | null = null;

function getRazorpay(): InstanceType<typeof Razorpay> {
  if (!razorpayInstance) {
    if (!config.razorpayKeyId || !config.razorpayKeySecret) {
      throw new Error(
        'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment.'
      );
    }
    razorpayInstance = new Razorpay({
      key_id: config.razorpayKeyId,
      key_secret: config.razorpayKeySecret,
    });
  }
  return razorpayInstance;
}

export function isRazorpayConfigured(): boolean {
  return !!(config.razorpayKeyId && config.razorpayKeySecret);
}

/**
 * Create a Razorpay order for UPI payment
 */
export async function createOrder(params: {
  amount: number; // in rupees
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}> {
  const rzp = getRazorpay();
  const order = await rzp.orders.create({
    amount: Math.round(params.amount * 100), // Razorpay expects paise
    currency: params.currency || 'INR',
    receipt: params.receipt,
    notes: params.notes || {},
    payment_capture: true, // Auto-capture
  });
  return {
    id: order.id,
    amount: order.amount as number,
    currency: order.currency,
    receipt: order.receipt || params.receipt,
    status: order.status,
  };
}

/**
 * Verify Razorpay payment signature (after client-side payment)
 */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const body = params.razorpayOrderId + '|' + params.razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpayKeySecret)
    .update(body)
    .digest('hex');
  return expectedSignature === params.razorpaySignature;
}

/**
 * Verify Razorpay webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  if (!config.razorpayWebhookSecret) {
    console.warn('⚠️ Razorpay webhook secret not configured');
    return false;
  }
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpayWebhookSecret)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
}

/**
 * Fetch payment details from Razorpay
 */
export async function fetchPayment(paymentId: string) {
  const rzp = getRazorpay();
  return rzp.payments.fetch(paymentId);
}

/**
 * Fetch order details from Razorpay
 */
export async function fetchOrder(orderId: string) {
  const rzp = getRazorpay();
  return rzp.orders.fetch(orderId);
}

/**
 * Issue refund for a payment
 */
export async function refundPayment(paymentId: string, amount?: number) {
  const rzp = getRazorpay();
  const refundParams: Record<string, unknown> = {};
  if (amount) {
    refundParams.amount = Math.round(amount * 100); // paise
  }
  return rzp.payments.refund(paymentId, refundParams);
}

export default {
  isRazorpayConfigured,
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPayment,
  fetchOrder,
  refundPayment,
};
