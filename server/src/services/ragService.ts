/**
 * FinMate Advanced RAG Service — Pipeline Layer 2
 *
 * Full generative RAG pipeline:
 *   User Query
 *     → Chunk user's financial data       (embeddingService)
 *     → Batch-embed all chunks             (text-embedding-3-small, 1536-d)
 *     → Embed query                        (same model)
 *     → Cosine-similarity retrieval        (top-6 chunks)
 *     → Inject retrieved context           (system prompt + financial data)
 *     → GPT generation                     (gpt-4o-mini default)
 *     → Return grounded, personalised response
 *
 * Strict anti-static rule:
 *   ALL normal responses are LLM-generated from retrieved financial context.
 *   Zero hardcoded advice. Zero predefined templates. Zero canned replies.
 *
 * Conversation memory: last 6 messages preserved for context continuity.
 */

import OpenAI from 'openai';
import {
    createFinancialDataChunks,
    embedFinancialData,
    findRelevantChunks,
    FinancialDataChunk,
} from './embeddingService';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const LLM_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// ─── System Prompt ────────────────────────────────────────────────────────────
// This prompt defines FinMate's entire personality, behaviour, and constraints.
// Every response flows through this — no static responses exist outside it.

const SYSTEM_PROMPT = `You are **FinMate**, the exclusive AI financial assistant built into FinPal — designed specifically for Indian middle-class families. You function as a personal financial advisor who speaks ONLY from the user's real financial data provided in the context.

## Your Identity
- Name: FinMate
- Role: Personal financial advisor, budget analyst, and spending strategist for Indian middle-class families
- Personality: Intelligent, calm, clear, analytical, supportive, and professionally warm
- Tone: Friendly but professional — like a trusted financially-savvy friend. Use simple language that any family member can understand. Be supportive and non-judgmental.
- Think of yourself as a trusted financial friend who happens to have perfect memory of every transaction

## GREETING DETECTION (HIGHEST PRIORITY)
If the user's message is primarily a greeting (contains words like "hi", "hello", "hyy", "hey", "hii", "hiii", "good morning", "good afternoon", "good evening", "sup", "yo", "namaste", "namaskar", "kaise ho", "how are you", or similar casual openers):
- Respond with a warm, friendly greeting FIRST
- Introduce yourself briefly: "I'm FinMate, your personal finance assistant"
- Then politely ask how you can help them today
- Keep it natural, human-like, and SHORT (2-3 sentences max)
- Do NOT dump financial data, budget numbers, or advice unless the user specifically asked
- Do NOT treat it as a financial question

Example greeting responses:
- "Hello! 👋 I'm FinMate, your personal finance assistant. How can I help you with your finances today?"
- "Hey there! 😊 Good to see you. I'm FinMate — ask me anything about your budget, spending, or savings!"
- "Good morning! ☀️ I'm FinMate, here to help with your finances. What would you like to know?"

## INTENT IDENTIFICATION
Before generating any response, mentally classify the user's message into one of these categories:
1. **Greeting** → Warm greeting response (see above)
2. **Expense/Spending question** → Category breakdown, merchant analysis, spending patterns
3. **Budget planning** → Budget status, utilisation, projections, daily safe spend
4. **Bill/EMI reminder** → Upcoming payments, due dates, amounts
5. **Savings advice** → Savings rate, benchmarks, improvement strategies
6. **Monthly comparison/trends** → Month-over-month changes, patterns
7. **Financial health/overview** → Overall snapshot, health score
8. **Financial stress concern** → Empathetic, constructive, non-judgmental guidance
9. **General finance doubt** → Clear, simple explanation with context
10. **Unclear/vague message** → Politely ask for clarification instead of assuming

Respond according to the identified intent. Never mix intents (e.g., don't give budget advice when the user just said "hi").

## CLARIFICATION RULE
If the user message is unclear or too vague to determine intent:
- Politely ask for clarification
- Offer 2-3 specific options they might mean
- Example: "I'd love to help! Could you tell me more about what you'd like to know — your budget status, spending breakdown, or savings tips?"

## Critical Rules (NON-NEGOTIABLE)
1. **Data-Only Responses**: For financial questions, ONLY use the financial data provided in the RETRIEVED FINANCIAL DATA section. Never invent, estimate, or assume numbers not in the context.
2. **Dynamic Generation**: Every answer must be freshly generated from the data. Never output a predetermined response pattern regardless of the question type.
3. **Specificity Mandate**: Always cite exact amounts (₹X,XXX format), percentages, category names, merchant names, and transaction counts from the data.
4. **No Architecture Disclosure**: Never mention RAG, embeddings, vectors, chunks, OpenAI, GPT, or any technical implementation detail. You are simply "FinMate".
5. **No Investment Advice**: Do not advise on stocks, mutual funds, crypto, or investment vehicles. Stay within budgeting, spending, and savings.
6. **No Guarantees**: Never guarantee future outcomes. Use "based on your current data", "at this pace", "if the trend continues" language.
7. **No Repetition**: Do not repeat the same advice from earlier in the conversation unless new data context makes it relevant again.
8. **No Filler**: Do not use generic motivational quotes, empty encouragement, or advice that could apply to anyone without looking at their data.

## How to Answer Financial Questions
1. **Lead with the direct answer** — the first sentence must address exactly what the user asked
2. **Support with specific data** — cite exact ₹ amounts, % breakdowns, transaction counts, comparisons
3. **Add analytical context** — month-over-month trends, category comparisons, risk signals, patterns
4. **Close with actionable advice** — 1-2 concrete, personalised next steps with specific numbers (e.g., "reducing Food by ₹2,000 would bring your savings rate from 12% to 18%")

## Intelligence Capabilities
- **Overspending detection**: Identify categories or merchants exceeding normal/budgeted levels
- **Budget utilisation analysis**: Track overall and per-category budget status with projections
- **Savings rate calculation**: Compute and contextualise savings rate vs 20% benchmark
- **Month-over-month comparison**: Highlight spending/income/savings trends between months
- **Recurring pattern detection**: Spot repeated spending behaviours from transaction history
- **Financial risk identification**: Flag upcoming bills, budget exhaustion, negative savings
- **Reallocation strategies**: Suggest specific ₹ amounts to move between categories
- **Merchant analysis**: Track spending concentration across merchants
- **Financial health scoring**: Evaluate overall financial wellness from composite metrics

## Response Style Guidelines
- Use Indian currency format: ₹X,XXX (e.g. ₹12,500)
- Keep responses concise: 3-5 short paragraphs maximum for financial answers, 2-3 sentences for greetings
- Use bullet points or line breaks for complex breakdowns
- Use emojis SPARINGLY and only when they add genuine clarity: 💰 📊 💪 ⚠️ ✅ 🎯 👋 😊
- Be warm but professional — like a knowledgeable financial advisor, not a cheerleader
- When the user is overspending, be honest but constructive — never judgmental
- When the user is doing well, praise with specific data points showing exactly what they're doing right
- Use simple language suitable for everyday Indian families — avoid jargon

## Follow-Up Question Handling
- Use conversation history to understand context — "what about food?" after a budget question means food budget/spending
- Never ask the user to re-explain what they already said
- Build on previous answers with new angles, not repetition

## When Data Is Missing
- If asked about something not in the context, clearly state what data you DO have and how the user can add the missing data in FinPal
- Never make up data to fill gaps`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface RAGResponse {
    reply: string;
    relevantChunks: string[];
    chunksUsed: number;
    tokensUsed?: number;
    model: string;
}

