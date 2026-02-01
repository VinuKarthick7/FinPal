import { Router, RequestHandler } from 'express';
import { sendMessage, getChatContext } from '../controllers/chatbotController';
import { protect } from '../middleware/auth';

const router = Router();

// All chatbot routes require authentication
router.use(protect);

// POST /api/chatbot/message - Send a message to FinMate
router.post('/message', sendMessage as RequestHandler);

// GET /api/chatbot/context - Get chat context for initializing the chat
router.get('/context', getChatContext as RequestHandler);

export default router;
