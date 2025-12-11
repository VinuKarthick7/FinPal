import { Router } from 'express';
import { body } from 'express-validator';
import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../controllers/transactionController';
import { protect } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);

// Validation rules
const transactionValidation = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom((value) => value > 0)
    .withMessage('Amount must be greater than 0'),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn([
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
    ])
    .withMessage('Invalid category'),
  body('merchant')
    .notEmpty()
    .withMessage('Merchant/Description is required')
    .trim()
    .isLength({ max: 100 })
    .withMessage('Merchant name cannot exceed 100 characters'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  body('type')
    .optional()
    .isIn(['expense', 'income'])
    .withMessage('Type must be expense or income'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'upi', 'card', 'netbanking', 'other'])
    .withMessage('Invalid payment method'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

// Routes
router.get('/', getTransactions);
router.get('/:id', getTransaction);
router.post('/', transactionValidation, createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
