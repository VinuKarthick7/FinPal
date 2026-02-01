/**
 * FinMate - RAG Chatbot System for FinPal
 * 
 * Role & Identity:
 * FinMate is a Retrieval-Augmented Generation (RAG) chatbot integrated into FinPal.
 * Primary role: Assist users and family members in understanding budgets, tracking expenses,
 * and improving financial discipline using REAL, stored app data.
 * 
 * Core RAG Principle (Very Important):
 * - ALWAYS respond using retrieved user-specific data from the FinPal database
 * - NEVER guess, hallucinate, or assume financial values
 * - If required data is missing or unavailable, clearly inform the user and suggest next steps
 * 
 * Data Sources (Retrieval Layer):
 * - User profile (email ID-based)
 * - Monthly budget settings
 * - Expense records (date, amount, category)
 * - Family Mode data (linked via family code)
 * - Achievements & stars history
 * - Reports & summaries
 * 
 * Tone & Personality:
 * - Friendly like a helper
 * - Calm and supportive
 * - Professional fintech style
 * - Non-judgmental (especially for parents)
 * - Accessible for elders and family users
 */

import { Request, Response } from 'express';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { Reminder } from '../models/Reminder';
import { Family } from '../models/Family';
import Achievement from '../models/Achievement';
import { IUser } from '../models/User';
import mongoose from 'mongoose';

interface AuthenticatedRequest extends Request {
    user?: IUser;
}

// Helper to format currency
const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN')}`;
};

// Get current month and year
const getCurrentPeriod = () => {
    const now = new Date();
    return {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
        endOfMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
        daysLeft: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate(),
        isEndOfMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() <= 3
    };
};

// Retrieve user's financial data (RAG retrieval layer)
const retrieveUserData = async (userId: mongoose.Types.ObjectId, email: string) => {
    const { month, year, startOfMonth, endOfMonth, daysLeft, isEndOfMonth } = getCurrentPeriod();

    // Get current month's transactions
    const transactions = await Transaction.find({
        user: userId,
        date: { $gte: startOfMonth, $lte: endOfMonth }
    }).sort({ date: -1 });

    // Calculate totals
    const expenses = transactions.filter(t => t.type === 'expense');
    const incomes = transactions.filter(t => t.type === 'income');
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    expenses.forEach(t => {
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
    });

    // Get budget
    const budget = await Budget.findOne({ user: userId, month, year });

    // Get reminders
    const reminders = await Reminder.find({
        user: userId,
        dueDate: { $gte: new Date() },
        isPaid: false
    }).sort({ dueDate: 1 }).limit(5);

    // Get achievements
    const achievements = await Achievement.find({ userId }).sort({ year: -1, month: -1 }).limit(12);
    const totalStars = achievements.filter(a => a.status === 'awarded' || a.status === 'finalized').length;

    // Get family data if connected
    const family = await Family.findOne({ 'members.userId': userId, isActive: true });
    let familyData = null;
    if (family) {
        const currentMember = family.members.find(m => m.userId.toString() === userId.toString());
        familyData = {
            familyName: family.familyName,
            memberCount: family.members.length,
            currentMemberRole: currentMember?.role,
            currentMemberRelation: currentMember?.relation,
            sharedBudget: family.sharedBudget,
            canViewFamilyData: currentMember?.permissions.canViewExpenses
        };
    }

    return {
        month,
        year,
        daysLeft,
        isEndOfMonth,
        transactions: {
            total: transactions.length,
            expenses: expenses.length,
            incomes: incomes.length
        },
        totalExpenses,
        totalIncome,
        savings: totalIncome - totalExpenses,
        categoryBreakdown,
        budget: budget ? {
            total: budget.totalBudget,
            spent: totalExpenses,
            remaining: budget.totalBudget - totalExpenses,
            percentage: Math.round((totalExpenses / budget.totalBudget) * 100),
            isOverBudget: totalExpenses > budget.totalBudget,
            categoryBudgets: budget.categoryBudgets
        } : null,
        reminders: reminders.map(r => ({
            title: r.title,
            amount: r.amount,
            dueDate: r.dueDate,
            type: r.type
        })),
        achievements: {
            totalStars,
            history: achievements.slice(0, 6).map(a => ({
                month: a.month,
                year: a.year,
                status: a.status
            }))
        },
        family: familyData
    };
};