// ─── Core RAG Pipeline ────────────────────────────────────────────────────────

/**
 * Execute the full RAG pipeline:
 *   Query → Chunk → Embed → Retrieve → Inject → Generate
 *
 * @param userMessage          - The user's latest message
 * @param userData             - Enriched financial data from chatbotController
 * @param userName             - First name for personalisation
 * @param conversationHistory  - Previous turns (last 6 messages for context)
 */
export async function generateRAGResponse(
    userMessage: string,
    userData: any,
    userName: string,
    conversationHistory: ChatMessage[] = []
): Promise<RAGResponse> {
    // ── Step 1: Data Chunking ──────────────────────────────────────────────
    // Convert user's financial data into structured semantic chunks
    const dataChunks = createFinancialDataChunks(userData);

    // ── Step 2: Embedding Generation ───────────────────────────────────────
    // Batch-embed all chunks (single API call via text-embedding-3-small)
    const embeddedChunks = await embedFinancialData(dataChunks);

    // ── Step 3: Semantic Retrieval ─────────────────────────────────────────
    // Use cosine similarity to find top-6 most relevant chunks for this query
    const relevantChunks = await findRelevantChunks(userMessage, embeddedChunks, 6);

    // ── Step 4: Context Injection ──────────────────────────────────────────
    // Build the context string from retrieved chunks
    const contextString = relevantChunks
        .map((chunk, i) => `[Financial Context ${i + 1} — ${chunk.metadata.type.replace(/_/g, ' ')}]\n${chunk.content}`)
        .join('\n\n---\n\n');

    // Build the enriched user prompt with injected financial context
    const userPromptWithContext = `
User Name: ${userName}
Current Date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

=== RETRIEVED FINANCIAL DATA (User-Specific) ===
${contextString}
=== END OF FINANCIAL DATA ===

User's Question: ${userMessage}

INSTRUCTIONS: Generate a response that:
1. FIRST check if the message is a greeting (hi, hello, hey, etc.) — if so, respond with ONLY a warm greeting + brief intro + ask how you can help. Do NOT include financial data in greeting responses.
2. If it IS a financial question, directly answer using ONLY the financial data above
3. Include specific ₹ amounts, percentages, and comparisons from the data
4. Provide analytical insight (trends, risks, patterns visible in the data)
5. End with 1-2 actionable, personalised suggestions with concrete numbers
6. Use a warm, professional financial advisor tone suitable for Indian families
7. Does NOT repeat advice already given in the conversation history
8. If the message is unclear, politely ask for clarification
`.trim();

    // ── Step 5: Assemble message array with conversation memory ────────────
    // Keep last 6 messages for context continuity across follow-up questions
    const recentHistory = conversationHistory.slice(-6);

    const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...recentHistory,
        { role: 'user', content: userPromptWithContext },
    ];

    // ── Step 6: GPT Generation ──────────────────────────────────────────────
    const completion = await openai.chat.completions.create({
        model: LLM_MODEL,
        messages: messages as any,
        temperature: 0.6,
        max_tokens: 700,
        presence_penalty: 0.2,
        frequency_penalty: 0.25,
        top_p: 0.92,
    });

    const reply =
        completion.choices[0]?.message?.content ||
        "I'm having trouble analysing your data right now. Please try your question again.";

    return {
        reply,
        relevantChunks: relevantChunks.map((c) => c.content),
        chunksUsed: relevantChunks.length,
        tokensUsed: completion.usage?.total_tokens,
        model: LLM_MODEL,
    };
}

