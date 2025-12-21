/**
 * Local utility to classify an expense description into a predefined category
 * Uses a simple keyword dictionary for classification
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

  // Fallback
  return 'Other';
};