// Intent detection
const detectIntent = (message: string): string => {
    const lowerMessage = message.toLowerCase();

    // Budget related
    if (lowerMessage.includes('budget') && (lowerMessage.includes('status') || lowerMessage.includes('how') || lowerMessage.includes('remaining'))) {
        return 'BUDGET_STATUS';
    }
    if (lowerMessage.includes('set budget') || lowerMessage.includes('create budget')) {
        return 'BUDGET_HELP';
    }

    // Expense related
    if (lowerMessage.includes('spent') || lowerMessage.includes('spending') || lowerMessage.includes('expense')) {
        if (lowerMessage.includes('where') || lowerMessage.includes('category') || lowerMessage.includes('more')) {
            return 'EXPENSE_ANALYSIS';
        }
        if (lowerMessage.includes('total') || lowerMessage.includes('how much')) {
            return 'EXPENSE_TOTAL';
        }
        return 'EXPENSE_SUMMARY';
    }

    // Family related
    if (lowerMessage.includes('family') || lowerMessage.includes('member')) {
        return 'FAMILY_INFO';
    }

    // Achievement related
    if (lowerMessage.includes('star') || lowerMessage.includes('achievement') || lowerMessage.includes('reward')) {
        return 'ACHIEVEMENT_INFO';
    }

    // Reminder related
    if (lowerMessage.includes('bill') || lowerMessage.includes('reminder') || lowerMessage.includes('due') || lowerMessage.includes('pending')) {
        return 'REMINDER_INFO';
    }

    // Report related
    if (lowerMessage.includes('report') || lowerMessage.includes('summary') || lowerMessage.includes('overview')) {
        return 'MONTHLY_SUMMARY';
    }

    // Savings
    if (lowerMessage.includes('saving') || lowerMessage.includes('save')) {
        return 'SAVINGS_INFO';
    }

    // Help
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
        return 'HELP';
    }

    // Greeting
    if (lowerMessage.match(/^(hi|hello|hey|good morning|good evening|good afternoon)/)) {
        return 'GREETING';
    }

    return 'GENERAL';
};

