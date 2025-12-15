

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Local utility to classify an expense description into a predefined category
 * Uses keyword dictionary first, then falls back to ML (placeholder)
 */
const keywordDictionary: Record<string, string> = {
  dinner: 'Food',
  lunch: 'Food',
  hotel: 'Food',
  uber: 'Travel',
  ola: 'Travel',
  fuel: 'Travel',
};

export const classifyExpense = async (
  description: string,
  categories: string[]
): Promise<string> => {
  const desc = description.toLowerCase();
  for (const [keyword, category] of Object.entries(keywordDictionary)) {
    if (desc.includes(keyword) && categories.includes(category)) {
      return category;
    }
  }

  // Fallback: ML classifier (to be implemented)
  // TODO: Implement TF-IDF + Logistic Regression fallback
  return 'Other';
};

/**
 * Generates AI insights based on user question and aggregated summary
 * @param question - User's question
 * @param summary - Aggregated financial summary
 * @returns AI response string
 */
export const generateAIInsights = async (question: string, summary: any): Promise<string> => {
  if (!process.env.OPENAI_API_KEY) {
    return 'AI insights are not available. Please configure OpenAI API key.';
  }

  const rules = [
    'Food above 30% is considered high',
    'Housing above 35% may indicate stress',
    'Savings below 20% is suboptimal',
    'Use only the provided summary',
    'Never request or assume missing data',
    'Never give guarantees or predictions',
    'Never suggest investments, loans, or credit products',
    'Always explain reasoning',
    'Always include a disclaimer',
  ];

  const systemPrompt = `You are a financial insights assistant. You must follow these rules: ${rules.join(', ')}. If information is insufficient, say so.`;

  const userPrompt = `Question: ${question}\nSummary: ${JSON.stringify(summary)}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 300,
    temperature: 0.3,
  });

  let aiResponse = response.choices?.[0]?.message?.content?.trim() || 'I cannot provide insights based on the available data.';

  // Post-processing: Add disclaimer if not present
  if (!aiResponse.includes('disclaimer') && !aiResponse.includes('not financial advice')) {
    aiResponse += '\n\nThis insight is based on aggregated data and is not financial advice.';
  }

  // Cap length
  if (aiResponse.length > 500) {
    aiResponse = aiResponse.substring(0, 500) + '...';
  }

  return aiResponse;
};