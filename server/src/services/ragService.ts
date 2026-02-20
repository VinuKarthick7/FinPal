/**
 * RAG Service for FinMate
 * 
 * Handles Retrieval-Augmented Generation using OpenAI
 */

import OpenAI from 'openai';
import { 
    createFinancialDataChunks, 
    embedFinancialData, 
    findRelevantChunks,
    FinancialDataChunk 
} from './embeddingService';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const LLM_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// System prompt for FinMate
const SYSTEM_PROMPT = `You are FinMate, a friendly and helpful financial assistant for the FinPal app.

Your Role:
- Help users understand their budget, spending, and financial habits
- Provide personalized insights based on their real financial data
- Encourage good money habits and responsible spending
- Be supportive and non-judgmental, especially about overspending

Communication Style:
- Use simple, clear language (avoid financial jargon)
- Keep responses concise (2-4 short paragraphs max)
- Be encouraging and positive
- Use emojis sparingly to add warmth (💰 🎯 💪 ⭐ 📊)
- Format numbers in Indian currency: ₹X,XXX

Important Rules:
- ONLY use information from the provided context
- If you don't have data to answer a question, politely guide the user to add it in the app
- Never make up or estimate financial figures
- Always base advice on the user's actual spending patterns
- Focus on actionable next steps

When discussing money:
- Be specific with amounts from their data
- Compare to their budget when relevant
- Highlight trends in their spending
- Suggest practical ways to improve

Remember: Your goal is to help users make better financial decisions through awareness and encouragement, not to lecture or judge them.`;

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface RAGResponse {
    reply: string;
    relevantContext: string[];
    tokensUsed?: number;
}

/**
 * Generate a response using RAG
 */
export async function generateRAGResponse(
    userMessage: string,
    userData: any,
    userName: string,
    conversationHistory: ChatMessage[] = []
): Promise<RAGResponse> {
    try {
        // Step 1: Create and embed financial data chunks
        const dataChunks = createFinancialDataChunks(userData);
        const embeddedChunks = await embedFinancialData(dataChunks);

        // Step 2: Find relevant context for the user's query
        const relevantChunks = await findRelevantChunks(userMessage, embeddedChunks, 5);

        // Step 3: Build context string
        const contextString = relevantChunks
            .map((chunk, idx) => `[Context ${idx + 1}]\n${chunk.content}`)
            .join('\n\n');

        // Step 4: Construct the prompt with context
        const userPromptWithContext = `User's Name: ${userName}

Current Financial Data:
${contextString}

User's Question: ${userMessage}

Please provide a helpful response based on the user's actual financial data shown above.`;

        // Step 5: Build messages for OpenAI
        const messages: ChatMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...conversationHistory.slice(-6), // Keep last 3 exchanges for context
            { role: 'user', content: userPromptWithContext }
        ];

        // Step 6: Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: LLM_MODEL,
            messages: messages as any,
            temperature: 0.7,
            max_tokens: 500,
            presence_penalty: 0.1,
            frequency_penalty: 0.1,
        });

        const reply = completion.choices[0]?.message?.content || 
            "I'm sorry, I couldn't generate a response. Please try again.";

        return {
            reply,
            relevantContext: relevantChunks.map(c => c.content),
            tokensUsed: completion.usage?.total_tokens,
        };
    } catch (error) {
        console.error('RAG Error:', error);
        throw error;
    }
}

/**
 * Generate a welcome message based on user's financial status
 */
export async function generateWelcomeMessage(
    userData: any,
    userName: string
): Promise<string> {
    try {
        // Create context about user's current status
        const statusContext = [];

        if (userData.budget) {
            if (userData.budget.isOverBudget) {
                statusContext.push(`User has exceeded their monthly budget by ₹${Math.abs(userData.budget.remaining).toLocaleString('en-IN')}`);
            } else {
                statusContext.push(`User has ₹${userData.budget.remaining.toLocaleString('en-IN')} remaining in their budget (${100 - userData.budget.percentage}% left)`);
            }
        } else {
            statusContext.push('User has not set a budget yet');
        }

        if (userData.daysLeft !== undefined) {
            statusContext.push(`${userData.daysLeft} days left in the current month`);
        }

        if (userData.achievements) {
            statusContext.push(`User has earned ${userData.achievements.totalStars} achievement stars`);
        }

        const contextString = statusContext.join('. ');

        const messages: ChatMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            { 
                role: 'user', 
                content: `Generate a brief, friendly welcome message for ${userName}. Context: ${contextString}. Keep it to 2-3 short sentences.` 
            }
        ];

        const completion = await openai.chat.completions.create({
            model: LLM_MODEL,
            messages: messages as any,
            temperature: 0.8,
            max_tokens: 150,
        });

        return completion.choices[0]?.message?.content || 
            `Hi ${userName}! 👋 I'm FinMate, your personal financial assistant. How can I help you with your finances today?`;
    } catch (error) {
        console.error('Welcome message generation error:', error);
        return `Hi ${userName}! 👋 I'm FinMate, your personal financial assistant. How can I help you with your finances today?`;
    }
}

/**
 * Validate OpenAI API configuration
 */
export function validateOpenAIConfig(): boolean {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
        console.error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.');
        return false;
    }
    return true;
}
