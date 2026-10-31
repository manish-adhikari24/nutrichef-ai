// Sample data for the dashboard until it is connected to real accounts.
export const GOALS = { kcal: 1900, protein: 110, carbs: 220, fat: 65, fiber: 30 };

export const MEALS_TODAY = [
  { name: 'Breakfast', dish: 'Yogurt, oats and berries', kcal: 410, protein: 24, carbs: 42, fat: 16, fiber: 6 },
  { name: 'Lunch', dish: 'Chicken and rice bowl', kcal: 620, protein: 38, carbs: 68, fat: 22, fiber: 11 },
  { name: 'Snack', dish: 'Apple and peanut butter', kcal: 180, protein: 8, carbs: 18, fat: 9, fiber: 3 },
];

// The last seven days, ending today. Today's total is still in progress.
export const LAST_7_DAYS = [
  { day: 'Fri', kcal: 1840 },
  { day: 'Sat', kcal: 2120 },
  { day: 'Sun', kcal: 1760 },
  { day: 'Mon', kcal: 1905 },
  { day: 'Tue', kcal: 1690 },
  { day: 'Wed', kcal: 1880 },
  { day: 'Thu', kcal: 1210, today: true },
];

export const WEEK_PLAN = [
  { day: 'Monday', meal: 'Spinach shakshuka', kcal: 520, protein: 31, minutes: 18 },
  { day: 'Tuesday', meal: 'Miso salmon bowls', kcal: 610, protein: 38, minutes: 25 },
  { day: 'Wednesday', meal: 'Leftover fried rice', kcal: 480, protein: 22, minutes: 12 },
  { day: 'Thursday', meal: 'Sheet-pan harissa chickpeas', kcal: 540, protein: 24, minutes: 30, today: true },
  { day: 'Friday', meal: 'Turkey tacos', kcal: 590, protein: 36, minutes: 20 },
  { day: 'Saturday', meal: null },
  { day: 'Sunday', meal: 'Lentil ragù', kcal: 500, protein: 28, minutes: 40 },
];

export const INITIAL_PANTRY = [
  { id: 1, name: 'Baby spinach', amount: '1 bag', place: 'Fridge', daysLeft: 1 },
  { id: 2, name: 'Greek yogurt', amount: '200 g', place: 'Fridge', daysLeft: 3 },
  { id: 3, name: 'Cauliflower', amount: '½ head', place: 'Fridge', daysLeft: 2 },
  { id: 4, name: 'Eggs', amount: '6', place: 'Fridge', daysLeft: 12 },
  { id: 5, name: 'Feta', amount: '150 g', place: 'Fridge', daysLeft: 9 },
  { id: 6, name: 'Chickpeas', amount: '3 cans', place: 'Cupboard' },
  { id: 7, name: 'Red lentils', amount: '500 g', place: 'Cupboard' },
  { id: 8, name: 'Basmati rice', amount: '1 kg', place: 'Cupboard' },
  { id: 9, name: 'Harissa paste', amount: '1 jar', place: 'Cupboard' },
  { id: 10, name: 'Salmon fillets', amount: '2', place: 'Freezer' },
  { id: 11, name: 'Peas', amount: '1 bag', place: 'Freezer' },
];

export const INITIAL_GROCERIES = [
  { id: 1, name: 'Parsley', bought: true },
  { id: 2, name: 'Corn tortillas', bought: false },
  { id: 3, name: 'Ground turkey, 500 g', bought: false },
  { id: 4, name: 'Red onions', bought: true },
  { id: 5, name: 'Limes', bought: false },
  { id: 6, name: 'Miso paste', bought: false },
];
