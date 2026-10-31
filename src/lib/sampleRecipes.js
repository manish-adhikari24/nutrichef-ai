// Fallback recipes for demos when the AI isn't available (risk R01 in the report).
// The app always labels these as samples, and they pass the same allergy check as AI recipes.
export const SAMPLE_RECIPES = [
  {
    title: 'Lemon-herb chicken and broccoli bowl',
    description: 'Golden chicken with garlicky broccoli and rice, finished with lemon.',
    minutes: 25,
    servings: 2,
    difficulty: 'Easy',
    nutrition: { kcal: 520, protein: 42, carbs: 48, fat: 16 },
    ingredients: [
      { name: 'Chicken breast', amount: '300 g', missing: false },
      { name: 'Broccoli', amount: '1 head', missing: false },
      { name: 'Rice', amount: '150 g', missing: false },
      { name: 'Lemon', amount: '1', missing: false },
      { name: 'Olive oil', amount: '1 tbsp', missing: false },
      { name: 'Parsley', amount: '1 small bunch', missing: true },
    ],
    steps: [
      'Cook the rice following the packet instructions.',
      'Season the chicken and cook it in the oil over medium-high heat for 5 to 6 minutes a side, until the centre reaches 75°C.',
      'Rest the chicken. In the same pan, cook the broccoli for 5 minutes with a splash of water.',
      'Slice the chicken and serve over the rice with the broccoli, lemon juice and parsley.',
    ],
    why_it_fits: 'A balanced, high-protein meal built around common ingredients.',
    label_checks: [],
    constraint_warning: '',
  },
  {
    title: 'Chickpea and spinach tomato stew',
    description: 'A quick one-pot stew with warm spices that works for vegans.',
    minutes: 20,
    servings: 2,
    difficulty: 'Easy',
    nutrition: { kcal: 430, protein: 18, carbs: 62, fat: 12 },
    ingredients: [
      { name: 'Chickpeas', amount: '1 can', missing: false },
      { name: 'Canned tomatoes', amount: '1 can', missing: false },
      { name: 'Spinach', amount: '100 g', missing: false },
      { name: 'Onion', amount: '1', missing: false },
      { name: 'Garlic', amount: '2 cloves', missing: false },
      { name: 'Olive oil', amount: '1 tbsp', missing: false },
      { name: 'Smoked paprika', amount: '1 tsp', missing: true },
    ],
    steps: [
      'Soften the chopped onion and garlic in the oil for 5 minutes.',
      'Stir in the paprika, tomatoes and drained chickpeas, then simmer for 10 minutes.',
      'Fold in the spinach until it wilts, then season to taste.',
    ],
    why_it_fits: 'Plant-based, high in fibre, and it uses pantry staples.',
    label_checks: ['Canned tomatoes', 'Smoked paprika'],
    constraint_warning: '',
  },
];
