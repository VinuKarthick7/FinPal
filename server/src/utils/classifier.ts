/**
 * Local utility to classify an expense description into a predefined category
 * Uses a simple keyword dictionary for classification
 */
const keywordDictionary: Record<string, string> = {
  // Food items - comprehensive list
  dinner: 'Food',
  lunch: 'Food',
  breakfast: 'Food',
  hotel: 'Food',
  restaurant: 'Food',
  cafe: 'Food',
  coffee: 'Food',
  biryani: 'Food',
  briyani: 'Food',
  biriyani: 'Food',
  pizza: 'Food',
  burger: 'Food',
  dosa: 'Food',
  idli: 'Food',
  vada: 'Food',
  samosa: 'Food',
  chai: 'Food',
  tea: 'Food',
  paratha: 'Food',
  thali: 'Food',
  meal: 'Food',
  snacks: 'Food',
  snack: 'Food',
  canteen: 'Food',
  food: 'Food',
  swiggy: 'Food',
  zomato: 'Food',
  dominos: 'Food',
  mcdonalds: 'Food',
  kfc: 'Food',
  subway: 'Food',
  starbucks: 'Food',
  chicken: 'Food',
  mutton: 'Food',
  paneer: 'Food',
  noodles: 'Food',
  momos: 'Food',
  chaat: 'Food',
  sandwich: 'Food',
  pasta: 'Food',
  dessert: 'Food',
  cake: 'Food',
  juice: 'Food',
  lassi: 'Food',
  dhaba: 'Food',
  pulao: 'Food',
  kebab: 'Food',
  tikka: 'Food',
  curry: 'Food',
  roti: 'Food',
  naan: 'Food',
  // Travel
  uber: 'Travel',
  ola: 'Travel',
  rapido: 'Travel',
  fuel: 'Travel',
  petrol: 'Travel',
  diesel: 'Travel',
  metro: 'Travel',
  bus: 'Travel',
  train: 'Travel',
  flight: 'Travel',
  irctc: 'Travel',
  cab: 'Travel',
  taxi: 'Travel',
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
