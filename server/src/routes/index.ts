import { Router } from 'express';
import authRoutes from './auth';
import transactionRoutes from './transactions';
import reminderRoutes from './reminders';
import dashboardRoutes from './dashboard';
import profileRoutes from './profile';
import budgetRoutes from './budgets';
import reportsRoutes from './reports';
import expenseRoutes from './expenses';
import insightsRoutes from './insights';
import familyRoutes from './family';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FinPal API is running',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/transactions', transactionRoutes);
router.use('/reminders', reminderRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/profile', profileRoutes);
router.use('/budgets', budgetRoutes);
router.use('/reports', reportsRoutes);
router.use('/expenses', expenseRoutes);
router.use('/insights', insightsRoutes);
router.use('/family', familyRoutes);

export default router;
