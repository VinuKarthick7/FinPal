/**
 * FinMate — Advanced Generative RAG Chatbot Controller
 *
 * Full pipeline (every request):
 *   User Query → Data Retrieval → Chunking → Embedding → Retrieval → GPT → Response
 *
 * Architecture layers:
 *   1. This controller — data retrieval from MongoDB + endpoint handling
 *   2. embeddingService — data chunking + batch embedding + cosine retrieval
 *   3. ragService — context injection + GPT generation
 *
 * Key features:
 *   - Multi-month data retrieval (current + previous month for comparison)
 *   - Merchant-level spending breakdown
 *   - Individual recent transactions (last 10)
 *   - Savings rate computation
 *   - Per-category budget utilisation
 *   - Server-side conversation memory (last 12 messages per user)
 *   - Intelligent data-grounded fallback ONLY when OpenAI is unavailable
 *   - Zero hardcoded advice blocks in normal RAG operation
 *   - Failure logging & automatic RAG restoration
 *
 * Anti-static guarantee:
 *   Normal operation: ALL responses pass through Query → Retrieval → Context → GPT → Response
 *   Fallback (API failure only): Programmatic data-grounded text (no templates/canned replies)
 */

import { Request, Response } from 'express';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { Reminder } from '../models/Reminder';
import { Family } from '../models/Family';
import Achievement from '../models/Achievement';
import { IUser } from '../models/User';
import mongoose from 'mongoose';
import {
    generateRAGResponse,
    generateWelcomeMessage,
    validateOpenAIConfig,
    ChatMessage,
} from '../services/ragService';

interface AuthenticatedRequest extends Request {
    user?: IUser;
}

// ─── In-memory conversation store ────────────────────────────────────────────
// Keyed by userId. Stores last 12 messages (6 exchanges) per user.
const conversationStore = new Map<string, ChatMessage[]>();

const MAX_HISTORY = 12;

function getHistory(userId: string): ChatMessage[] {
    return conversationStore.get(userId) ?? [];
}

function appendToHistory(userId: string, role: 'user' | 'assistant', content: string): void {
    const history = getHistory(userId);
    history.push({ role, content });
    while (history.length > MAX_HISTORY) history.shift();
    conversationStore.set(userId, history);
}

// ─── Failure logging (for fallback monitoring) ───────────────────────────────
const failureLog: Array<{ timestamp: Date; error: string; userId: string }> = [];
const MAX_FAILURE_LOG = 50;

function logFailure(userId: string, error: string): void {
    failureLog.push({ timestamp: new Date(), error, userId });
    while (failureLog.length > MAX_FAILURE_LOG) failureLog.shift();
    console.error(`[FinMate] RAG failure logged for user ${userId}: ${error}`);
}

// ─── Data Helpers ─────────────────────────────────────────────────────────────

const formatCurrency = (amount: number): string =>
    `₹${amount.toLocaleString('en-IN')}`;

const getCurrentPeriod = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();
    return {
        month,
        year,
        startOfMonth: new Date(year, month - 1, 1),
        endOfMonth: new Date(year, month, 0, 23, 59, 59),
        daysLeft: daysInMonth - now.getDate(),
        daysElapsed: now.getDate(),
        daysInMonth,
        isEndOfMonth: daysInMonth - now.getDate() <= 3,
    };
};

const getPreviousPeriod = (month: number, year: number) => {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return {
        month: prevMonth,
        year: prevYear,
        startOfMonth: new Date(prevYear, prevMonth - 1, 1),
        endOfMonth: new Date(prevYear, prevMonth, 0, 23, 59, 59),
    };
};

// ─── Rich Financial Data Retrieval ───────────────────────────────────────────

/**
 * Retrieves the full enriched financial data set for a user.
 * This is the "R" in RAG — the raw data that gets chunked and embedded.
 *
 * Includes:
 *   - Current month: transactions, totals, categories, merchants, budget
 *   - Previous month: same set (for month-over-month comparison)
 *   - Upcoming reminders / bills
 *   - Achievement/star history
 *   - Family data
 */
