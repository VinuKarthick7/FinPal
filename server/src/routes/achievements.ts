import express from 'express';
import {
  getUserAchievements,
  checkMonthlyBudget,
  finalizeMonthlyAchievements,
  getAchievementStats,
  checkSuccessAnnouncement,
  markPopupShown,
  validateAndCleanAchievements,
  deleteInvalidAchievements,
} from '../controllers/achievementController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user's achievements
router.get('/', getUserAchievements);

// Get achievement statistics
router.get('/stats', getAchievementStats);

// Check if user should see success announcement
router.get('/announcement', checkSuccessAnnouncement);

// Mark reward popup as shown
router.post('/popup-shown', markPopupShown);

// Check current month's budget performance
router.post('/check', checkMonthlyBudget);

// Finalize achievements (admin/system route - called by scheduler)
router.post('/finalize', finalizeMonthlyAchievements);

// Validate achievements (debugging/admin utility)
router.get('/validate', validateAndCleanAchievements);

// Clean invalid achievements (debugging/admin utility)
router.delete('/clean', deleteInvalidAchievements);

export default router;
