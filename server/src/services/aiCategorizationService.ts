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
 * Clear the categorization cache - useful when updating rules
 */
export function clearCategorizationCache(): void {
  categoryCache.clear();
  console.log('🗑️ Categorization cache cleared');
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

  // Try rule-based categorization first for common patterns
  const ruleResult = ruleBasedCategorize(params.merchant, params.description, params.notes);
  
  // If rule-based gives a high confidence match (not "Other"), use it immediately
  if (ruleResult.category !== 'Other') {
    console.log(`✅ Rule-based match: "${params.merchant}" → ${ruleResult.category}`);
    addToCache(cacheKey, ruleResult);
    return ruleResult;
  }

  // If OpenAI is not configured, use rule-based result (even if it's "Other")
  if (!config.openaiApiKey) {
    addToCache(cacheKey, ruleResult);
    return ruleResult;
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

Category Guidelines:
- Education: School/college fees, tuition, courses, books, training, workshops, seminars, hackathons, competitions, coding contests, tech events, bootcamps, conferences, study materials, certifications, exams
- Entertainment: Movies, concerts, games, OTT subscriptions, cultural events, festivals
- Food: Restaurants, cafes, food delivery (Swiggy, Zomato), ANY food items like biryani/briyani/biriyani, dosa, pizza, burger, chicken, mutton, paneer, noodles, momos, thali, meals, snacks, chai, coffee, juice, desserts, bakery items
- Groceries: Supermarkets, vegetable/fruit vendors, BigBasket, Blinkit
- Transport: Uber, Ola, fuel, metro, train, flights

IMPORTANT: If the merchant name or description contains ANY food item name (biryani, briyani, dosa, pizza, etc.), it MUST be categorized as "Food".

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
    { 
      keywords: [
        'swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'food', 'biryani', 'briyani', 'biriyani', 'pizza', 'burger', 
        'dominos', 'mcdonalds', 'kfc', 'dining', 'snacks', 'snack', 'breakfast', 'lunch', 'dinner',
        'dosa', 'idli', 'vada', 'samosa', 'chai', 'tea', 'paratha', 'thali', 'meal', 'eating',
        'bakery', 'sweet', 'mithai', 'haldiram', 'bikanervala', 'subway', 'starbucks',
        'beverage', 'juice', 'lassi', 'chole', 'paneer', 'chicken', 'mutton', 'fish', 'egg',
        'noodles', 'momos', 'chaat', 'pav bhaji', 'vadapav', 'frankie', 'roll', 'wrap',
        'sandwich', 'pasta', 'ice cream', 'dessert', 'cake', 'pastry', 'tiffin', 'canteen',
        'dhaba', 'udupi', 'south indian', 'north indian', 'chinese', 'continental',
        'fastfood', 'fast food', 'eatery', 'foodcourt', 'food court', 'mess',
        'pulao', 'pulav', 'fried rice', 'naan', 'roti', 'chapati', 'kulcha', 'tandoori',
        'kebab', 'kabab', 'tikka', 'korma', 'curry', 'dal makhani', 'butter chicken',
        'curd', 'raita', 'pickle', 'papad', 'chutney', 'puri', 'bhaji', 'poha', 'upma'
      ], 
      category: 'Food' 
    },
    { 
      keywords: [
        'bigbasket', 'blinkit', 'grofers', 'dmart', 'grocery', 'vegetables', 'fruits', 
        'kirana', 'supermarket', 'zepto', 'instamart', 'jiomart', 'amazon fresh',
        'milk', 'bread', 'eggs', 'rice', 'wheat', 'atta', 'dal', 'oil', 'ghee',
        'spices', 'masala', 'provisions', 'staples', 'fresh', 'organic'
      ], 
      category: 'Groceries' 
    },
    { 
      keywords: [
        'emi', 'loan', 'bajaj', 'hdfc loan', 'personal loan', 'home loan', 'car loan', 
        'equated monthly', 'installment', 'instalment', 'finance', 'credit card bill'
      ], 
      category: 'EMI' 
    },
    { 
      keywords: [
        'rent', 'house rent', 'pg rent', 'apartment', 'landlord', 'accommodation',
        'hostel', 'room rent', 'flat rent', 'maintenance'
      ], 
      category: 'Rent' 
    },
    { 
      keywords: [
        'electricity', 'water bill', 'gas bill', 'internet', 'broadband', 'wifi', 
        'jio', 'airtel', 'vi ', 'bsnl', 'mobile recharge', 'dth', 'tata sky', 'piped gas',
        'prepaid', 'postpaid', 'bill payment', 'utility', 'utilities', 'phone bill',
        'tata play', 'dish tv', 'sun direct', 'vodafone', 'idea', 'reliance'
      ], 
      category: 'Utilities' 
    },
    { 
      keywords: [
        'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'shopping', 'mall', 'clothes', 
        'electronics', 'nykaa', 'snapdeal', 'store', 'shop', 'market', 'garment',
        'fashion', 'apparel', 'footwear', 'shoes', 'accessories', 'cosmetics',
        'purchase', 'buy', 'order', 'retail', 'online shopping'
      ], 
      category: 'Shopping' 
    },
    { 
      keywords: [
        'uber', 'ola', 'rapido', 'metro', 'bus', 'train', 'irctc', 'petrol', 'diesel', 
        'fuel', 'parking', 'toll', 'cab', 'auto', 'taxi', 'rickshaw', 'transport',
        'travel', 'commute', 'ride', 'booking', 'railways', 'flight', 'airline',
        'indigo', 'spicejet', 'air india', 'vistara', 'goibibo', 'makemytrip'
      ], 
      category: 'Transport' 
    },
    { 
      keywords: [
        'hospital', 'doctor', 'pharmacy', 'medical', 'medicine', 'apollo', 'medplus', 
        'netmeds', 'pharmeasy', '1mg', 'clinic', 'dental', 'health', 'healthcare',
        'diagnostic', 'lab', 'test', 'checkup', 'consultation', 'prescription',
        'surgery', 'treatment', 'therapy', 'physiotherapy', 'nursing'
      ], 
      category: 'Healthcare' 
    },
    { 
      keywords: [
        'school', 'college', 'university', 'tuition', 'course', 'udemy', 'coursera', 
        'coaching', 'books', 'education', 'exam', 'fee', 'admission', 'certificate',
        'training', 'workshop', 'seminar', 'class', 'academy', 'institute',
        'learning', 'study', 'notebook', 'stationery', 'hackathon', 'competition',
        'contest', 'project', 'tech event', 'coding', 'bootcamp', 'conference'
      ], 
      category: 'Education' 
    },
    { 
      keywords: [
        'netflix', 'hotstar', 'prime video', 'spotify', 'movie', 'theatre', 'gaming', 
        'entertainment', 'concert', 'event', 'subscription', 'ott', 'streaming',
        'youtube premium', 'disney', 'zee5', 'sonyliv', 'voot', 'mx player',
        'game', 'play', 'cinema', 'pvr', 'inox', 'show', 'ticket', 'culturals',
        'cultural', 'fest', 'festival', 'program', 'programme', 'performance',
        'exhibition', 'fair', 'carnival', 'celebration', 'function'
      ], 
      category: 'Entertainment' 
    },
    { 
      keywords: [
        'mutual fund', 'stock', 'zerodha', 'groww', 'upstox', 'investment', 'sip', 
        'fd ', 'fixed deposit', 'ppf', 'nps', 'trading', 'demat', 'portfolio',
        'equity', 'bond', 'share', 'market', 'invest', 'gold'
      ], 
      category: 'Investment' 
    },
    { 
      keywords: [
        'salary', 'wage', 'income', 'freelance', 'payment received', 'credit',
        'earnings', 'stipend', 'bonus', 'incentive', 'commission'
      ], 
      category: 'Salary' 
    },
    { 
      keywords: [
        'gift', 'donation', 'charity', 'shagun', 'wedding gift', 'present',
        'contribute', 'contribution', 'ngo', 'temple', 'church', 'mosque', 'gurudwara'
      ], 
      category: 'Gift' 
    },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return {
        category: rule.category,
        confidence: 0.7,
        reasoning: `Rule-based match: "${merchant}"`,
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