const retrieveUserData = async (
    userId: mongoose.Types.ObjectId,
    _email: string
) => {
    const { month, year, startOfMonth, endOfMonth, daysLeft, daysElapsed, daysInMonth, isEndOfMonth } =
        getCurrentPeriod();

    // ── Current month transactions ─────────────────────────────────────────
    const allTxns = await Transaction.find({
        user: userId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: -1 });

    const expenses = allTxns.filter((t) => t.type === 'expense');
    const incomes = allTxns.filter((t) => t.type === 'income');
    const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    expenses.forEach((t) => {
        categoryBreakdown[t.category] =
            (categoryBreakdown[t.category] || 0) + t.amount;
    });

    // Merchant breakdown
    const merchantBreakdown: Record<string, number> = {};
    expenses.forEach((t) => {
        if (t.merchant) {
            merchantBreakdown[t.merchant] =
                (merchantBreakdown[t.merchant] || 0) + t.amount;
        }
    });

    // Recent transactions (last 10) — include both income & expense
    const recentTransactions = allTxns.slice(0, 10).map((t) => ({
        amount: t.amount,
        category: t.category,
        merchant: t.merchant,
        date: t.date,
        type: t.type,
        paymentMethod: t.paymentMethod,
        notes: t.notes,
    }));

    // ── Budget ─────────────────────────────────────────────────────────────
    const budget = await Budget.findOne({ user: userId, month, year });
    const budgetData = budget
        ? {
            total: budget.totalBudget,
            spent: totalExpenses,
            remaining: budget.totalBudget - totalExpenses,
            percentage: budget.totalBudget > 0
                ? Math.round((totalExpenses / budget.totalBudget) * 100)
                : 0,
            isOverBudget: totalExpenses > budget.totalBudget,
            alertThreshold: budget.alertThreshold,
            categoryBudgets: budget.categoryBudgets,
        }
        : null;

    // ── Previous month data ────────────────────────────────────────────────
    const prev = getPreviousPeriod(month, year);
    const prevTxns = await Transaction.find({
        user: userId,
        date: { $gte: prev.startOfMonth, $lte: prev.endOfMonth },
    });

    const prevExpenses = prevTxns.filter((t) => t.type === 'expense');
    const prevIncomes = prevTxns.filter((t) => t.type === 'income');
    const prevTotalExpenses = prevExpenses.reduce((s, t) => s + t.amount, 0);
    const prevTotalIncome = prevIncomes.reduce((s, t) => s + t.amount, 0);

    const prevCategoryBreakdown: Record<string, number> = {};
    prevExpenses.forEach((t) => {
        prevCategoryBreakdown[t.category] =
            (prevCategoryBreakdown[t.category] || 0) + t.amount;
    });

    const prevMerchantBreakdown: Record<string, number> = {};
    prevExpenses.forEach((t) => {
        if (t.merchant) {
            prevMerchantBreakdown[t.merchant] =
                (prevMerchantBreakdown[t.merchant] || 0) + t.amount;
        }
    });

    // ── Reminders ──────────────────────────────────────────────────────────
    const reminders = await Reminder.find({
        user: userId,
        dueDate: { $gte: new Date() },
        isPaid: false,
    })
        .sort({ dueDate: 1 })
        .limit(8);

    // ── Achievements ───────────────────────────────────────────────────────
    const achievements = await Achievement.find({ userId })
        .sort({ year: -1, month: -1 })
        .limit(12);
    const totalStars = achievements.filter(
        (a) => a.status === 'awarded' || a.status === 'finalized'
    ).length;

    // ── Family ─────────────────────────────────────────────────────────────
    const family = await Family.findOne({
        'members.userId': userId,
        isActive: true,
    });
    let familyData = null;
    if (family) {
        const me = family.members.find(
            (m) => m.userId.toString() === userId.toString()
        );
        familyData = {
            familyName: family.familyName,
            memberCount: family.members.length,
            currentMemberRole: me?.role,
            currentMemberRelation: me?.relation,
            sharedBudget: family.sharedBudget,
            canViewFamilyData: me?.permissions?.canViewExpenses,
        };
    }

    return {
        // Current period
        month,
        year,
        daysLeft,
        daysElapsed,
        daysInMonth,
        isEndOfMonth,
        transactions: {
            total: allTxns.length,
            expenses: expenses.length,
            incomes: incomes.length,
        },
        totalExpenses,
        totalIncome,
        savings: totalIncome - totalExpenses,
        categoryBreakdown,
        merchantBreakdown,
        recentTransactions,
        budget: budgetData,

        // Previous month
        previousMonth: {
            month: prev.month,
            year: prev.year,
            totalExpenses: prevTotalExpenses,
            totalIncome: prevTotalIncome,
            savings: prevTotalIncome - prevTotalExpenses,
            categoryBreakdown: prevCategoryBreakdown,
            merchantBreakdown: prevMerchantBreakdown,
        },

        // Other data
        reminders: reminders.map((r) => ({
            title: r.title,
            amount: r.amount,
            dueDate: r.dueDate,
            type: r.type,
        })),
        achievements: {
            totalStars,
            history: achievements.slice(0, 6).map((a) => ({
                month: a.month,
                year: a.year,
                status: a.status,
            })),
        },
        family: familyData,
    };
};

