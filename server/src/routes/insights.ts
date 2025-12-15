import { Router } from 'express';
import { getMonthlyInsights } from '../controllers/insightsController';

const router = Router();

router.get('/monthly', getMonthlyInsights);

export default router;
