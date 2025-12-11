import { Router } from 'express';
import { body } from 'express-validator';
import {
  getReminders,
  getReminder,
  createReminder,
  updateReminder,
  markReminderPaid,
  deleteReminder,
} from '../controllers/reminderController';
import { protect } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);

// Validation rules
const reminderValidation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom((value) => value > 0)
    .withMessage('Amount must be greater than 0'),
  body('dueDate')
    .notEmpty()
    .withMessage('Due date is required')
    .isISO8601()
    .withMessage('Invalid date format'),
  body('type')
    .optional()
    .isIn(['bill', 'loan', 'subscription'])
    .withMessage('Type must be bill, loan, or subscription'),
  body('recurring').optional().isBoolean().withMessage('Recurring must be true or false'),
  body('recurringPeriod')
    .optional()
    .isIn(['monthly', 'quarterly', 'yearly'])
    .withMessage('Invalid recurring period'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

// Routes
router.get('/', getReminders);
router.get('/:id', getReminder);
router.post('/', reminderValidation, createReminder);
router.put('/:id', updateReminder);
router.patch('/:id/pay', markReminderPaid);
router.delete('/:id', deleteReminder);

export default router;