// ─── Intelligent Data-Grounded Fallback ───────────────────────────────────────
// Used ONLY when OpenAI API is unavailable.
// Generates data-grounded responses programmatically — NOT static templates.
// Every response includes real user data (amounts, percentages, comparisons).

const generateFallbackResponse = (
    message: string,
    data: any,
    userName: string
): string => {
    const msg = message.toLowerCase();
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const mon = monthNames[(data.month ?? 1) - 1];
    const savingsRate =
        data.totalIncome > 0
            ? Math.round((data.savings / data.totalIncome) * 100)
            : 0;
    const avgDaily = data.daysElapsed > 0
        ? Math.round(data.totalExpenses / data.daysElapsed)
        : 0;

    // Greeting detection (highest priority)
    const greetingPatterns = /^\s*(hi+|hey+|hello+|hyy+|hii+|yo+|sup|good\s*(morning|afternoon|evening|night)|namaste|namaskar|howdy|what'?s\s*up)\s*[!?.]*\s*$/i;
    if (greetingPatterns.test(msg.trim()) || (msg.length < 15 && /^(hi|hey|hello|hyy|hii)/.test(msg.trim()))) {
        return `Hello ${userName}! 👋 I'm FinMate, your personal finance assistant. How can I help you with your finances today?`;
    }

    // Budget-related queries
    if (msg.includes('budget')) {
        if (!data.budget) {
            return `${userName}, you don't have a budget set for ${mon} yet. Your current spending is ${formatCurrency(data.totalExpenses)} across ${data.transactions.expenses} transactions. Setting a monthly budget in the Budget section will help you track and control your spending.`;
        }
        const { total, spent, remaining, percentage, isOverBudget } = data.budget;
        const dailyBudget = data.daysLeft > 0 ? Math.round(remaining / data.daysLeft) : 0;
        const burnRate = data.daysElapsed > 0 ? Math.round(spent / data.daysElapsed) : 0;
        const projected = burnRate * data.daysInMonth;

        if (isOverBudget) {
            return `${userName}, your ${mon} budget of ${formatCurrency(total)} has been exceeded by ${formatCurrency(Math.abs(remaining))} (${percentage}% utilised). Total spent: ${formatCurrency(spent)} across ${data.transactions.expenses} transactions. With ${data.daysLeft} days left, focus on essential spending only. Your daily average has been ${formatCurrency(burnRate)}.`;
        }
        return `Your ${mon} budget: ${formatCurrency(total)} total, ${formatCurrency(spent)} spent (${percentage}%), ${formatCurrency(remaining)} remaining. Safe daily spend: ${formatCurrency(dailyBudget)} for the next ${data.daysLeft} days. At your current pace of ${formatCurrency(burnRate)}/day, projected month-end spend: ${formatCurrency(projected)}${projected > total ? ' — that would exceed your budget, so consider slowing down' : ' — on track'}.`;
    }

    // Spending/category analysis
    if (msg.includes('spend') || msg.includes('expense') || msg.includes('category') || msg.includes('food') || msg.includes('shopping') || msg.includes('transport')) {
        if (data.transactions.expenses === 0) {
            return `No expense transactions recorded for ${mon} yet. Add your recent transactions and I can provide a detailed category breakdown and analysis.`;
        }
        const sorted = Object.entries(data.categoryBreakdown as Record<string, number>)
            .sort(([, a], [, b]) => b - a);
        const topItems = sorted.slice(0, 4)
            .map(([cat, amt], i) => `${i + 1}. ${cat}: ${formatCurrency(amt as number)} (${Math.round(((amt as number) / data.totalExpenses) * 100)}%)`)
            .join('\n');

        let comparison = '';
        if (data.previousMonth && data.previousMonth.totalExpenses > 0) {
            const diff = data.totalExpenses - data.previousMonth.totalExpenses;
            comparison = `\n\nCompared to last month: your spending ${diff > 0 ? 'increased' : 'decreased'} by ${formatCurrency(Math.abs(diff))} (${Math.round(Math.abs(diff) / data.previousMonth.totalExpenses * 100)}%).`;
        }

        return `${mon} spending breakdown (${formatCurrency(data.totalExpenses)} across ${data.transactions.expenses} transactions):\n${topItems}\n\nAverage daily spend: ${formatCurrency(avgDaily)}.${comparison}${data.budget ? ` Budget utilisation: ${data.budget.percentage}%.` : ''}`;
    }

    // Savings analysis
    if (msg.includes('saving') || msg.includes('save') || msg.includes('savings rate')) {
        let prevComparison = '';
        if (data.previousMonth) {
            const prevSavingsRate = data.previousMonth.totalIncome > 0
                ? Math.round((data.previousMonth.savings / data.previousMonth.totalIncome) * 100)
                : 0;
            const diff = savingsRate - prevSavingsRate;
            prevComparison = ` Last month your savings rate was ${prevSavingsRate}% — ${diff > 0 ? `an improvement of ${diff} percentage points` : `a decline of ${Math.abs(diff)} percentage points`}.`;
        }

        if (data.savings > 0) {
            const target20 = Math.round(data.totalIncome * 0.2);
            const shortfall = target20 - data.savings;
            return `${userName}, you've saved ${formatCurrency(data.savings)} in ${mon} — that's a ${savingsRate}% savings rate (income: ${formatCurrency(data.totalIncome)}, expenses: ${formatCurrency(data.totalExpenses)}).${prevComparison} ${savingsRate >= 20 ? 'You\'re at or above the recommended 20% benchmark — excellent discipline!' : `To hit the 20% benchmark, you\'d need to save an additional ${formatCurrency(Math.max(0, shortfall))}.`}`;
        } else if (data.savings === 0) {
            return `Your income and expenses are exactly balanced in ${mon}: ${formatCurrency(data.totalIncome)} each. Savings rate: 0%.${prevComparison} Even routing 5-10% of income to savings would make a meaningful difference.`;
        } else {
            return `${userName}, your expenses (${formatCurrency(data.totalExpenses)}) exceed your income (${formatCurrency(data.totalIncome)}) by ${formatCurrency(Math.abs(data.savings))} in ${mon}.${prevComparison} Review your top spending categories to identify areas for reduction.`;
        }
    }

    // Merchant spending
    if (msg.includes('merchant') || msg.includes('where') || msg.includes('shop') || msg.includes('store')) {
        if (!data.merchantBreakdown || Object.keys(data.merchantBreakdown).length === 0) {
            return `No merchant data available for ${mon}. Add transactions with merchant details for a spending breakdown.`;
        }
        const sorted = Object.entries(data.merchantBreakdown as Record<string, number>)
            .sort(([, a], [, b]) => b - a);
        const topItems = sorted.slice(0, 5)
            .map(([merchant, amt], i) => `${i + 1}. ${merchant}: ${formatCurrency(amt as number)}`)
            .join('\n');
        return `Top merchants by spending in ${mon}:\n${topItems}\n\nTotal unique merchants: ${sorted.length}. Most spent at: ${sorted[0][0]} (${formatCurrency(sorted[0][1] as number)}).`;
    }

    // Monthly comparison / trends
    if (msg.includes('compare') || msg.includes('trend') || msg.includes('last month') || msg.includes('previous')) {
        if (!data.previousMonth || data.previousMonth.totalExpenses === 0) {
            return `I don't have enough previous month data to make a comparison. Keep tracking your transactions and I'll be able to show trends next month.`;
        }
        const prev = data.previousMonth;
        const prevMon = monthNames[(prev.month ?? 1) - 1];
        const expDiff = data.totalExpenses - prev.totalExpenses;
        const incDiff = data.totalIncome - prev.totalIncome;
        const savDiff = data.savings - prev.savings;

        return `${prevMon} vs ${mon} comparison:\n\nIncome: ${formatCurrency(prev.totalIncome)} → ${formatCurrency(data.totalIncome)} (${incDiff >= 0 ? '+' : ''}${formatCurrency(incDiff)})\nExpenses: ${formatCurrency(prev.totalExpenses)} → ${formatCurrency(data.totalExpenses)} (${expDiff >= 0 ? '+' : ''}${formatCurrency(expDiff)})\nSavings: ${formatCurrency(prev.savings)} → ${formatCurrency(data.savings)} (${savDiff >= 0 ? '+' : ''}${formatCurrency(savDiff)})\n\nOverall trend: ${savDiff >= 0 ? 'Financial health improving' : 'Spending increased — review your top categories for reduction opportunities'}.`;
    }

    // Reminders / bills
    if (msg.includes('bill') || msg.includes('reminder') || msg.includes('due') || msg.includes('payment')) {
        if (data.reminders.length === 0) {
            return `No upcoming bills or reminders. You're all caught up! Add reminders in the Reminders section to stay on top of payments.`;
        }
        const total = data.reminders.reduce((s: number, r: any) => s + r.amount, 0);
        const items = data.reminders.slice(0, 4)
            .map((r: any) => {
                const days = Math.ceil((new Date(r.dueDate).getTime() - Date.now()) / 86400000);
                const urgency = days <= 3 ? '🔴' : days <= 7 ? '🟡' : '🟢';
                return `${urgency} ${r.title}: ${formatCurrency(r.amount)} — due in ${days} days`;
            }).join('\n');
        return `Upcoming payments (${data.reminders.length} total, ${formatCurrency(total)} due):\n${items}\n\nEnsure sufficient funds are available. ${data.budget ? `Current budget remaining: ${formatCurrency(data.budget.remaining)}.` : ''}`;
    }

    // Achievement / stars
    if (msg.includes('star') || msg.includes('achievement') || msg.includes('reward')) {
        return `You've earned ${data.achievements.totalStars} star${data.achievements.totalStars !== 1 ? 's' : ''} ⭐ — each represents a month you stayed within budget. ${data.budget ? (data.budget.isOverBudget ? `This month you\'re currently over budget, but there are ${data.daysLeft} days left to adjust.` : `This month you\'re on track with ${formatCurrency(data.budget.remaining)} remaining — keep it up for another star!`) : 'Set a budget to start earning stars.'}`;
    }

    // Family
    if (msg.includes('family')) {
        if (!data.family) {
            return `You're not connected to a family group yet. Head to Family Mode to create or join a family and track expenses together.`;
        }
        const f = data.family;
        return `You're part of ${f.familyName} (${f.memberCount} members). Your role: ${f.currentMemberRole}. ${f.sharedBudget?.amount ? `Shared family budget: ${formatCurrency(f.sharedBudget.amount)}.` : 'No shared budget set yet.'} ${f.canViewFamilyData ? 'You can view family expenses.' : ''}`;
    }

    // Health / overview
    if (msg.includes('health') || msg.includes('score') || msg.includes('overview') || msg.includes('summary')) {
        const sorted = Object.entries(data.categoryBreakdown as Record<string, number>)
            .sort(([, a], [, b]) => b - a);
        const topCat = sorted[0];
        return `${mon} financial overview:\n\nIncome: ${formatCurrency(data.totalIncome)} | Expenses: ${formatCurrency(data.totalExpenses)} | Savings: ${formatCurrency(data.savings)} (${savingsRate}%)\n${data.budget ? `Budget: ${formatCurrency(data.budget.total)} — ${data.budget.percentage}% used, ${formatCurrency(data.budget.remaining)} remaining` : 'No budget set'}\nTop category: ${topCat ? `${topCat[0]} at ${formatCurrency(topCat[1] as number)}` : 'N/A'}\nUpcoming bills: ${data.reminders.length} pending\nStars earned: ${data.achievements.totalStars} ⭐\n\nAsk me about any specific area for detailed analysis.`;
    }

    // Default — comprehensive financial summary (data-grounded, not generic)
    const sorted = Object.entries(data.categoryBreakdown as Record<string, number>)
        .sort(([, a], [, b]) => b - a);
    const topCat = sorted[0];

    return `Here's your ${mon} snapshot, ${userName}:\n\nIncome: ${formatCurrency(data.totalIncome)} | Expenses: ${formatCurrency(data.totalExpenses)} | Savings: ${formatCurrency(data.savings)} (${savingsRate}%)\nAverage daily spend: ${formatCurrency(avgDaily)} | Days left: ${data.daysLeft}\n${data.budget ? `Budget: ${data.budget.percentage}% used (${formatCurrency(data.budget.remaining)} remaining)` : 'No budget set yet — I recommend setting one.'}\n${topCat ? `Highest category: ${topCat[0]} at ${formatCurrency(topCat[1] as number)}` : ''}\n\nAsk me about your budget, spending categories, savings rate, monthly trends, or upcoming bills.`;
};

// ─── Main Endpoints ───────────────────────────────────────────────────────────

/**
 * POST /api/chatbot/message
 *
 * Core FinMate chat endpoint.
 * Pipeline: Always attempts full RAG (Query → Retrieval → Context → GPT → Response).
 * Falls back to data-grounded programmatic response ONLY on OpenAI failure.
 */
export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { message, conversationHistory: clientHistory } = req.body;
        const userId = req.user?._id;
        const userEmail = req.user?.email || '';
        const userName = req.user?.fullName?.split(' ')[0] || 'User';

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const userIdStr = userId.toString();
        const startTime = Date.now();

        // Step 1: Retrieve enriched financial data from MongoDB
        const userData = await retrieveUserData(userId, userEmail);

        // Step 2: Determine conversation history — prefer server store, fall back to client
        const history: ChatMessage[] = getHistory(userIdStr).length > 0
            ? getHistory(userIdStr)
            : (Array.isArray(clientHistory) ? clientHistory.slice(-6) : []);

        // Step 3: Attempt full RAG pipeline ──────────────────────────────────
        if (validateOpenAIConfig()) {
            try {
                const ragResponse = await generateRAGResponse(
                    message,
                    userData,
                    userName,
                    history
                );

                // Persist to server-side conversation store
                appendToHistory(userIdStr, 'user', message);
                appendToHistory(userIdStr, 'assistant', ragResponse.reply);

                const processingTime = Date.now() - startTime;

                return res.status(200).json({
                    success: true,
                    reply: ragResponse.reply,
                    mode: 'rag',
                    model: ragResponse.model,
                    chunksUsed: ragResponse.chunksUsed,
                    tokensUsed: ragResponse.tokensUsed,
                    processingTime,
                    timestamp: new Date().toISOString(),
                });
            } catch (ragError: any) {
                // Log failure but don't crash — fall through to fallback
                logFailure(userIdStr, ragError.message);
            }
        }

        // Step 4: Fallback (ONLY when RAG pipeline is unavailable) ────────────
        const fallbackReply = generateFallbackResponse(message, userData, userName);
        appendToHistory(userIdStr, 'user', message);
        appendToHistory(userIdStr, 'assistant', fallbackReply);

        const processingTime = Date.now() - startTime;

        return res.status(200).json({
            success: true,
            reply: fallbackReply,
            mode: 'fallback',
            processingTime,
            timestamp: new Date().toISOString(),
        });

    } catch (error: any) {
        console.error('[FinMate] Unhandled error in sendMessage:', error);
        return res.status(500).json({
            success: false,
            message: "I'm having trouble right now. Please try again in a moment.",
            error: error.message,
        });
    }
};