// FinMate RAG System - Generate response based on intent and REAL USER DATA
// Core Principle: NEVER guess or hallucinate - Always use retrieved data from database
const generateResponse = (intent: string, data: any, userName: string): string => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[data.month - 1];

    // FinMate Identity & Tone: Friendly, Simple, Non-judgmental (especially for parents)
    switch (intent) {
        case 'GREETING': {
            const greeting = data.isEndOfMonth
                ? `Hello ${userName}! 👋 We're in the last few days of ${currentMonth}. `
                : `Hello ${userName}! 👋 `;

            if (data.budget) {
                const budgetInfo = data.budget.isOverBudget
                    ? `You've exceeded your budget by ${formatCurrency(Math.abs(data.budget.remaining))}. Let's see how we can manage better! Remember, I'm here to help, not judge. 😊`
                    : `You have ${formatCurrency(data.budget.remaining)} remaining from your ${formatCurrency(data.budget.total)} budget.`;
                return greeting + budgetInfo;
            }
            return greeting + "How can I help you with your finances today?";
        }

        case 'BUDGET_STATUS': {
            // RAG Rule: If data is missing, clearly inform and guide user
            if (!data.budget) {
                return `📊 **Budget Not Set**\n\nI don't have a budget set for ${currentMonth} ${data.year} in your records yet.\n\n**Next Step:** Go to the **Budget** section to set your monthly budget and I'll help you track your spending effectively!\n\n💡 This is based on your stored data in FinPal.`;
            }

            const { total, spent, remaining, percentage, isOverBudget } = data.budget;
            let status = '';
            let emoji = '💚';

            if (isOverBudget) {
                emoji = '🔴';
                status = `**Over Budget!**`;
            } else if (percentage >= 80) {
                emoji = '🟡';
                status = `**Nearing Limit**`;
            } else {
                status = `**On Track**`;
            }

            let response = `📊 **Budget Status for ${currentMonth} ${data.year}**\n\n`;
            response += `${emoji} ${status}\n\n`;
            response += `• **Budget:** ${formatCurrency(total)}\n`;
            response += `• **Spent:** ${formatCurrency(spent)} (${percentage}%)\n`;
            response += `• **Remaining:** ${formatCurrency(Math.abs(remaining))}${isOverBudget ? ' over' : ''}\n`;
            response += `• **Days Left:** ${data.daysLeft}\n`;

            if (data.daysLeft > 0 && !isOverBudget) {
                const dailyBudget = Math.round(remaining / data.daysLeft);
                response += `\n💡 **Tip:** You can spend ₹${dailyBudget.toLocaleString('en-IN')} per day to stay within budget.`;
            }

            if (data.isEndOfMonth && !isOverBudget) {
                response += `\n\n⭐ **Great news!** You're on track to earn a star this month! Keep it up!`;
            }

            return response;
        }

        case 'BUDGET_HELP': {
            return `📝 **How to Set Your Budget**\n\n1. Go to the **Budget** section from the menu\n2. Click on **Set Budget** or **Create Budget**\n3. Enter your total monthly budget amount\n4. Optionally, allocate amounts to different categories\n5. Save your budget\n\n💡 **Tip:** Start with a realistic budget based on your income and essential expenses. You can always adjust it later!\n\nWould you like me to explain anything else?`;
        }

        case 'EXPENSE_ANALYSIS': {
            // RAG Rule: Never guess expenses - only show what's in the database
            if (data.transactions.expenses === 0) {
                return `📉 **No Expenses Found**\n\nI don't have any expense records for ${currentMonth} in the database yet.\n\n**Next Step:** Tap the **+ Add Expense** button to start tracking your spending!\n\n💡 I only show real data from your FinPal account - no guesses!`;
            }

            // RAG: Retrieve and present real stored data
            let response = `📉 **Expense Analysis for ${currentMonth}** (Based on your stored records)\n\n`;
            response += `**Total Spent:** ${formatCurrency(data.totalExpenses)} across ${data.transactions.expenses} transactions\n\n`;
            response += `**Category Breakdown:**\n`;

            // Sort categories by amount
            const sortedCategories = Object.entries(data.categoryBreakdown)
                .sort(([, a], [, b]) => (b as number) - (a as number));

            sortedCategories.forEach(([category, amount], index) => {
                const percentage = Math.round(((amount as number) / data.totalExpenses) * 100);
                const emoji = index === 0 ? '🔥' : index === 1 ? '📌' : '•';
                response += `${emoji} **${category}:** ${formatCurrency(amount as number)} (${percentage}%)\n`;
            });

            if (sortedCategories.length > 0) {
                response += `\n💡 **Insight:** Your highest spending is on **${sortedCategories[0][0]}**. Consider reviewing if this aligns with your priorities.`;
            }

            return response;
        }

        case 'EXPENSE_TOTAL': {
            return `💸 **Total Expenses for ${currentMonth}**\n\n**Amount:** ${formatCurrency(data.totalExpenses)}\n**Transactions:** ${data.transactions.expenses}\n\n${data.budget ? `This is ${data.budget.percentage}% of your ${formatCurrency(data.budget.total)} budget.` : "Set a budget to track your spending against a limit!"}`;
        }

        case 'EXPENSE_SUMMARY': {
            let response = `📊 **Expense Summary for ${currentMonth}**\n\n`;
            response += `• **Total Expenses:** ${formatCurrency(data.totalExpenses)}\n`;
            response += `• **Total Income:** ${formatCurrency(data.totalIncome)}\n`;
            response += `• **Net Savings:** ${formatCurrency(data.savings)}\n`;
            response += `• **Transactions:** ${data.transactions.total}\n`;

            if (data.budget) {
                response += `\n**Budget Status:**\n`;
                response += `• ${formatCurrency(data.budget.remaining)} ${data.budget.isOverBudget ? 'over budget' : 'remaining'}\n`;
            }

            return response;
        }

        case 'FAMILY_INFO': {
            // RAG Rule: Respect data privacy - only show allowed family-level insights
            if (!data.family) {
                return `👨‍👩‍👧‍👦 **Family Mode Not Active**\n\nI don't see any family connection in your account.\n\n**To get started:**\n1. Go to **Family Mode**\n2. Either **Create a Family** and share the code with members\n3. Or **Join a Family** using a 6-digit code\n\nFamily Mode lets you track shared expenses and budgets together!\n\n🔒 **Privacy Note:** Family data is always permission-based.`;
            }

            let response = `👨‍👩‍👧‍👦 **Family: ${data.family.familyName}**\n\n`;
            response += `• **Your Role:** ${data.family.currentMemberRole}\n`;
            response += `• **Relation:** ${data.family.currentMemberRelation}\n`;
            response += `• **Members:** ${data.family.memberCount}\n`;

            if (data.family.sharedBudget?.amount) {
                response += `\n**Shared Budget:** ${formatCurrency(data.family.sharedBudget.amount)} (${data.family.sharedBudget.period})\n`;
            }

            return response;
        }

        case 'ACHIEVEMENT_INFO': {
            let response = `⭐ **Your Achievements**\n\n`;
            response += `**Total Stars Earned:** ${data.achievements.totalStars} ⭐\n\n`;

            if (data.achievements.totalStars === 0) {
                response += `You haven't earned any stars yet.\n\n**How to earn stars:**\n• Set a monthly budget\n• Stay within your budget for the entire month\n• Earn a star at the end of each successful month!\n`;
            } else {
                response += `**Recent Performance:**\n`;
                data.achievements.history.forEach((a: any) => {
                    const status = a.status === 'awarded' || a.status === 'finalized' ? '⭐' : '—';
                    response += `• ${monthNames[a.month - 1]} ${a.year}: ${status}\n`;
                });
            }

            if (data.isEndOfMonth && data.budget && !data.budget.isOverBudget) {
                response += `\n🎉 **You're on track to earn a star this month!** Keep up the great work!`;
            }

            return response;
        }

        case 'REMINDER_INFO': {
            // RAG: Only show stored reminder data
            if (data.reminders.length === 0) {
                return `🔔 **No Pending Bills Found**\n\nI don't see any upcoming bills or reminders in your records.\n\n**Next Step:** Add reminders in the **Reminders** section to never miss a payment!\n\n💡 I'll notify you based on your stored reminder data.`;
            }

            let response = `🔔 **Upcoming Bills & Reminders**\n\n`;
            let totalPending = 0;

            data.reminders.forEach((r: any) => {
                const dueDate = new Date(r.dueDate);
                const today = new Date();
                const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const urgency = daysUntil <= 3 ? '🔴' : daysUntil <= 7 ? '🟡' : '🟢';

                response += `${urgency} **${r.title}**\n`;
                response += `   Amount: ${formatCurrency(r.amount)}\n`;
                response += `   Due: ${dueDate.toLocaleDateString('en-IN')} (${daysUntil} days)\n\n`;
                totalPending += r.amount;
            });

            response += `**Total Pending:** ${formatCurrency(totalPending)}`;

            return response;
        }

        case 'MONTHLY_SUMMARY': {
            let response = `📋 **${currentMonth} ${data.year} Summary**\n\n`;

            response += `**💰 Finances**\n`;
            response += `• Income: ${formatCurrency(data.totalIncome)}\n`;
            response += `• Expenses: ${formatCurrency(data.totalExpenses)}\n`;
            response += `• Net: ${formatCurrency(data.savings)}\n\n`;

            if (data.budget) {
                response += `**📊 Budget**\n`;
                response += `• Budget: ${formatCurrency(data.budget.total)}\n`;
                response += `• Spent: ${data.budget.percentage}%\n`;
                response += `• Status: ${data.budget.isOverBudget ? '🔴 Over Budget' : data.budget.percentage >= 80 ? '🟡 Near Limit' : '🟢 On Track'}\n\n`;
            }

            response += `**📈 Categories**\n`;
            Object.entries(data.categoryBreakdown)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 3)
                .forEach(([cat, amt]) => {
                    response += `• ${cat}: ${formatCurrency(amt as number)}\n`;
                });

            response += `\n**⭐ Stars:** ${data.achievements.totalStars} earned`;

            return response;
        }

        case 'SAVINGS_INFO': {
            const savings = data.savings;
            let response = `💰 **Savings for ${currentMonth}**\n\n`;

            if (savings > 0) {
                response += `Great job! You've saved **${formatCurrency(savings)}** this month! 🎉\n\n`;
                response += `• Income: ${formatCurrency(data.totalIncome)}\n`;
                response += `• Expenses: ${formatCurrency(data.totalExpenses)}\n`;
            } else if (savings === 0) {
                response += `You've spent exactly what you earned this month.\n\n`;
                response += `Consider setting aside some amount for savings next month!`;
            } else {
                response += `You're spending more than your income this month.\n\n`;
                response += `• Income: ${formatCurrency(data.totalIncome)}\n`;
                response += `• Expenses: ${formatCurrency(data.totalExpenses)}\n`;
                response += `• Deficit: ${formatCurrency(Math.abs(savings))}\n\n`;
                response += `💡 **Tip:** Review your spending categories to find areas where you can cut back.`;
            }

            return response;
        }

        case 'HELP': {
            return `🤖 **Hi, I'm FinMate!**\n\nI'm your Retrieval-Augmented Generation (RAG) chatbot - I use REAL data from your FinPal account to give you accurate, personalized insights. I never guess or make up numbers!\n\n**What I can help with:**\n\n**📊 Budget Understanding**\n• "What's my budget status?"\n• "How much can I spend today?"\n• "Am I on track this month?"\n\n**💸 Expense Analysis**\n• "Where did I spend more?"\n• "Show my expense summary"\n• "Why is my budget exceeded?"\n\n**👨‍👩‍👧‍👦 Family Mode**\n• "Show family info"\n• "Family spending this month"\n\n**⭐ Achievements & Motivation**\n• "How many stars do I have?"\n• "Can I earn a star this month?"\n\n**🔔 Bills & Reminders**\n• "What bills are pending?"\n• "Show my reminders"\n\n**📋 Reports & Summaries**\n• "Monthly summary"\n• "Show my savings"\n\n💡 **Remember:** All my responses are based on your stored data in FinPal. If data is missing, I'll let you know and guide you on the next steps!\n\nJust ask me anything! 💬`;
        }

        default: {
            // RAG Rule: When intent unclear, provide status based on REAL data
            // Never assume or hallucinate financial values
            let response = `Hi ${userName}! Here's what I see in your FinPal data:\\n\\n`;

            if (data.budget) {
                response += `📊 **Budget:** ${data.budget.percentage}% used (${formatCurrency(data.budget.remaining)} ${data.budget.isOverBudget ? 'over' : 'remaining'})\\n`;
            } else {
                response += `📊 **Budget:** Not set for this month (no budget data found)\\n`;
            }

            response += `💸 **Spent:** ${formatCurrency(data.totalExpenses)} this month\\n`;
            response += `💰 **Savings:** ${formatCurrency(data.savings)}\\n`;
            response += `⭐ **Stars:** ${data.achievements.totalStars}\\n\\n`;

            response += `💡 This is based on your stored records. Ask me about budget, expenses, or achievements for more details!`;

            return response;
        }
    }
};

