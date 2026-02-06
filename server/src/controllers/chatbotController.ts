/**
 * FinMate - Smart Budget Companion for FinPal
 * 
 * Role & Identity:
 * FinMate is your friendly financial assistant built into FinPal.
 * Primary role: Help users track budgets, understand spending, and build better money habits
 * using their personal financial data.
 * 
 * Core Principles:
 * - Always use the user's real data from their FinPal account
 * - Never guess or make up financial information
 * - If data is missing, guide the user to add it
 * - Keep responses simple, friendly, and actionable
 * 
 * Communication Style:
 * - Short, clear sentences
 * - Encouraging and supportive tone
 * - No technical jargon or complex explanations
 * - Focus on what the user should do next
 * - Non-judgmental, especially for overspending
 * 
 * Data Sources:
 * - User profile and account information
 * - Monthly budgets and spending limits
 * - Expense records and categories
 * - Family sharing data and permissions
 * - Achievement history and rewards
 * - Reports and financial summaries
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

// Retrieve user's financial data
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

    // Daily spending advice
    if ((lowerMessage.includes('can i spend') || lowerMessage.includes('spend today')) && 
        (lowerMessage.match(/₹\\d+/) || lowerMessage.match(/\\d+/))) {
        return 'DAILY_SPENDING';
    }

    // Budget related
    if (lowerMessage.includes('budget status') || lowerMessage.includes('how is my budget') || 
        lowerMessage.includes('budget now') || lowerMessage === 'what is my budget status?') {
        return 'BUDGET_STATUS';
    }
    if (lowerMessage.includes('budget') && (lowerMessage.includes('how') || lowerMessage.includes('remaining'))) {
        return 'BUDGET_STATUS';
    }
    if (lowerMessage.includes('set budget') || lowerMessage.includes('create budget') || 
        lowerMessage.includes('want to set my budget')) {
        return 'BUDGET_HELP';
    }

    // Overspending acknowledgment
    if (lowerMessage.includes('spent too much') || lowerMessage.includes('overspent')) {
        return 'OVERSPENT_HELP';
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

    // Stress/motivation related
    if (lowerMessage.includes('stressed about money') || lowerMessage.includes('feel stressed') || 
        lowerMessage.includes('worried about') || lowerMessage.includes('anxious about money')) {
        return 'MOTIVATION';
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

// FinMate Smart Response Generator - Generate response based on intent and user data
const generateResponse = (intent: string, data: any, userName: string, originalMessage: string = ''): string => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[data.month - 1];

    switch (intent) {
        case 'GREETING': {
            if (!data.budget) {
                return `👋 Hi! I'm FinMate.
I'll help you track your budget and spend smarter.
Start by setting your monthly budget 😊`;
            }

            if (data.budget.isOverBudget) {
                return `Hi ${userName}! 👋
You've spent a bit more than planned this month.
Let's work together to get back on track 💪`;
            }

            const daysLeft = data.daysLeft;
            if (daysLeft <= 3) {
                return `Hi ${userName}! 👋
We're almost at the end of ${currentMonth}.
You're doing great with your budget! 🎉`;
            }

            return `Hi ${userName}! 👋
Your budget is looking good.
How can I help you today? 😊`;
        }

        case 'DAILY_SPENDING': {
            if (!data.budget) {
                return `I need a little more data to guide you better 😊
Please set your monthly budget first.`;
            }

            // Extract amount from original message 
            const amountMatch = originalMessage.match(/₹(\\d+)|(\\d+)/);
            const requestedAmount = amountMatch ? parseInt(amountMatch[1] || amountMatch[2]) : 0;

            if (requestedAmount === 0) {
                return `How much are you planning to spend today?
Let me check if it fits your budget 😊`;
            }

            if (data.budget.isOverBudget) {
                return `You're already over budget this month 😕
Try to spend less to get back on track.`;
            }

            const dailyBudget = data.daysLeft > 0 ? Math.round(data.budget.remaining / data.daysLeft) : 0;
            
            if (requestedAmount <= dailyBudget) {
                return `Yes 👍 You're within your budget.
Just remember to keep some balance for upcoming days.`;
            } else {
                return `That might be too much for today 😐
Your daily budget is around ₹${dailyBudget.toLocaleString('en-IN')}.
Try spending less to stay on track.`;
            }
        }

        case 'OVERSPENT_HELP': {
            return `That's okay — it happens 🙂
You've crossed today's limit slightly.
Try spending less tomorrow to stay on track.`;
        }

        case 'BUDGET_HELP': {
            return `Great choice 👍
Go to the Budget section and set your monthly amount.
I'll help you track your spending from there! 😊`;
        }

        case 'BUDGET_STATUS': {
            if (!data.budget) {
                return `I need a little more data to guide you better 🙂
Please set your monthly budget first.`;
            }

            const { total, spent, remaining, percentage, isOverBudget } = data.budget;
            
            if (isOverBudget) {
                return `You've crossed your budget by ${formatCurrency(Math.abs(remaining))} 😕
Try spending less in the remaining ${data.daysLeft} days.
You've got this! 💪`;
            }

            if (percentage >= 80) {
                return `You're close to your limit 📌
You've used ${formatCurrency(spent)} out of ${formatCurrency(total)}.
Be careful with the remaining ${formatCurrency(remaining)}.`;
            }

            const dailyBudget = data.daysLeft > 0 ? Math.round(remaining / data.daysLeft) : 0;
            let response = `Here's a quick update 📌
`;
            response += `You've used ${formatCurrency(spent)} out of ${formatCurrency(total)}.
`;
            response += `You're doing well — keep going!`;
            
            if (dailyBudget > 0) {
                response += `

You can spend up to ₹${dailyBudget.toLocaleString('en-IN')} per day.`;
            }

            if (data.isEndOfMonth) {
                response += `

🎉 Amazing job!
You're on track for a reward this month ⭐`;
            }

            return response;
        }

        case 'EXPENSE_ANALYSIS': {
            if (data.transactions.expenses === 0) {
                return `I need a bit more data to help you better 🙂
Please add your recent expenses first.`;
            }

            let response = `Here's where your money went this month:

`;
            
            // Sort categories by amount
            const sortedCategories = Object.entries(data.categoryBreakdown)
                .sort(([, a], [, b]) => (b as number) - (a as number));

            // Show top 3 categories
            sortedCategories.slice(0, 3).forEach(([category, amount], index) => {
                const emoji = index === 0 ? '🔥' : index === 1 ? '📌' : '💡';
                response += `${emoji} ${category}: ${formatCurrency(amount as number)}
`;
            });

            if (sortedCategories.length > 0) {
                response += `
You spent most on ${sortedCategories[0][0]}.
`;
                response += `Is this what you planned? 🤔`;
            }

            return response;
        }

        case 'EXPENSE_TOTAL': {
            return `You've spent ${formatCurrency(data.totalExpenses)} this month.
${data.transactions.expenses} transactions total.

${data.budget ? `This is ${data.budget.percentage}% of your budget.` : "Set a budget to track your progress!"}`;
        }

        case 'EXPENSE_SUMMARY': {
            let response = `Here's your spending overview:

`;
            response += `Expenses: ${formatCurrency(data.totalExpenses)}
`;
            response += `Income: ${formatCurrency(data.totalIncome)}
`;
            response += `Savings: ${formatCurrency(data.savings)}

`;

            if (data.budget) {
                response += `Budget: ${data.budget.isOverBudget ? 'Over by' : 'Remaining'} ${formatCurrency(Math.abs(data.budget.remaining))}`;
            } else {
                response += `Set a budget to track better!`;
            }

            return response;
        }

        case 'FAMILY_INFO': {
            if (!data.family) {
                return `You haven't joined a family yet 👨‍👩‍👧‍👦
Go to Family Mode to connect with your family.
You can track expenses together! 😊`;
            }

            let response = `✅ Connected to ${data.family.familyName}
`;
            response += `${data.family.memberCount} family members sharing expenses.
`;

            if (data.family.sharedBudget?.amount) {
                response += `
Family budget: ${formatCurrency(data.family.sharedBudget.amount)}`;
            } else {
                response += `
Set a family budget to track together! 💡`;
            }

            return response;
        }

        case 'ACHIEVEMENT_INFO': {
            if (data.achievements.totalStars === 0) {
                if (data.budget && !data.budget.isOverBudget && data.isEndOfMonth) {
                    return `🎉 Amazing job!
You stayed within your monthly budget.
You've successfully cracked the budget — congratulations ⭐`;
                } else if (data.budget && data.budget.isOverBudget) {
                    return `Not this time 😕
Your spending went slightly over the budget.
Let's plan better next month — I've got your back 👍`;
                }
                return `You haven't earned any stars yet 💫
Stay within your monthly budget to earn one!
Every star shows you're getting better with money 😊`;
            }

            let response = `You've earned ${data.achievements.totalStars} stars! ⭐
`;
            response += `That's ${data.achievements.totalStars} successful months of budgeting.
`;

            if (data.isEndOfMonth && data.budget && !data.budget.isOverBudget) {
                response += `\n🎉 You're getting another star this month!\nKeep up the amazing work! ⭐`;
            } else if (data.budget && !data.budget.isOverBudget) {
                response += `\nYou're on track for another star this month! 💪`;
            }

            return response;
        }

        case 'REMINDER_INFO': {
            if (data.reminders.length === 0) {
                return `No pending bills right now 👍
You're all caught up!
Add reminders to never miss a payment.`;
            }

            let response = `🔔 Upcoming bills:

`;
            let totalPending = 0;

            data.reminders.slice(0, 3).forEach((r: any) => {
                const dueDate = new Date(r.dueDate);
                const today = new Date();
                const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const urgency = daysUntil <= 3 ? '🔴' : '📅';

                response += `${urgency} ${r.title} - ${formatCurrency(r.amount)}
`;
                response += `   Due in ${daysUntil} days\n\n`;
                totalPending += r.amount;
            });

            response += `Total pending: ${formatCurrency(totalPending)}`;

            return response;
        }

        case 'MONTHLY_SUMMARY': {
            let response = `Here's your ${currentMonth} overview 📊

`;

            response += `Income: ${formatCurrency(data.totalIncome)}
`;
            response += `Expenses: ${formatCurrency(data.totalExpenses)}
`;
            response += `Savings: ${formatCurrency(data.savings)}

`;

            if (data.budget) {
                if (data.budget.isOverBudget) {
                    response += `You went over budget this month.
Let's do better next month! 💪`;
                } else {
                    response += `You stayed within your budget ✓
Great job managing your money!`;
                }
            } else {
                response += `Set a budget to track your progress better!`;
            }

            return response;
        }

        case 'SAVINGS_INFO': {
            const savings = data.savings;
            let response = `Here's how you're doing with savings this month:

`;

            if (savings > 0) {
                response += `Great job! You've saved ${formatCurrency(savings)} 🎉
`;
                response += `Keep up the good work!`;
            } else if (savings === 0) {
                response += `You've spent exactly what you earned.
`;
                response += `Try to save a little next month!`;
            } else {
                response += `You're spending more than your income.
`;
                response += `Review your expenses to find areas to cut back.`;
            }

            return response;
        }

        case 'MOTIVATION': {
            return `You're not alone 💙
Small steps matter.
Track today's expenses — that's a great start.`;
        }

        case 'HELP': {
            return `Hi! I'm FinMate 👋
I help you understand your money better.

Ask me about:

• "How is my budget?"
• "Where did I spend more?"
• "Show my family info"
• "Do I have pending bills?"
• "How many stars do I have?"

I use your real FinPal data to give you accurate answers.
No guessing, just facts! 😊`;
        }

        default: {
            let response = `Here's a quick look at your finances:

`;

            if (data.budget) {
                response += `Budget: ${data.budget.isOverBudget ? 'Over by' : 'Remaining'} ${formatCurrency(Math.abs(data.budget.remaining))}
`;
            } else {
                response += `Budget: Not set yet
`;
            }

            response += `Spent: ${formatCurrency(data.totalExpenses)} this month
`;
            response += `Stars earned: ${data.achievements.totalStars} ⭐

`;

            response += `Ask me about your budget, expenses, or achievements! 😊`;

            return response;
        }
    }
};

// Main chat endpoint - FinMate Smart Budget Assistant
// Always uses the user's real financial data from their FinPal account
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

        // Step 2: Retrieve user's real financial data from database
        const userData = await retrieveUserData(userId, userEmail);

        // Step 3: Generate response based on intent and user data
        const reply = generateResponse(intent, userData, userName, message);

        return res.status(200).json({
            success: true,
            reply,
            intent,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('FinMate chatbot error:', error);
        return res.status(500).json({
            success: false,
            message: "I'm having trouble right now. Please try again in a moment.",
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

        // Generate personalized welcome message based on user's data
        let welcomeMessage = `Hi ${userName}! 👋 I'm **FinMate**, your personal budget companion.\n\n`;

        if (userData.isEndOfMonth) {
            welcomeMessage += `We're in the last ${userData.daysLeft} days of the month!\n\n`;
        }

        if (userData.budget) {
            const { percentage, isOverBudget, remaining } = userData.budget;
            if (isOverBudget) {
                welcomeMessage += `You've spent a bit over your budget this month.\nThat's okay — it happens 🙂\nLet me help you understand your spending better.\n`;
            } else if (percentage >= 80) {
                welcomeMessage += `You're close to your budget limit.\nYou have ${formatCurrency(remaining)} left to spend.\nLet's be mindful! 💡\n`;
            } else {
                welcomeMessage += `Your budget is looking good! ✅\nYou have ${formatCurrency(remaining)} remaining.\nKeep up the great work!\n`;
            }
        } else {
            welcomeMessage += `I'll help you track your budget and spend smarter.\nStart by setting your monthly budget 😊\n`;
        }

        welcomeMessage += `\nWhat would you like to know?`;

        return res.status(200).json({
            success: true,
            welcomeMessage,
            context: {
                hasBudget: !!userData.budget,
                isEndOfMonth: userData.isEndOfMonth,
                hasFamily: !!userData.family,
                totalStars: userData.achievements.totalStars
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