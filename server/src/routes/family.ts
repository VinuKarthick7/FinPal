import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  getMyFamily,
  createFamily,
  joinFamily,
  inviteMember,
  updateMember,
  removeMember,
  leaveFamily,
  updateFamily,
  getFamilyDashboard,
  getMemberExpenses,
  regenerateFamilyCode,
} from '../controllers/familyController';

const router = Router();

// All routes require authentication
router.use(protect);

// Get user's family
router.get('/', getMyFamily);

// Get family dashboard with all data
router.get('/dashboard', getFamilyDashboard);

// Create a new family
router.post('/create', createFamily);

// Join a family using 6-digit code
router.post('/join', joinFamily);

// Update family settings
router.put('/update', updateFamily);

// Leave family
router.post('/leave', leaveFamily);

// Regenerate family code
router.post('/regenerate-code', regenerateFamilyCode);

// Member management
router.post('/invite', inviteMember);
router.put('/members/:memberId', updateMember);
router.delete('/members/:memberId', removeMember);

// Get member expenses
router.get('/members/:memberId/expenses', getMemberExpenses);

export default router;
