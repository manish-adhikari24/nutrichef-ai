// Allergen matching for FR-06, shared by the browser and the server function.
// Matching covers exact names and known aliases. It can't see inside packaged
// products, so the app must still tell people to check labels themselves.
export const ALLERGENS = ['Peanuts', 'Tree nuts', 'Milk', 'Eggs', 'Wheat', 'Gluten', 'Soy', 'Fish', 'Shellfish', 'Sesame', 'Lupin'];

const ALIASES = {
  Peanuts: ['peanut', 'groundnut', 'satay'],
  'Tree nuts': ['almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'pistachio', 'macadamia', 'brazil nut', 'pine nut', 'praline', 'marzipan'],
  Milk: ['milk', 'cheese', 'feta', 'butter', 'yogurt', 'yoghurt', 'cream', 'whey', 'ghee', 'parmesan', 'halloumi', 'mozzarella', 'paneer', 'custard'],
  Eggs: ['egg', 'mayonnaise', 'mayo', 'aioli', 'meringue'],
  Wheat: ['wheat', 'flour', 'pasta', 'bread', 'couscous', 'noodle', 'tortilla', 'semolina', 'spaghetti', 'soy sauce', 'breadcrumb'],
  Gluten: ['wheat', 'flour', 'pasta', 'bread', 'couscous', 'barley', 'rye', 'semolina', 'seitan', 'noodle', 'tortilla', 'spaghetti', 'soy sauce', 'breadcrumb'],
  Soy: ['soy', 'soya', 'tofu', 'edamame', 'tempeh', 'miso'],
  Fish: ['fish', 'salmon', 'tuna', 'anchovy', 'anchovies', 'sardine', 'cod', 'trout', 'barramundi', 'worcestershire'],
  Shellfish: ['prawn', 'shrimp', 'crab', 'lobster', 'mussel', 'oyster', 'clam', 'scallop', 'squid'],
  Sesame: ['sesame', 'tahini'],
  Lupin: ['lupin', 'lupine'],
};

// Common names that contain an allergen word without containing the allergen.
const NOT_THE_ALLERGEN = {
  Milk: ['coconut milk', 'coconut cream', 'oat milk', 'almond milk', 'soy milk', 'rice milk', 'peanut butter', 'almond butter', 'cashew butter', 'dairy-free', 'cream of tartar'],
  Wheat: ['rice flour', 'almond flour', 'chickpea flour', 'coconut flour', 'corn flour', 'corn tortilla', 'rice noodle', 'gluten-free', 'wheat-free'],
  Gluten: ['rice flour', 'almond flour', 'chickpea flour', 'coconut flour', 'corn flour', 'corn tortilla', 'rice noodle', 'gluten-free'],
};

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function matches(name, allergen) {
  let text = name.toLowerCase();
  for (const phrase of NOT_THE_ALLERGEN[allergen] ?? []) text = text.replaceAll(phrase, ' ');
  const words = ALIASES[allergen] ?? [allergen.toLowerCase()];
  return words.some((word) => new RegExp(`\\b${escape(word)}(s|es)?\\b`).test(text));
}

// Returns each of the person's allergies that appears in the ingredient names.
export function findAllergens(names, allergies) {
  return allergies.filter((allergen) => names.some((name) => matches(name, allergen)));
}