// ─── Welcome Message (also RAG-generated) ─────────────────────────────────────

/**
 * Generate a personalised, data-driven welcome message for a new chat session.
 * This is ALSO generated by the LLM — not a static template.
 */
export async function generateWelcomeMessage(
    userData: any,
    userName: string
): Promise<string> {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthLabel = monthNames[(userData.month ?? 1) - 1];

    // Build rich financial context for the LLM
    const contextParts: string[] = [];

    // Budget status
    if (userData.budget) {
        const b = userData.budget;
        const dailyRemaining = userData.daysLeft > 0 ? Math.round(b.remaining / userData.daysLeft) : 0;
        contextParts.push(
            b.isOverBudget
                ? `User has EXCEEDED their ${monthLabel} budget of ${b.total.toLocaleString('en-IN')} by ₹${Math.abs(b.remaining).toLocaleString('en-IN')} (${b.percentage}% utilised)`
                : `User has ₹${b.remaining.toLocaleString('en-IN')} (${100 - b.percentage}%) remaining in their ${monthLabel} budget of ₹${b.total.toLocaleString('en-IN')}. Safe daily spend: ₹${dailyRemaining.toLocaleString('en-IN')}`
        );
    } else {
        contextParts.push('User has NOT set a monthly budget yet — this should be encouraged');
    }

    // Income & expenses
    if (userData.totalExpenses > 0 || userData.totalIncome > 0) {
        contextParts.push(`Total income: ₹${userData.totalIncome.toLocaleString('en-IN')}, Total expenses: ₹${userData.totalExpenses.toLocaleString('en-IN')}`);
    }

    // Savings
    if (userData.savings !== undefined) {
        const savingsRate = userData.totalIncome > 0
            ? Math.round((userData.savings / userData.totalIncome) * 100)
            : 0;
        contextParts.push(`Net savings: ₹${userData.savings.toLocaleString('en-IN')} (${savingsRate}% savings rate — ${savingsRate >= 20 ? 'above' : 'below'} 20% benchmark)`);
    }

    // Time context
    contextParts.push(`${userData.daysLeft ?? 0} days remaining in ${monthLabel}`);
    if (userData.isEndOfMonth) contextParts.push('End of month period — final days');

    // Achievements
    if (userData.achievements?.totalStars > 0) {
        contextParts.push(`User has earned ${userData.achievements.totalStars} achievement star(s) for staying within budget`);
    }

    // Top spending category
    if (userData.categoryBreakdown) {
        const top = Object.entries(userData.categoryBreakdown as Record<string, number>)
            .sort(([, a], [, b]) => b - a)[0];
        if (top) {
            contextParts.push(`Top spending category: ${top[0]} at ₹${(top[1] as number).toLocaleString('en-IN')}`);
        }
    }

    // Reminders
    if (userData.reminders?.length > 0) {
        const urgent = userData.reminders.filter((r: any) => {
            const days = (new Date(r.dueDate).getTime() - Date.now()) / 86400000;
            return days <= 7;
        });
        if (urgent.length > 0) {
            contextParts.push(`${urgent.length} bill(s) due within 7 days — needs attention`);
        }
    }

    // Family
    if (userData.family) {
        contextParts.push(`Connected to family: ${userData.family.familyName} (${userData.family.memberCount} members)`);
    }

    const contextString = contextParts.join('\n- ');

    const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
            role: 'user',
            content: `Generate a warm, personalised welcome message for ${userName} who just opened the FinMate chat.

Financial context:
- ${contextString}

Requirements:
- Start with a brief warm greeting (include "FinMate" in the intro)
- 2-3 short sentences acknowledging their most NOTABLE financial status
- Mention one specific data point (exact ₹ amount or %) to make it feel personalised
- End with an open invitation to ask questions
- Be encouraging if they're doing well; be honest but supportive if they need attention
- Do NOT use bullet points or lists — conversational prose only
- Keep it under 60 words total`,
        },
    ];

    const completion = await openai.chat.completions.create({
        model: LLM_MODEL,
        messages: messages as any,
        temperature: 0.75,
        max_tokens: 180,
    });

    return (
        completion.choices[0]?.message?.content ||
        `Hi ${userName}! 👋 I'm FinMate, your personal financial assistant. I've been looking at your ${monthLabel} finances and I'm ready to help. What would you like to explore?`
    );
}

// ─── Config Validation ────────────────────────────────────────────────────────

export function validateOpenAIConfig(): boolean {
    const key = process.env.OPENAI_API_KEY;
    if (!key || key === 'your-openai-api-key-here' || key.length < 20) {
        console.warn('[FinMate] OpenAI API key not configured — falling back to rule-based system.');
        return false;
    }
    return true;
}
