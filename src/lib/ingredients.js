// Ingredient categories and name clean-up for FR-04.
export const CATEGORIES = {
  Proteins: ['Chicken breast', 'Eggs', 'Salmon', 'Tofu', 'Beef mince', 'Chickpeas', 'Lentils'],
  Vegetables: ['Broccoli', 'Spinach', 'Tomato', 'Bell pepper', 'Carrots', 'Onion', 'Mushrooms', 'Garlic', 'Corn'],
  Fruits: ['Lemon', 'Avocado', 'Banana', 'Apple', 'Berries'],
  Grains: ['Rice', 'Pasta', 'Oats', 'Quinoa', 'Bread'],
  Dairy: ['Milk', 'Greek yogurt', 'Feta', 'Cheddar', 'Butter'],
  Pantry: ['Olive oil', 'Soy sauce', 'Canned tomatoes', 'Peanut butter', 'Honey'],
  Herbs: ['Parsley', 'Basil', 'Coriander', 'Oregano', 'Mint'],
};

const ALIASES = {
  'chicken fillet': 'chicken breast',
  'chicken fillets': 'chicken breast',
  'chicken breasts': 'chicken breast',
  egg: 'eggs',
  tomatoes: 'tomato',
  carrot: 'carrots',
  onions: 'onion',
  mushroom: 'mushrooms',
  capsicum: 'bell pepper',
  'red capsicum': 'bell pepper',
  'green capsicum': 'bell pepper',
  cilantro: 'coriander',
  'ground beef': 'beef mince',
  garbanzo: 'chickpeas',
  'garbanzo beans': 'chickpeas',
  yoghurt: 'greek yogurt',
  yogurt: 'greek yogurt',
  scallion: 'spring onion',
  scallions: 'spring onion',
};

const KNOWN = new Set(Object.values(CATEGORIES).flat().map((name) => name.toLowerCase()));

export function normalizeIngredient(raw) {
  const clean = raw.trim().replace(/\s+/g, ' ').toLowerCase();
  return ALIASES[clean] ?? clean;
}

// Trims, lowercases, maps aliases and merges duplicates. Names we don't know are
// kept and marked as unrecognised rather than being dropped.
export function normalizeList(rawList) {
  const seen = new Map();
  for (const raw of rawList) {
    const name = normalizeIngredient(raw);
    if (name && !seen.has(name)) seen.set(name, { name, recognised: KNOWN.has(name) });
  }
  return [...seen.values()];
}
