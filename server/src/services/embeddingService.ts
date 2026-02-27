/**
 * FinMate Advanced Embedding Service — RAG Pipeline Layer 1
 *
 * Full semantic chunking + embedding engine for the FinMate RAG chatbot.
 *
 * Pipeline:
 *   1. Convert user financial data → structured semantic chunks
 *   2. Batch-embed all chunks via OpenAI text-embedding-3-small (1536-d)
 *   3. Cosine-similarity retrieval of top-K relevant chunks
 *
 * Chunk types (12):
 *   - monthly_summary         — income / expenses / savings / savings-rate
 *   - budget_overview         — overall budget status + daily safe spend
 *   - budget_category         — per-category budget utilisation
 *   - category_spending       — category totals + individual breakdowns
 *   - merchant_spending       — top merchants by amount
 *   - recent_transactions     — last 10 transactions
 *   - monthly_comparison      — current vs previous month (overall + per-cat)
 *   - spending_pattern        — derived behavioural insights & risk flags
 *   - financial_health        — composite health score + recommendations
 *   - reminder                — upcoming bills / payments
 *   - achievement             — star history
 *   - family                  — family overview
 *
 * Key design decisions:
 *   - Batch embedding (single API call) instead of per-chunk calls → 10-20x faster
 *   - Rich derived metrics (health score, daily averages, recurring patterns)
 *   - User-specific isolation — chunks never leak between users
 */

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL =
    process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FinancialDataChunk {
    id: string;
    content: string;
    metadata: {
        type:
        | 'monthly_summary'
        | 'category_spending'
        | 'merchant_spending'
        | 'budget_overview'
        | 'budget_category'
        | 'monthly_comparison'
        | 'recent_transactions'
        | 'reminder'
        | 'achievement'
        | 'family'
        | 'spending_pattern'
        | 'financial_health';
        category?: string;
        merchant?: string;
        month?: number;
        year?: number;
        amount?: number;
        priority?: number; // 0 = highest relevance boost
    };
    embedding?: number[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const pct = (n: number) => `${n.toFixed(1)}%`;

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Chunk factory ────────────────────────────────────────────────────────────

/**
 * Build the full set of searchable semantic chunks from enriched user data.
 * Each chunk is designed as a self-contained financial fact that can be
 * injected into the LLM context independently.
 */
export function createFinancialDataChunks(userData: any): FinancialDataChunk[] {
    const chunks: FinancialDataChunk[] = [];
    let id = 0;
    const next = () => `chunk_${id++}`;
    const monthLabel = MONTH_NAMES[(userData.month ?? 1) - 1];

    // ── 1. Monthly financial summary ─────────────────────────────────────────
    {
        const savingsRate =
            userData.totalIncome > 0
                ? ((userData.savings / userData.totalIncome) * 100)
                : 0;
        const avgDailyExpense =
            userData.transactions?.expenses > 0 && userData.month
                ? Math.round(userData.totalExpenses / Math.max(1, new Date().getDate()))
                : 0;

        const content = `
Monthly Financial Summary for ${monthLabel} ${userData.year}:
- Total Income:          ${fmt(userData.totalIncome)}
- Total Expenses:        ${fmt(userData.totalExpenses)}
- Net Savings:           ${fmt(userData.savings)} (${pct(savingsRate)} savings rate)
- Average Daily Expense: ${fmt(avgDailyExpense)}
- Expense Transactions:  ${userData.transactions?.expenses ?? 0}
- Income Transactions:   ${userData.transactions?.incomes ?? 0}
- Days Elapsed:          ${new Date().getDate()} of ${new Date(userData.year, userData.month, 0).getDate()}
- Days Left in Month:    ${userData.daysLeft ?? 0}
- End of Month Period:   ${userData.isEndOfMonth ? 'Yes — final days' : 'No'}
- Income vs Expenses:    ${userData.totalIncome > userData.totalExpenses ? 'Income exceeds expenses (positive)' : userData.totalIncome === userData.totalExpenses ? 'Balanced (break-even)' : 'Expenses exceed income (negative)'}
`.trim();

        chunks.push({
            id: next(), content,
            metadata: { type: 'monthly_summary', month: userData.month, year: userData.year, amount: userData.totalExpenses, priority: 0 },
        });
    }

    // ── 2. Budget overview ───────────────────────────────────────────────────
    if (userData.budget) {
        const b = userData.budget;
        const dailyRemaining =
            userData.daysLeft > 0 ? Math.round(b.remaining / userData.daysLeft) : 0;
        const burnRate = new Date().getDate() > 0
            ? Math.round(b.spent / new Date().getDate())
            : 0;
        const projectedEnd = burnRate * new Date(userData.year, userData.month, 0).getDate();

        const content = `
Budget Overview for ${monthLabel} ${userData.year}:
- Total Budget:          ${fmt(b.total)}
- Amount Spent:          ${fmt(b.spent)}
- Remaining Budget:      ${fmt(b.remaining)}
- Budget Utilisation:    ${pct(b.percentage)}
- Status:                ${b.isOverBudget ? 'OVER BUDGET ⚠️' : b.percentage >= 80 ? 'APPROACHING LIMIT' : 'Within Budget ✅'}
- Safe Daily Spend:      ${fmt(dailyRemaining)} per day for remaining ${userData.daysLeft} days
- Current Daily Burn:    ${fmt(burnRate)} per day average
- Projected Month-End:   ${fmt(projectedEnd)} (${projectedEnd > b.total ? 'will exceed budget' : 'within budget if pace holds'})
- Alert Threshold:       ${b.alertThreshold ?? 80}%
`.trim();

        chunks.push({
            id: next(), content,
            metadata: { type: 'budget_overview', month: userData.month, year: userData.year, amount: b.total, priority: 0 },
        });

        // ── 3. Per-category budget breakdown ──────────────────────────────────
        if (Array.isArray(b.categoryBudgets) && b.categoryBudgets.length > 0) {
            b.categoryBudgets.forEach((cb: any) => {
                const catSpent = userData.categoryBreakdown?.[cb.category] ?? cb.spent ?? 0;
                const catBudgeted = cb.amount ?? 0;
                const catPct = catBudgeted > 0 ? (catSpent / catBudgeted) * 100 : 0;
                const remaining = catBudgeted - catSpent;

                const content = `
Category Budget — ${cb.category}:
- Budgeted:     ${fmt(catBudgeted)}
- Spent:        ${fmt(catSpent)}
- Remaining:    ${fmt(remaining)}
- Utilisation:  ${pct(catPct)}
- Status:       ${catSpent > catBudgeted ? 'OVER Category Budget by ' + fmt(Math.abs(remaining)) : remaining < catBudgeted * 0.2 ? 'Near Limit' : 'Within Category Budget'}
`.trim();

                chunks.push({
                    id: next(), content,
                    metadata: { type: 'budget_category', category: cb.category, amount: catSpent, priority: 1 },
                });
            });
        }
    }

    // ── 4. Category spending breakdown ───────────────────────────────────────
    if (userData.categoryBreakdown && Object.keys(userData.categoryBreakdown).length > 0) {
        const sorted = Object.entries(userData.categoryBreakdown as Record<string, number>)
            .sort(([, a], [, b]) => b - a);

        const totalExpenses = userData.totalExpenses || 1;
        const lines = sorted
            .map(([cat, amt]) => `  - ${cat}: ${fmt(amt)} (${pct((amt / totalExpenses) * 100)} of total)`)
            .join('\n');

        const topCat = sorted[0];
        const bottomCat = sorted[sorted.length - 1];
        const content = `
Spending by Category this month (${monthLabel} ${userData.year}):
${lines}

Highest spending category: ${topCat[0]} at ${fmt(topCat[1] as number)} — ${pct(((topCat[1] as number) / totalExpenses) * 100)} of total expenses.
Lowest spending category:  ${bottomCat[0]} at ${fmt(bottomCat[1] as number)} — ${pct(((bottomCat[1] as number) / totalExpenses) * 100)} of total expenses.
Number of active categories: ${sorted.length}
`.trim();

        chunks.push({
            id: next(), content,
            metadata: { type: 'category_spending', month: userData.month, year: userData.year, priority: 0 },
        });

        // Individual category chunks for precise retrieval
        sorted.forEach(([category, amount]) => {
            const catPct = pct(((amount as number) / totalExpenses) * 100);
            // Add previous month comparison if available
            let prevComparison = '';
            if (userData.previousMonth?.categoryBreakdown?.[category] !== undefined) {
                const prevAmt = userData.previousMonth.categoryBreakdown[category];
                const diff = (amount as number) - prevAmt;
                prevComparison = `\n- vs Last Month: ${fmt(prevAmt)} → ${fmt(amount as number)} (${diff > 0 ? 'increased' : 'decreased'} by ${fmt(Math.abs(diff))})`;
            }
            const catContent = `
Spending in ${category} (${monthLabel} ${userData.year}):
- Amount Spent: ${fmt(amount as number)}
- Share of Total Expenses: ${catPct}${prevComparison}
`.trim();
            chunks.push({
                id: next(), content: catContent,
                metadata: { type: 'category_spending', category, month: userData.month, year: userData.year, amount: amount as number, priority: 1 },
            });
        });
    }

    // ── 5. Merchant spending analysis ────────────────────────────────────────
    if (userData.merchantBreakdown && Object.keys(userData.merchantBreakdown).length > 0) {
        const sorted = Object.entries(userData.merchantBreakdown as Record<string, number>)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 15);

        const lines = sorted
            .map(([merchant, amt], i) => `  ${i + 1}. ${merchant}: ${fmt(amt as number)}`)
            .join('\n');

        const topMerchantPct = userData.totalExpenses > 0
            ? pct(((sorted[0][1] as number) / userData.totalExpenses) * 100) : '0%';

        const content = `
Top Merchants by Spending (${monthLabel} ${userData.year}):
${lines}

Most visited merchant: ${sorted[0][0]} with ${fmt(sorted[0][1] as number)} spent (${topMerchantPct} of total expenses).
Total unique merchants: ${Object.keys(userData.merchantBreakdown).length}
`.trim();

        chunks.push({
            id: next(), content,
            metadata: { type: 'merchant_spending', month: userData.month, year: userData.year, priority: 1 },
        });

        // Individual merchant chunks (top 10 only to control chunk count)
        sorted.slice(0, 10).forEach(([merchant, amount]) => {
            const merchantPct = userData.totalExpenses > 0
                ? pct(((amount as number) / userData.totalExpenses) * 100) : '0%';
            chunks.push({
                id: next(),
                content: `Spending at ${merchant}: ${fmt(amount as number)} (${merchantPct} of total) in ${monthLabel} ${userData.year}.`,
                metadata: { type: 'merchant_spending', merchant, amount: amount as number, priority: 2 },
            });
        });
    }

    // ── 6. Recent transactions ───────────────────────────────────────────────
    if (userData.recentTransactions && userData.recentTransactions.length > 0) {
        const lines = userData.recentTransactions
            .slice(0, 10)
            .map((t: any) => {
                const date = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                return `  - ${date} | ${t.type === 'expense' ? 'Expense ↑' : 'Income ↓'} | ${t.category} | ${t.merchant} | ${fmt(t.amount)} | via ${t.paymentMethod}${t.notes ? ' | ' + t.notes : ''}`;
            })
            .join('\n');

        const content = `
Recent Transactions (last 10):
${lines}
`.trim();

        chunks.push({
            id: next(), content,
            metadata: { type: 'recent_transactions', priority: 1 },
        });
    }

    // ── 7. Previous month comparison ─────────────────────────────────────────
    if (userData.previousMonth) {
        const prev = userData.previousMonth;
        const prevMonthLabel = MONTH_NAMES[(prev.month ?? 1) - 1];

        const expenseChange = userData.totalExpenses - (prev.totalExpenses ?? 0);
        const incomeChange = userData.totalIncome - (prev.totalIncome ?? 0);
        const savingsChange = userData.savings - (prev.savings ?? 0);

        const expenseDir = expenseChange > 0 ? 'increased' : expenseChange < 0 ? 'decreased' : 'unchanged';
        const incomeDir = incomeChange > 0 ? 'increased' : incomeChange < 0 ? 'decreased' : 'unchanged';
        const savingsDir = savingsChange > 0 ? 'improved' : savingsChange < 0 ? 'declined' : 'unchanged';

        const expensePctChange = prev.totalExpenses > 0
            ? pct(Math.abs(expenseChange) / prev.totalExpenses * 100) : 'N/A';
        const incomePctChange = prev.totalIncome > 0
            ? pct(Math.abs(incomeChange) / prev.totalIncome * 100) : 'N/A';

        const content = `
Month-over-Month Comparison (${prevMonthLabel} vs ${monthLabel}):

${prevMonthLabel} ${prev.year}:
  - Income:   ${fmt(prev.totalIncome)}
  - Expenses: ${fmt(prev.totalExpenses)}
  - Savings:  ${fmt(prev.savings)}

${monthLabel} ${userData.year}:
  - Income:   ${fmt(userData.totalIncome)}
  - Expenses: ${fmt(userData.totalExpenses)}
  - Savings:  ${fmt(userData.savings)}

Changes:
  - Expenses ${expenseDir} by ${fmt(Math.abs(expenseChange))} (${expensePctChange})
  - Income   ${incomeDir} by ${fmt(Math.abs(incomeChange))} (${incomePctChange})
  - Savings  ${savingsDir} by ${fmt(Math.abs(savingsChange))}
  - Overall trend: ${savingsChange >= 0 ? 'Financial health improving' : 'Financial health declining — attention needed'}
`.trim();

        chunks.push({
            id: next(), content,
            metadata: { type: 'monthly_comparison', month: userData.month, year: userData.year, priority: 0 },
        });

        // Category-level comparison
        if (prev.categoryBreakdown && userData.categoryBreakdown) {
            const allCats = new Set([
                ...Object.keys(prev.categoryBreakdown),
                ...Object.keys(userData.categoryBreakdown),
            ]);

            const catLines: string[] = [];
            let biggestIncrease = { cat: '', diff: 0 };
            let biggestDecrease = { cat: '', diff: 0 };

            allCats.forEach((cat) => {
                const prevAmt = prev.categoryBreakdown[cat] ?? 0;
                const currAmt = (userData.categoryBreakdown as any)[cat] ?? 0;
                const diff = currAmt - prevAmt;
                const dir = diff > 0 ? '↑ increased' : diff < 0 ? '↓ decreased' : '→ unchanged';
                catLines.push(`  - ${cat}: ${fmt(prevAmt)} → ${fmt(currAmt)} (${dir} by ${fmt(Math.abs(diff))})`);

                if (diff > biggestIncrease.diff) biggestIncrease = { cat, diff };
                if (diff < biggestDecrease.diff) biggestDecrease = { cat, diff };
            });

            const catContent = `
Category Spending Comparison (${prevMonthLabel} → ${monthLabel}):
${catLines.join('\n')}

Biggest increase: ${biggestIncrease.cat} (+${fmt(biggestIncrease.diff)})
Biggest decrease: ${biggestDecrease.cat} (${fmt(biggestDecrease.diff)})
`.trim();

            chunks.push({
                id: next(), content: catContent,
                metadata: { type: 'monthly_comparison', month: userData.month, year: userData.year, priority: 1 },
            });
        }
    }

    // ── 8. Spending-pattern & behavioural insights ───────────────────────────
    {
        const insights: string[] = [];

        const savingsRate = userData.totalIncome > 0
            ? (userData.savings / userData.totalIncome) * 100
            : 0;

        // Savings rate insight
        if (savingsRate >= 30) {
            insights.push(`Excellent savings rate of ${pct(savingsRate)} — well above the recommended 20% benchmark. Consider investing surplus.`);
        } else if (savingsRate >= 20) {
            insights.push(`Healthy savings rate of ${pct(savingsRate)} — meets the recommended 20% benchmark.`);
        } else if (savingsRate > 10) {
            insights.push(`Savings rate of ${pct(savingsRate)} — below the recommended 20% benchmark. A ${pct(20 - savingsRate)} increase (${fmt(Math.round(userData.totalIncome * (20 - savingsRate) / 100))}) would hit the target.`);
        } else if (savingsRate > 0) {
            insights.push(`Low savings rate of ${pct(savingsRate)} — significantly below 20% benchmark. Priority: reduce discretionary spending.`);
        } else {
            insights.push(`Negative savings: spending exceeds income by ${fmt(Math.abs(userData.savings))}. Immediate expense review critical.`);
        }

        // Budget utilisation insight
        if (userData.budget) {
            const b = userData.budget;
            if (b.percentage >= 100) {
                insights.push(`Budget fully exhausted — exceeded by ${fmt(Math.abs(b.remaining))}. All further spending is over-budget.`);
            } else if (b.percentage >= 90) {
                insights.push(`Budget 90%+ used (${pct(b.percentage)}) with ${userData.daysLeft} days remaining — high risk of overspending.`);
            } else if (b.percentage >= 80) {
                insights.push(`Budget 80%+ used (${pct(b.percentage)}) — approaching alert threshold. Caution advised.`);
            } else if (b.percentage < 50 && userData.daysLeft <= 10) {
                insights.push(`Budget under-utilized at ${pct(b.percentage)} with only ${userData.daysLeft} days left — good financial discipline.`);
            }
        }

        // Category concentration risk
        if (userData.categoryBreakdown) {
            const catEntries = Object.entries(userData.categoryBreakdown as Record<string, number>)
                .sort(([, a], [, b]) => b - a);
            const topCat = catEntries[0];
            if (topCat) {
                const topPct = userData.totalExpenses > 0
                    ? (topCat[1] / userData.totalExpenses) * 100
                    : 0;
                if (topPct > 50) {
                    insights.push(`⚠️ ${topCat[0]} dominates spending at ${pct(topPct)} of total — high concentration risk. Diversify spending or reduce.`);
                } else if (topPct > 35) {
                    insights.push(`${topCat[0]} is the largest category at ${pct(topPct)} — monitor for overspending pattern.`);
                }
            }

            // Check for potentially high discretionary spend
            const discretionary = ['Entertainment', 'Shopping', 'Food'];
            const discretionaryTotal = catEntries
                .filter(([cat]) => discretionary.includes(cat))
                .reduce((s, [, amt]) => s + amt, 0);
            if (discretionaryTotal > 0 && userData.totalExpenses > 0) {
                const discPct = (discretionaryTotal / userData.totalExpenses) * 100;
                if (discPct > 50) {
                    insights.push(`Discretionary spending (Food, Shopping, Entertainment) is ${pct(discPct)} of total — consider reducing by ${pct(discPct - 40)} to improve savings.`);
                }
            }
        }

        // Payment method pattern
        if (userData.recentTransactions && userData.recentTransactions.length > 0) {
            const methodCounts: Record<string, number> = {};
            userData.recentTransactions.forEach((t: any) => {
                if (t.type === 'expense') {
                    methodCounts[t.paymentMethod] = (methodCounts[t.paymentMethod] || 0) + 1;
                }
            });
            const topMethod = Object.entries(methodCounts).sort(([, a], [, b]) => b - a)[0];
            if (topMethod) {
                insights.push(`Primary payment method: ${topMethod[0]} (${topMethod[1]} of last ${userData.recentTransactions.filter((t: any) => t.type === 'expense').length} expenses).`);
            }
        }

        // Upcoming financial risk
        if (userData.reminders && userData.reminders.length > 0) {
            const totalDue = userData.reminders.reduce((s: number, r: any) => s + r.amount, 0);
            const dueIn7Days = userData.reminders.filter((r: any) => {
                const days = (new Date(r.dueDate).getTime() - Date.now()) / 86400000;
                return days <= 7;
            });
            if (dueIn7Days.length > 0) {
                const urgentTotal = dueIn7Days.reduce((s: number, r: any) => s + r.amount, 0);
                insights.push(`${dueIn7Days.length} bill(s) due within 7 days totalling ${fmt(urgentTotal)} — ensure sufficient funds available.`);
            }
            insights.push(`Total upcoming obligations: ${fmt(totalDue)} across ${userData.reminders.length} payment(s).`);
        }

        // Month-over-month trend
        if (userData.previousMonth) {
            const prev = userData.previousMonth;
            if (prev.totalExpenses > 0 && userData.totalExpenses > prev.totalExpenses) {
                const increasePct = ((userData.totalExpenses - prev.totalExpenses) / prev.totalExpenses) * 100;
                if (increasePct > 20) {
                    insights.push(`Spending increased ${pct(increasePct)} vs last month — significant surge detected.`);
                }
            }
        }

        if (insights.length > 0) {
            const content = `
Spending Pattern & Behavioural Insights (${monthLabel} ${userData.year}):
${insights.map(i => `  • ${i}`).join('\n')}
`.trim();

            chunks.push({
                id: next(), content,
                metadata: { type: 'spending_pattern', month: userData.month, year: userData.year, priority: 0 },
            });
        }
    }

    // ── 9. Financial health composite score ─────────────────────────────────
    {
        let healthScore = 50; // base score
        const factors: string[] = [];

        const savingsRate = userData.totalIncome > 0
            ? (userData.savings / userData.totalIncome) * 100 : 0;

        // Savings rate factor (-20 to +25)
        if (savingsRate >= 20) {
            healthScore += 25;
            factors.push(`Savings rate ${pct(savingsRate)} (+25 points — excellent)`);
        } else if (savingsRate >= 10) {
            healthScore += 10;
            factors.push(`Savings rate ${pct(savingsRate)} (+10 points — moderate)`);
        } else if (savingsRate > 0) {
            healthScore += 0;
            factors.push(`Savings rate ${pct(savingsRate)} (+0 points — needs improvement)`);
        } else {
            healthScore -= 20;
            factors.push(`Negative savings (-20 points — critical)`);
        }

        // Budget adherence factor (-15 to +15)
        if (userData.budget) {
            const b = userData.budget;
            if (!b.isOverBudget && b.percentage < 80) {
                healthScore += 15;
                factors.push(`Budget on track at ${pct(b.percentage)} (+15 points)`);
            } else if (!b.isOverBudget) {
                healthScore += 5;
                factors.push(`Budget near limit at ${pct(b.percentage)} (+5 points)`);
            } else {
                healthScore -= 15;
                factors.push(`Over budget (-15 points)`);
            }
        } else {
            healthScore -= 5;
            factors.push(`No budget set (-5 points — set one for better control)`);
        }

        // Bill management factor (-10 to +10)
        if (userData.reminders && userData.reminders.length > 0) {
            const overdue = userData.reminders.filter((r: any) => {
                return new Date(r.dueDate).getTime() < Date.now();
            });
            if (overdue.length === 0) {
                healthScore += 10;
                factors.push(`All bills current (+10 points)`);
            } else {
                healthScore -= 10;
                factors.push(`${overdue.length} overdue bill(s) (-10 points)`);
            }
        }

        healthScore = Math.max(0, Math.min(100, healthScore));

        const grade = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs Attention';

        const content = `
Financial Health Score for ${monthLabel} ${userData.year}: ${healthScore}/100 (${grade})

Scoring factors:
${factors.map(f => `  • ${f}`).join('\n')}

Recommendations:
${healthScore < 60 ? '  • Focus on reducing expenses to improve savings rate\n  • Set or revise budget to stay within limits' : '  • Continue current spending discipline\n  • Consider building an emergency fund with surplus savings'}
`.trim();

        chunks.push({
            id: next(), content,
            metadata: { type: 'financial_health', month: userData.month, year: userData.year, priority: 0 },
        });
    }

    // ── 10. Upcoming bills / reminders ────────────────────────────────────────
    if (userData.reminders && userData.reminders.length > 0) {
        const lines = userData.reminders.map((r: any) => {
            const due = new Date(r.dueDate);
            const daysUntil = Math.ceil((due.getTime() - Date.now()) / 86400000);
            const urgency = daysUntil <= 3 ? '🔴 URGENT' : daysUntil <= 7 ? '🟡 Soon' : '🟢 Upcoming';
            return `  - ${r.title}: ${fmt(r.amount)} | Due in ${daysUntil} days (${due.toLocaleDateString('en-IN')}) | ${urgency} | Type: ${r.type}`;
        }).join('\n');

        const totalDue = userData.reminders.reduce((s: number, r: any) => s + r.amount, 0);

        const content = `
Upcoming Bills and Reminders:
${lines}

Total amount due: ${fmt(totalDue)}
Number of pending payments: ${userData.reminders.length}
`.trim();

        chunks.push({
            id: next(), content,
            metadata: { type: 'reminder', priority: 1 },
        });
    }

    // ── 11. Achievements ─────────────────────────────────────────────────────
    if (userData.achievements) {
        const hist = (userData.achievements.history ?? [])
            .map((a: any) => `  - ${MONTH_NAMES[a.month - 1]} ${a.year}: ${a.status}`)
            .join('\n');

        const consecutiveStars = (userData.achievements.history ?? [])
            .filter((a: any) => a.status === 'awarded' || a.status === 'finalized').length;

        const content = `
Achievement and Star History:
- Total Stars Earned: ${userData.achievements.totalStars} ⭐
- Budget Success Streak: ${consecutiveStars} month(s)
- History (recent):
${hist}

Stars are awarded for staying within monthly budget. Each star represents a successful budgeting month.
${userData.budget && !userData.budget.isOverBudget && userData.isEndOfMonth ? 'Current month: On track for a new star! 🌟' : ''}
`.trim();

        chunks.push({
            id: next(), content,
            metadata: { type: 'achievement', priority: 2 },
        });
    }

    // ── 12. Family ───────────────────────────────────────────────────────────
    if (userData.family) {
        const f = userData.family;
        const content = `
Family Information:
- Family Name:   ${f.familyName}
- Total Members: ${f.memberCount}
- Your Role:     ${f.currentMemberRole}
- Your Relation: ${f.currentMemberRelation}
- Can View Family Expenses: ${f.canViewFamilyData ? 'Yes' : 'No'}
- Shared Budget: ${f.sharedBudget?.amount ? fmt(f.sharedBudget.amount) : 'Not set'}
`.trim();

        chunks.push({
            id: next(), content,
            metadata: { type: 'family', priority: 2 },
        });
    }

    return chunks;
}

// ─── Embedding API ────────────────────────────────────────────────────────────

/**
 * Generate a single 1536-dimensional embedding.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
        dimensions: EMBEDDING_DIMENSIONS,
    });
    return response.data[0].embedding;
}

/**
 * Batch-embed multiple texts in a SINGLE API call.
 * OpenAI supports batch input — this is 10-20x faster than per-chunk calls.
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
        dimensions: EMBEDDING_DIMENSIONS,
    });

    // Sort by index to maintain order
    return response.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);
}

/**
 * Cosine similarity between two vectors (optimised loop).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        magA += vecA[i] * vecA[i];
        magB += vecB[i] * vecB[i];
    }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Embed all financial data chunks using batch embedding (single API call).
 * Falls back to individual embedding if batch fails.
 */
export async function embedFinancialData(
    chunks: FinancialDataChunk[]
): Promise<FinancialDataChunk[]> {
    if (chunks.length === 0) return [];

    try {
        // Attempt batch embedding — single API call for all chunks
        const texts = chunks.map((c) => c.content);
        const embeddings = await generateBatchEmbeddings(texts);

        return chunks.map((chunk, i) => ({
            ...chunk,
            embedding: embeddings[i] ?? undefined,
        }));
    } catch (batchErr) {
        console.warn('[FinMate] Batch embedding failed, falling back to individual calls:', batchErr);

        // Fallback: embed individually (slower but more resilient)
        return Promise.all(
            chunks.map(async (chunk) => {
                try {
                    const embedding = await generateEmbedding(chunk.content);
                    return { ...chunk, embedding };
                } catch (err) {
                    console.error(`[FinMate] Failed to embed chunk ${chunk.id}:`, err);
                    return chunk;
                }
            })
        );
    }
}

/**
 * Retrieve the top-K most semantically relevant chunks for a query.
 * Uses cosine similarity with optional priority boosting.
 */
export async function findRelevantChunks(
    query: string,
    chunks: FinancialDataChunk[],
    topK: number = 6
): Promise<FinancialDataChunk[]> {
    const queryEmbedding = await generateEmbedding(query);

    return chunks
        .filter((c) => c.embedding && c.embedding.length > 0)
        .map((c) => {
            let score = cosineSimilarity(queryEmbedding, c.embedding!);
            // Slight boost for high-priority chunks (summary, budget, patterns)
            if (c.metadata.priority === 0) score += 0.02;
            return { chunk: c, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map((item) => item.chunk);
}
