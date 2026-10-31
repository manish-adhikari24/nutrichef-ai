// Rule tables for FR-10, FR-11 and FR-16. These match the report's substitution_rules,
// supplement_rules and activity_guidance_rules tables and move to Django with the backend.
import { findAllergens } from './allergens.js';
import { bmiCategory, dailyTargets } from './nutrition.js';

export const SUPPLEMENT_DISCLAIMER = 'General information only; consult a healthcare professional before using supplements.';
export const WELLNESS_DISCLAIMER = 'General wellness information only, not medical or professional fitness advice.';

const VEGAN_BLOCKED = /chicken|beef|pork|lamb|turkey|fish|salmon|tuna|prawn|egg|milk|cheese|feta|butter|yogurt|cream|honey/;
const VEGETARIAN_BLOCKED = /chicken|beef|pork|lamb|turkey|fish|salmon|tuna|prawn/;

const SUBSTITUTION_RULES = [
  { match: 'buttermilk', options: [['Milk with a little lemon juice', 'pantry swap'], ['Oat milk with lemon juice', 'dairy-free']] },
  { match: 'milk', options: [['Oat milk', 'dairy-free'], ['Soy milk', 'vegan']] },
  { match: 'butter', options: [['Olive oil', 'dairy-free'], ['Coconut oil', 'vegan']] },
  { match: 'cream', options: [['Coconut cream', 'dairy-free'], ['Greek yogurt', 'lighter']] },
  { match: 'yogurt', options: [['Coconut yogurt', 'dairy-free'], ['Soy yogurt', 'vegan']] },
  { match: 'feta', options: [['Firm tofu', 'vegan'], ['Halloumi', 'budget-friendly']] },
  { match: 'cheese', options: [['Nutritional yeast', 'vegan']] },
  { match: 'egg', options: [['Chia seeds with water', 'vegan'], ['Mashed banana', 'for baking']] },
  { match: 'chicken', options: [['Firm tofu', 'vegan'], ['Chickpeas', 'budget-friendly']] },
  { match: 'beef', options: [['Lentils', 'vegan'], ['Mushrooms', 'vegan']] },
  { match: 'salmon', options: [['Firm tofu', 'vegan'], ['Trout', 'similar taste']] },
  { match: 'soy sauce', options: [['Coconut aminos', 'soy-free'], ['Tamari', 'gluten-free']] },
  { match: 'pasta', options: [['Rice noodles', 'gluten-free'], ['Zucchini noodles', 'lighter']] },
  { match: 'rice', options: [['Quinoa', 'higher protein'], ['Cauliflower rice', 'lighter']] },
  { match: 'lemon', options: [['White wine vinegar', 'pantry swap'], ['Lime', 'similar taste']] },
  { match: 'parsley', options: [['Coriander', 'similar use'], ['Basil', 'similar use']] },
  { match: 'broccoli', options: [['Cauliflower', 'similar texture'], ['Green beans', 'budget-friendly']] },
  { match: 'peanut', options: [['Sunflower seed butter', 'nut-free']] },
  { match: 'almond', options: [['Pumpkin seeds', 'nut-free']] },
];

function fitsDiet(name, diet) {
  const text = name.toLowerCase();
  if (diet === 'Vegan') return !VEGAN_BLOCKED.test(text);
  if (diet === 'Vegetarian') return !VEGETARIAN_BLOCKED.test(text);
  return true;
}

// Safe alternatives for ingredients the person doesn't have (FR-10). Every option
// is checked against their allergies and diet before it's shown.
export function suggestSubstitutions(recipe, allergies, diet) {
  const suggestions = [];
  for (const ingredient of recipe.ingredients.filter((i) => i.missing)) {
    const rule = SUBSTITUTION_RULES.find((r) => ingredient.name.toLowerCase().includes(r.match));
    if (!rule) continue;
    const safe = rule.options
      .filter(([name]) => findAllergens([name], allergies).length === 0 && fitsDiet(name, diet))
      .map(([name, reason]) => ({ name, reason }));
    if (safe.length) suggestions.push({ ingredient: ingredient.name, options: safe });
  }
  return suggestions;
}

const SUPPLEMENT_RULES = [
  {
    when: ({ proteinShort }) => proteinShort,
    title: 'Protein',
    text: 'This meal is lower in protein than your target. Some people use a protein powder to help close a gap like this, though food sources also work well.',
  },
  {
    when: ({ goal }) => goal === 'muscle_gain' || goal === 'athletic_performance',
    title: 'Recovery',
    text: 'People training regularly sometimes look at creatine or electrolyte products. Whether these suit you depends on your circumstances.',
  },
  {
    when: ({ diet }) => diet === 'Vegan',
    title: 'Vitamin B12',
    text: 'Vegan diets contain little vitamin B12, so many people on them look at fortified foods or a supplement.',
  },
];

// General supplement ideas only, with no doses and nothing about medical conditions (FR-11).
export function suggestSupplements(recipe, profile, mealTarget) {
  if (!profile.showSupplements) return [];
  const proteinShort = mealTarget ? recipe.nutrition.protein < mealTarget.protein * 0.8 : false;
  const context = { proteinShort, goal: profile.goal, diet: profile.diet };
  return SUPPLEMENT_RULES.filter((rule) => rule.when(context)).map(({ title, text }) => ({ title, text }));
}

const WELLNESS_RULES = [
  {
    when: ({ bmi }) => bmi === 'underweight',
    title: 'Keep energy steady',
    text: 'Regular meals and gentle movement you enjoy, such as walking or stretching, can be a good fit. A health professional can give you advice for your situation.',
  },
  {
    when: ({ goal, left }) => goal === 'weight_loss' && left !== null && left > 0,
    title: 'A walk after dinner',
    text: 'A relaxed 20 to 30 minute walk is an easy way to add some movement to your day.',
  },
  {
    when: ({ goal }) => goal === 'weight_loss',
    title: 'Small, regular movement',
    text: 'Short walks spread through the day can add up. Choose a pace where you can still hold a conversation.',
  },
  {
    when: ({ goal }) => goal === 'muscle_gain',
    title: 'Plan your strength sessions',
    text: 'Two or three strength sessions a week with rest days between them is a common starting point.',
  },
  {
    when: ({ goal }) => goal === 'athletic_performance',
    title: 'Fuel around training',
    text: 'Having a meal with carbs and protein within a few hours of training is a common habit among active people.',
  },
  {
    when: ({ goal }) => goal === 'maintenance',
    title: 'Stay active most days',
    text: 'Aim for regular movement you enjoy, such as walking, cycling or swimming.',
  },
];

// One general suggestion from the person's goal, BMI category and progress today (FR-16).
export function suggestWellness(profile, eatenKcal) {
  if (!profile.showWellness || !profile.goal) return null;
  const targets = dailyTargets(profile);
  const context = {
    goal: profile.goal,
    bmi: bmiCategory(profile),
    left: targets ? targets.kcal - eatenKcal : null,
  };
  const rule = WELLNESS_RULES.find((r) => r.when(context));
  return rule ? { title: rule.title, text: rule.text } : null;
}