// Main chat endpoint - FinMate RAG System
// Core Principle: Always respond using retrieved user-specific data from FinPal database
export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { message } = req.body;
        const userId = req.user?._id;
        const userEmail = req.user?.email || '';
        const userName = req.user?.fullName?.split(' ')[0] || 'User';

        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Step 1: Detect intent from user message
        const intent = detectIntent(message);

        // Step 2: RAG Retrieval Layer - Retrieve user's real financial data from database
        const userData = await retrieveUserData(userId, userEmail);

        // Step 3: Generate response based on intent and REAL retrieved data
        // FinMate NEVER guesses or hallucinates - only uses stored data
        const reply = generateResponse(intent, userData, userName);

        return res.status(200).json({
            success: true,
            reply,
            intent,
            timestamp: new Date().toISOString(),
            // Include data source indicator for transparency
            dataSource: 'FinPal Database - Real User Data'
        });
    } catch (error: any) {
        console.error('FinMate chatbot error:', error);
        return res.status(500).json({
            success: false,
            message: 'Sorry, I encountered an error retrieving your data. Please try again.',
            error: error.message
        });
    }
};

// Get chat context (for initializing chat with user's current status)
export const getChatContext = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?._id;
        const userEmail = req.user?.email || '';
        const userName = req.user?.fullName?.split(' ')[0] || 'User';

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userData = await retrieveUserData(userId, userEmail);

        // Generate personalized welcome message based on REAL stored data
        let welcomeMessage = `Hi ${userName}! 👋 I'm **FinMate**, your RAG-powered financial assistant.\n\n`;
        welcomeMessage += `🔍 I retrieve and analyze your REAL financial data from FinPal to provide accurate, personalized guidance. I never guess!\n\n`;

        if (userData.isEndOfMonth) {
            welcomeMessage += `🗓️ **Note:** We're in the last ${userData.daysLeft} days of the month!\n\n`;
        }

        if (userData.budget) {
            const { percentage, isOverBudget, remaining } = userData.budget;
            if (isOverBudget) {
                welcomeMessage += `⚠️ **Budget Alert:** You've exceeded your budget by ${formatCurrency(Math.abs(remaining))}. But don't worry - I'm here to help you analyze and improve, not judge! 😊\n`;
            } else if (percentage >= 80) {
                welcomeMessage += `📊 **Budget Status:** ${percentage}% used. You have ${formatCurrency(remaining)} remaining. Stay mindful of your spending!\n`;
            } else {
                welcomeMessage += `✅ **Budget Status:** On track! You have ${formatCurrency(remaining)} remaining from your ${formatCurrency(userData.budget.total)} budget.\n`;
            }
        } else {
            welcomeMessage += `📝 **Budget Not Set:** I don't see a budget for this month. Setting one will help me provide better insights!\n`;
        }

        welcomeMessage += `\n💬 How can I help you today? Ask me about:\n`;
        welcomeMessage += `• Budget status & spending analysis\n`;
        welcomeMessage += `• Expense breakdown by category\n`;
        welcomeMessage += `• Family finances (if connected)\n`;
        welcomeMessage += `• Achievements & stars\n`;
        welcomeMessage += `• Bills & reminders\n`;
        welcomeMessage += `\nOr just type "help" to see all I can do!`;

        return res.status(200).json({
            success: true,
            welcomeMessage,
            context: {
                hasBudget: !!userData.budget,
                isEndOfMonth: userData.isEndOfMonth,
                hasFamily: !!userData.family,
                totalStars: userData.achievements.totalStars,
                dataSource: 'Retrieved from FinPal Database'
            }
        });
    } catch (error: any) {
        console.error('Chat context error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get chat context'
        });
    }
};
