import { Router } from 'express';
import { categorizeExpense } from '../controllers/expenseController';

const router = Router();

// Route to categorize expenses
router.post('/categorize', categorizeExpense);

export default router;