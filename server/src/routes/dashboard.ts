import { Router } from 'express';
import {
  getDashboardStats,
  getCategoryBreakdown,
  getBudgetProgress,
  updateBudget,
} from '../controllers/dashboardController';
import { protect } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);

// Routes
router.get('/stats', getDashboardStats);
router.get('/categories', getCategoryBreakdown);
router.get('/budget', getBudgetProgress);
router.put('/budget', updateBudget);

export default router;
