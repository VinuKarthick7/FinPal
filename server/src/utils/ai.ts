

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
 * AI integration has been removed. This function now returns a static message.
 * Keeping the function signature to avoid breaking imports elsewhere.
 */
export const generateAIInsights = async (_question: string, _summary: any): Promise<string> => {
  return 'AI integration has been disabled in this deployment.';
};