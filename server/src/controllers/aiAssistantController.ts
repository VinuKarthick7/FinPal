import { Request, Response } from 'express';
import User from '../models/User';
import { generateFinancialSummary } from '../utils/summaryGenerator';
import { generateAIInsights } from '../utils/ai';

/**
 * Handles AI assistant questions
 */
export const askAIAssistant = async (req: Request, res: Response) => {
  try {
    // Feature disabled: AI integration removed
    if (!process.env.OPENAI_API_KEY) {
      return res.status(410).json({ success: false, message: 'AI integration has been removed.' });
    }

    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }

    // Get userId from backend auth only
    let userId: string | undefined = undefined;
    if (req.user && typeof req.user === 'object' && req.user !== null && 'id' in req.user && typeof (req.user as any).id === 'string') {
      userId = (req.user as any).id;
    }
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Check AI consent
    const user = await User.findById(userId);
    if (!user || !user.aiConsent) {
      return res.status(403).json({ success: false, message: 'AI consent required' });
    }

    // Generate summary
    const summary = await generateFinancialSummary(userId);

    // Generate AI insights
    const insights = await generateAIInsights(question, summary);

    res.json({
      success: true,
      question,
      insights,
    });
  } catch (error: any) {
    // Improved error logging
    console.error('AI Assistant error:', error?.response?.data || error?.message || error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate insights',
    });
  }
};
/**
 * Updates AI consent for user
 */
export const updateAIConsent = async (req: Request, res: Response) => {
  try {
    // Feature disabled: AI integration removed
    if (!process.env.OPENAI_API_KEY) {
      return res.status(410).json({ success: false, message: 'AI integration has been removed.' });
    }

    const { consent } = req.body;
    if (typeof consent !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Consent must be boolean' });
    }

    // Get userId from backend auth only
    let userId: string | undefined = undefined;
    if (req.user && typeof req.user === 'object' && req.user !== null && 'id' in req.user && typeof (req.user as any).id === 'string') {
      userId = (req.user as any).id;
    }
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    await User.findByIdAndUpdate(userId, { aiConsent: consent });

    res.json({
      success: true,
      message: 'AI consent updated',
    });
  } catch (error) {
    console.error('Update AI consent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update consent',
    });
  }
};