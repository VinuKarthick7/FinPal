/**
 * Embedding Service for FinMate RAG
 * 
 * Converts user's financial data into semantic embeddings for similarity search
 */

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

export interface FinancialDataChunk {
    id: string;
    content: string;
    metadata: {
        type: 'transaction' | 'budget' | 'reminder' | 'achievement' | 'family' | 'summary';
        date?: Date;
        category?: string;
        amount?: number;
    };
    embedding?: number[];
}

/**
 * Generate embedding for a text chunk
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const response = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: text,
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
    }
}

/**
 * Create searchable chunks from user's financial data
 */
export function createFinancialDataChunks(userData: any): FinancialDataChunk[] {
    const chunks: FinancialDataChunk[] = [];
    let chunkId = 0;

    // Budget summary chunk
    if (userData.budget) {
        const budgetContent = `
Current Budget Status:
- Total Budget: ₹${userData.budget.total.toLocaleString('en-IN')}
- Spent: ₹${userData.budget.spent.toLocaleString('en-IN')}
- Remaining: ₹${userData.budget.remaining.toLocaleString('en-IN')}
- Budget Usage: ${userData.budget.percentage}%
- Status: ${userData.budget.isOverBudget ? 'Over Budget' : 'Within Budget'}
- Days Left in Month: ${userData.daysLeft}
        `.trim();

        chunks.push({
            id: `chunk_${chunkId++}`,
            content: budgetContent,
            metadata: {
                type: 'budget',
                amount: userData.budget.total,
            },
        });

        // Category budgets
        if (userData.budget.categoryBudgets) {
            Object.entries(userData.budget.categoryBudgets as Record<string, any>).forEach(([category, budget]: [string, any]) => {
                const categoryContent = `
Category: ${category}
- Budgeted: ₹${budget.budgeted.toLocaleString('en-IN')}
- Spent: ₹${budget.spent.toLocaleString('en-IN')}
- Remaining: ₹${budget.remaining.toLocaleString('en-IN')}
                `.trim();

                chunks.push({
                    id: `chunk_${chunkId++}`,
                    content: categoryContent,
                    metadata: {
                        type: 'budget',
                        category,
                        amount: budget.spent,
                    },
                });
            });
        }
    }

    // Spending summary chunk
    const spendingSummary = `
Monthly Spending Summary:
- Total Expenses: ₹${userData.totalExpenses.toLocaleString('en-IN')}
- Total Income: ₹${userData.totalIncome.toLocaleString('en-IN')}
- Net Savings: ₹${userData.savings.toLocaleString('en-IN')}
- Number of Transactions: ${userData.transactions.total}
    `.trim();

    chunks.push({
        id: `chunk_${chunkId++}`,
        content: spendingSummary,
        metadata: {
            type: 'summary',
            amount: userData.totalExpenses,
        },
    });

    // Category breakdown chunks
    if (userData.categoryBreakdown) {
        Object.entries(userData.categoryBreakdown as Record<string, number>).forEach(([category, amount]) => {
            const categoryContent = `
Spending in ${category}: ₹${amount.toLocaleString('en-IN')}
            `.trim();

            chunks.push({
                id: `chunk_${chunkId++}`,
                content: categoryContent,
                metadata: {
                    type: 'summary',
                    category,
                    amount,
                },
            });
        });
    }

    // Reminders chunk
    if (userData.reminders && userData.reminders.length > 0) {
        const remindersContent = `
Upcoming Bills and Reminders:
${userData.reminders.map((r: any) => 
    `- ${r.title}: ₹${r.amount.toLocaleString('en-IN')} (Due: ${new Date(r.dueDate).toLocaleDateString('en-IN')})`
).join('\n')}
        `.trim();

        chunks.push({
            id: `chunk_${chunkId++}`,
            content: remindersContent,
            metadata: {
                type: 'reminder',
            },
        });
    }

    // Achievements chunk
    if (userData.achievements) {
        const achievementsContent = `
Achievements and Stars:
- Total Stars Earned: ${userData.achievements.totalStars} ⭐
- Recent Performance: ${userData.achievements.history.map((a: any) => 
    `${a.month}/${a.year}: ${a.status}`
).join(', ')}
        `.trim();

        chunks.push({
            id: `chunk_${chunkId++}`,
            content: achievementsContent,
            metadata: {
                type: 'achievement',
            },
        });
    }

    // Family data chunk
    if (userData.family) {
        const familyContent = `
Family Information:
- Family Name: ${userData.family.familyName}
- Members: ${userData.family.memberCount}
- Your Role: ${userData.family.currentMemberRole}
- Relation: ${userData.family.currentMemberRelation}
- Shared Budget: ₹${userData.family.sharedBudget?.toLocaleString('en-IN') || '0'}
- Can View Family Data: ${userData.family.canViewFamilyData ? 'Yes' : 'No'}
        `.trim();

        chunks.push({
            id: `chunk_${chunkId++}`,
            content: familyContent,
            metadata: {
                type: 'family',
            },
        });
    }

    return chunks;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Embed all financial data chunks
 */
export async function embedFinancialData(chunks: FinancialDataChunk[]): Promise<FinancialDataChunk[]> {
    const embeddedChunks = await Promise.all(
        chunks.map(async (chunk) => {
            try {
                const embedding = await generateEmbedding(chunk.content);
                return { ...chunk, embedding };
            } catch (error) {
                console.error(`Error embedding chunk ${chunk.id}:`, error);
                return chunk;
            }
        })
    );
    return embeddedChunks;
}

/**
 * Find most relevant chunks for a query
 */
export async function findRelevantChunks(
    query: string, 
    chunks: FinancialDataChunk[], 
    topK: number = 5
): Promise<FinancialDataChunk[]> {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Calculate similarities
    const chunksWithScores = chunks
        .filter(chunk => chunk.embedding)
        .map(chunk => ({
            chunk,
            score: cosineSimilarity(queryEmbedding, chunk.embedding!),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    return chunksWithScores.map(item => item.chunk);
}