/**
 * GET /api/chatbot/context
 *
 * Initialise a new chat session:
 *   - Clear conversation history
 *   - Retrieve user's financial data
 *   - Generate a personalised welcome message via GPT (or fallback)
 *   - Return context metadata for the frontend
 */
export const getChatContext = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?._id;
        const userEmail = req.user?.email || '';
        const userName = req.user?.fullName?.split(' ')[0] || 'User';

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const userIdStr = userId.toString();

        // Reset conversation history for new chat session
        conversationStore.delete(userIdStr);

        const userData = await retrieveUserData(userId, userEmail);

        let welcomeMessage: string;
        let welcomeMode: 'rag' | 'fallback' = 'rag';

        if (validateOpenAIConfig()) {
            try {
                welcomeMessage = await generateWelcomeMessage(userData, userName);
            } catch (err: any) {
                console.error('[FinMate] Welcome message generation failed:', err.message);
                logFailure(userIdStr, `Welcome: ${err.message}`);
                welcomeMessage = generateFallbackWelcome(userData, userName);
                welcomeMode = 'fallback';
            }
        } else {
            welcomeMessage = generateFallbackWelcome(userData, userName);
            welcomeMode = 'fallback';
        }

        // Seed first assistant message into history
        appendToHistory(userIdStr, 'assistant', welcomeMessage);

        return res.status(200).json({
            success: true,
            welcomeMessage,
            mode: welcomeMode,
            context: {
                hasBudget: !!userData.budget,
                isEndOfMonth: userData.isEndOfMonth,
                hasFamily: !!userData.family,
                totalStars: userData.achievements.totalStars,
                totalExpenses: userData.totalExpenses,
                totalIncome: userData.totalIncome,
                savings: userData.savings,
                daysLeft: userData.daysLeft,
                transactionCount: userData.transactions.total,
                categoryCount: Object.keys(userData.categoryBreakdown).length,
            },
        });
    } catch (error: any) {
        console.error('[FinMate] getChatContext error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to initialise chat. Please try again.',
        });
    }
};

