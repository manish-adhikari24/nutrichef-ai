// Profile storage and daily target calculations.
// There are no accounts yet, so the profile is saved in this browser only.
const STORAGE_KEY = 'nc-profile';

export const ALLERGENS = ['Peanuts', 'Tree nuts', 'Milk', 'Eggs', 'Wheat', 'Gluten', 'Soy', 'Fish', 'Shellfish', 'Sesame', 'Lupin'];
export const DIETS = ['No specific diet', 'Vegetarian', 'Vegan', 'Pescatarian', 'Halal', 'Kosher', 'Low carb'];
export const CONDITIONS = ['Diabetes', 'High blood pressure', 'High cholesterol', 'Kidney disease', 'Coeliac disease', 'Eating disorder'];

export const ACTIVITY = [
  { value: '1.2', label: 'Mostly sitting, little exercise' },
  { value: '1.375', label: 'Light exercise, 1 to 3 days a week' },
  { value: '1.55', label: 'Moderate exercise, 3 to 5 days a week' },
  { value: '1.725', label: 'Hard exercise, 6 to 7 days a week' },
  { value: '1.9', label: 'Physical job plus hard training' },
];

export const GOALS_LIST = [
  { value: 'lose', label: 'Lose weight gradually', adjust: -400 },
  { value: 'maintain', label: 'Maintain my weight', adjust: 0 },
  { value: 'gain', label: 'Build muscle or gain weight', adjust: 300 },
];

export const EMPTY_PROFILE = {
  firstName: '',
  lastName: '',
  age: '',
  sex: '',
  heightCm: '',
  weightKg: '',
  activity: '1.375',
  goal: 'maintain',
  pregnant: false,
  diet: 'No specific diet',
  allergies: [],
  otherAllergies: '',
  dislikes: '',
  conditions: [],
  healthConsent: false,
  customTargets: false,
  targets: { kcal: '', protein: '', carbs: '', fat: '', fiber: '' },
};

export function loadProfile() {
  try {
    return { ...EMPTY_PROFILE, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
  } catch {
    return EMPTY_PROFILE;
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

// Reasons to avoid suggesting a calorie deficit, and to point to a professional.
export function needsCare(p) {
  const reasons = [];
  if (Number(p.age) > 0 && Number(p.age) < 18) reasons.push('you are under 18');
  if (p.pregnant) reasons.push('you are pregnant or breastfeeding');
  if (p.conditions.includes('Eating disorder')) reasons.push('you have told us about an eating disorder');
  return reasons;
}

// Mifflin-St Jeor resting energy, scaled by activity and goal. Returns null until
// the required details are filled in.
export function calculateTargets(p) {
  const age = Number(p.age);
  const height = Number(p.heightCm);
  const weight = Number(p.weightKg);
  if (!(age >= 13 && age <= 120 && height >= 100 && height <= 250 && weight >= 25 && weight <= 350) || !p.sex) {
    return null;
  }

  const sexAdjust = { female: -161, male: 5, other: -78 }[p.sex];
  const resting = 10 * weight + 6.25 * height - 5 * age + sexAdjust;
  const care = needsCare(p).length > 0;
  const goal = care ? 'maintain' : p.goal;
  const adjust = GOALS_LIST.find((g) => g.value === goal).adjust;
  const floor = { female: 1200, male: 1500, other: 1400 }[p.sex];

  const raw = resting * Number(p.activity) + adjust;
  const kcal = Math.round(Math.max(raw, floor) / 10) * 10;
  const protein = Math.round(weight * (goal === 'maintain' ? 1.2 : 1.6));
  const fat = Math.round((kcal * 0.3) / 9);
  const carbs = Math.max(Math.round((kcal - protein * 4 - fat * 9) / 4), 0);
  const fiber = Math.round((kcal / 1000) * 14);

  return { kcal, protein, carbs, fat, fiber, floorApplied: raw < floor, floor, adjustedForCare: care && p.goal !== 'maintain' };
}

// The targets the rest of the dashboard should use, or null if none are set.
export function activeTargets(p) {
  if (p.customTargets) {
    const custom = Object.fromEntries(Object.entries(p.targets).map(([k, v]) => [k, Number(v)]));
    return custom.kcal > 0 ? custom : null;
  }
  return calculateTargets(p);
}

// Allergens and other allergies written in free text, as one list.
export function allAllergies(p) {
  const other = p.otherAllergies.split(',').map((a) => a.trim()).filter(Boolean);
  return [...p.allergies, ...other];
}
