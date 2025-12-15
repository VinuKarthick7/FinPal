import { Router } from 'express';
import { askAIAssistant, updateAIConsent } from '../controllers/aiAssistantController';
import { protect } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);

router.post('/ask', askAIAssistant);
router.post('/consent', updateAIConsent);

export default router;