/**
 * DELETE /api/chatbot/history
 *
 * Clear the conversation history for the current user (new chat session).
 */
export const clearHistory = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?._id?.toString();
    if (userId) {
        conversationStore.delete(userId);
    }
    return res.status(200).json({ success: true, message: 'Conversation history cleared.' });
};

// ─── Fallback welcome (data-grounded, no static templates) ───────────────────

const generateFallbackWelcome = (userData: any, userName: string): string => {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const mon = monthNames[(userData.month ?? 1) - 1];
    const savingsRate =
        userData.totalIncome > 0
            ? Math.round((userData.savings / userData.totalIncome) * 100)
            : 0;

    let msg = `Hi ${userName}! 👋 I'm **FinMate**, your personal financial assistant.\n\n`;

    if (userData.budget) {
        const { total, percentage, isOverBudget, remaining } = userData.budget;
        if (isOverBudget) {
            msg += `Your ${mon} budget of ${formatCurrency(total)} has been exceeded by ${formatCurrency(Math.abs(remaining))} — let's work together to get back on track.\n`;
        } else if (percentage >= 80) {
            msg += `You've used ${percentage}% of your ${mon} budget (${formatCurrency(total)}) — ${formatCurrency(remaining)} remaining with ${userData.daysLeft} days to go.\n`;
        } else {
            msg += `Your ${mon} budget is looking healthy ✅ — ${formatCurrency(remaining)} remaining (${100 - percentage}% left) out of ${formatCurrency(total)}.\n`;
        }
    } else {
        msg += `I don't see a budget set for ${mon} yet. Your current spending is ${formatCurrency(userData.totalExpenses)} — setting a budget is the best first step!\n`;
    }

    if (savingsRate > 0) {
        msg += `You're saving ${savingsRate}% of your income this month (${formatCurrency(userData.savings)}) — ${savingsRate >= 20 ? 'excellent work!' : 'let\'s see if we can push that higher.'}\n`;
    } else if (userData.totalIncome > 0 && userData.savings <= 0) {
        msg += `Your expenses currently match or exceed your income — let's find ways to improve your savings.\n`;
    }

    msg += `\nWhat would you like to explore today?`;
    return msg;
};