/**
 * AI-Based Expense Categorization Service
 * Uses OpenAI to intelligently classify transactions into expense categories
 * based on merchant name, description, and transaction notes.
 * 
 * This is NOT static keyword matching — it's adaptive AI categorization.
 */
import OpenAI from 'openai';
import config from '../config';

const EXPENSE_CATEGORIES = [
  'Groceries',
  'EMI',
  'Rent',
  'Utilities',
  'Shopping',
  'Transport',
  'Food',
  'Healthcare',
  'Education',
  'Entertainment',
  'Investment',
  'Salary',
  'Gift',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

interface CategorizationResult {
  category: ExpenseCategory;
  confidence: number; // 0 to 1
  reasoning: string;
}

// In-memory LRU cache to avoid redundant API calls
const categoryCache = new Map<string, CategorizationResult>();
const CACHE_MAX_SIZE = 500;

function getCacheKey(merchant: string, description?: string, notes?: string): string {
  return `${(merchant || '').toLowerCase().trim()}|${(description || '').toLowerCase().trim()}|${(notes || '').toLowerCase().trim()}`;
}

function addToCache(key: string, result: CategorizationResult): void {
  if (categoryCache.size >= CACHE_MAX_SIZE) {
    // Remove oldest entry
    const firstKey = categoryCache.keys().next().value;
    if (firstKey) categoryCache.delete(firstKey);
  }
  categoryCache.set(key, result);
}

/**
 * Classify a transaction using AI (OpenAI GPT)
 */
export async function categorizeTransaction(params: {
  merchant: string;
  description?: string;
  notes?: string;
  amount?: number;
}): Promise<CategorizationResult> {
  const cacheKey = getCacheKey(params.merchant, params.description, params.notes);

  // Check cache first
  const cached = categoryCache.get(cacheKey);
  if (cached) return cached;

  // If OpenAI is not configured, use rule-based fallback
  if (!config.openaiApiKey) {
    const fallback = ruleBasedCategorize(params.merchant, params.description, params.notes);
    addToCache(cacheKey, fallback);
    return fallback;
  }

  try {
    const openai = new OpenAI({ apiKey: config.openaiApiKey });

    const prompt = `You are a financial transaction categorizer for Indian users. Classify this transaction into EXACTLY one of these categories: ${EXPENSE_CATEGORIES.join(', ')}.

Transaction Details:
- Merchant: ${params.merchant}
${params.description ? `- Description: ${params.description}` : ''}
${params.notes ? `- Notes: ${params.notes}` : ''}
${params.amount ? `- Amount: ₹${params.amount}` : ''}

Context: This is an Indian payment (likely UPI). Consider Indian merchant names, food chains, utility providers, e-commerce platforms, etc.

Respond ONLY with valid JSON: {"category": "<category>", "confidence": <0.0-1.0>, "reasoning": "<brief reason>"}`;

    const response = await openai.chat.completions.create({
      model: config.openaiModel || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.1, // Low temperature for consistent categorization
    });

    const content = response.choices[0]?.message?.content?.trim() || '';

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const category = EXPENSE_CATEGORIES.includes(parsed.category)
        ? parsed.category
        : 'Other';
      const result: CategorizationResult = {
        category,
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || 'AI classification',
      };
      addToCache(cacheKey, result);
      return result;
    }

    // Fallback if AI response is malformed
    const fallback = ruleBasedCategorize(params.merchant, params.description, params.notes);
    addToCache(cacheKey, fallback);
    return fallback;
  } catch (error) {
    console.error('AI categorization error, falling back to rules:', error);
    const fallback = ruleBasedCategorize(params.merchant, params.description, params.notes);
    addToCache(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Rule-based fallback when AI is unavailable
 * This is a safety net, NOT the primary categorizer
 */
function ruleBasedCategorize(
  merchant: string,
  description?: string,
  notes?: string
): CategorizationResult {
  const text = `${merchant} ${description || ''} ${notes || ''}`.toLowerCase();

  const rules: Array<{ keywords: string[]; category: ExpenseCategory }> = [
    { keywords: ['swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'biryani', 'pizza', 'burger', 'dominos', 'mcdonalds', 'kfc', 'dining'], category: 'Food' },
    { keywords: ['bigbasket', 'blinkit', 'grofers', 'dmart', 'grocery', 'vegetables', 'fruits', 'kirana', 'supermarket', 'zepto', 'instamart'], category: 'Groceries' },
    { keywords: ['emi', 'loan', 'bajaj', 'hdfc loan', 'personal loan', 'home loan', 'car loan', 'equated monthly'], category: 'EMI' },
    { keywords: ['rent', 'house rent', 'pg rent', 'apartment', 'landlord'], category: 'Rent' },
    { keywords: ['electricity', 'water bill', 'gas bill', 'internet', 'broadband', 'wifi', 'jio', 'airtel', 'vi ', 'bsnl', 'mobile recharge', 'dth', 'tata sky', 'piped gas'], category: 'Utilities' },
    { keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'shopping', 'mall', 'clothes', 'electronics', 'nykaa', 'snapdeal'], category: 'Shopping' },
    { keywords: ['uber', 'ola', 'rapido', 'metro', 'bus', 'train', 'irctc', 'petrol', 'diesel', 'fuel', 'parking', 'toll', 'cab', 'auto'], category: 'Transport' },
    { keywords: ['hospital', 'doctor', 'pharmacy', 'medical', 'medicine', 'apollo', 'medplus', 'netmeds', 'pharmeasy', '1mg', 'clinic', 'dental', 'health'], category: 'Healthcare' },
    { keywords: ['school', 'college', 'university', 'tuition', 'course', 'udemy', 'coursera', 'coaching', 'books', 'education', 'exam', 'fee'], category: 'Education' },
    { keywords: ['netflix', 'hotstar', 'prime video', 'spotify', 'movie', 'theatre', 'gaming', 'entertainment', 'concert', 'event'], category: 'Entertainment' },
    { keywords: ['mutual fund', 'stock', 'zerodha', 'groww', 'upstox', 'investment', 'sip', 'fd ', 'fixed deposit', 'ppf', 'nps'], category: 'Investment' },
    { keywords: ['salary', 'wage', 'income', 'freelance', 'payment received', 'credit'], category: 'Salary' },
    { keywords: ['gift', 'donation', 'charity', 'shagun', 'wedding gift'], category: 'Gift' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return {
        category: rule.category,
        confidence: 0.6,
        reasoning: `Rule-based match (AI unavailable)`,
      };
    }
  }

  return {
    category: 'Other',
    confidence: 0.3,
    reasoning: 'No matching pattern found',
  };
}

/**
 * Batch categorize multiple transactions
 */
export async function batchCategorize(
  transactions: Array<{
    merchant: string;
    description?: string;
    notes?: string;
    amount?: number;
  }>
): Promise<CategorizationResult[]> {
  return Promise.all(transactions.map((t) => categorizeTransaction(t)));
}

export default {
  categorizeTransaction,
  batchCategorize,
  EXPENSE_CATEGORIES,
};
