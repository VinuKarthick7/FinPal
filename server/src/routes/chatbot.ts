import { Router, RequestHandler } from 'express';
import { sendMessage, getChatContext, clearHistory } from '../controllers/chatbotController';
import { protect } from '../middleware/auth';

const router = Router();

// All chatbot routes require authentication
router.use(protect);

// POST  /api/chatbot/message  — Send a message to FinMate
router.post('/message', sendMessage as RequestHandler);

// GET   /api/chatbot/context  — Initialise chat & get personalised welcome
router.get('/context', getChatContext as RequestHandler);

// DELETE /api/chatbot/history — Clear conversation history (new chat session)
router.delete('/history', clearHistory as RequestHandler);

export default router;
