import express from 'express';
import {
  getUserAchievements,
  checkMonthlyBudget,
  finalizeMonthlyAchievements,
  getAchievementStats,
} from '../controllers/achievementController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user's achievements
router.get('/', getUserAchievements);

// Get achievement statistics
router.get('/stats', getAchievementStats);

// Check current month's budget performance
router.post('/check', checkMonthlyBudget);

// Finalize achievements (admin/system route - called by scheduler)
router.post('/finalize', finalizeMonthlyAchievements);

export default router;
