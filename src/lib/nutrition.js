// Live profile feedback and display helpers. The server does recipe analysis.
export const GOALS = [
  { value: 'weight_loss', label: 'Weight loss', adjust: -400, macros: [30, 40, 30] },
  { value: 'maintenance', label: 'Maintenance', adjust: 0, macros: [25, 45, 30] },
  { value: 'muscle_gain', label: 'Muscle gain', adjust: 300, macros: [30, 45, 25] },
  { value: 'athletic_performance', label: 'Athletic performance', adjust: 200, macros: [25, 55, 20] },
];

export const ACTIVITY = [
  { value: '1.2', label: 'Mostly sitting, little exercise', level: 'low' },
  { value: '1.375', label: 'Light exercise, 1 to 3 days a week', level: 'low' },
  { value: '1.55', label: 'Moderate exercise, 3 to 5 days a week', level: 'moderate' },
  { value: '1.725', label: 'Hard exercise, 6 to 7 days a week', level: 'high' },
  { value: '1.9', label: 'Physical job plus hard training', level: 'high' },
];

export function bmi(profile) {
  const height = Number(profile.heightCm) / 100;
  const weight = Number(profile.weightKg);
  return height > 0 && weight > 0 ? weight / (height * height) : null;
}

export function bmiCategory(profile) {
  const value = bmi(profile);
  if (value === null) return null;
  if (value < 18.5) return 'underweight';
  if (value < 25) return 'healthy';
  if (value < 30) return 'overweight';
  return 'obese';
}

// Mifflin-St Jeor estimate with a minimum, used to pre-fill the targets.
// Under-18s never get a suggested calorie deficit.
export function suggestTargets(p) {
  const age = Number(p.age);
  const height = Number(p.heightCm);
  const weight = Number(p.weightKg);
  if (!(age >= 13 && age <= 120 && height >= 100 && height <= 250 && weight >= 25 && weight <= 350) || !p.sex) {
    return null;
  }
  const sexAdjust = { female: -161, male: 5, other: -78 }[p.sex];
  const floor = { female: 1200, male: 1500, other: 1400 }[p.sex];
  const resting = 10 * weight + 6.25 * height - 5 * age + sexAdjust;
  const goalValue = age < 18 && p.goal === 'weight_loss' ? 'maintenance' : p.goal;
  const goal = GOALS.find((g) => g.value === goalValue) ?? GOALS[1];
  const raw = resting * Number(p.activity) + goal.adjust;
  const [proteinPct, carbsPct, fatPct] = goal.macros;
  return {
    calorieTarget: Math.round(Math.max(raw, floor) / 10) * 10,
    proteinPct,
    carbsPct,
    fatPct,
    floorApplied: raw < floor,
  };
}

// Daily targets in calories and grams, or null until the profile has them.
export function dailyTargets(p) {
  const kcal = Number(p.calorieTarget);
  if (!(kcal > 0)) return null;
  return {
    kcal,
    protein: Math.round((kcal * p.proteinPct) / 100 / 4),
    carbs: Math.round((kcal * p.carbsPct) / 100 / 4),
    fat: Math.round((kcal * p.fatPct) / 100 / 9),
  };
}

// Status label for intake compared with a target (FR-14).
export function intakeStatus(value, target) {
  if (!target) return null;
  const ratio = value / target;
  if (ratio < 0.9) return 'Under target';
  if (ratio <= 1.1) return 'Near target';
  return 'Above target';
}
