// Live profile feedback and display helpers. The server does recipe analysis.
// BMI = weight (kg) / height (m) squared. null until height and weight are entered.
export function bmi(profile) {
  const height = Number(profile.heightCm) / 100;
  const weight = Number(profile.weightKg);
  return height > 0 && weight > 0 ? weight / (height * height) : null;
}

// Standard WHO BMI categories.
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
// `goals` is reference.goals from the API: [{ value, label, calorieAdjust, macros: [protein, carbs, fat] }].
export function suggestTargets(p, goals) {
  const age = Number(p.age);
  const height = Number(p.heightCm);
  const weight = Number(p.weightKg);
  // Only suggest targets when age, height, weight and sex are all sensible.
  if (!(age >= 13 && age <= 120 && height >= 100 && height <= 250 && weight >= 25 && weight <= 350) || !p.sex) {
    return null;
  }
  // Formula adjustment and minimum safe calories for each sex.
  const sexAdjust = { female: -161, male: 5, other: -78 }[p.sex];
  const floor = { female: 1200, male: 1500, other: 1400 }[p.sex];
  // Resting energy (Mifflin-St Jeor).
  const resting = 10 * weight + 6.25 * height - 5 * age + sexAdjust;
  const goalValue = age < 18 && p.goal === 'weight_loss' ? 'maintenance' : p.goal;
  const goal = goals.find((g) => g.value === goalValue) ?? goals.find((g) => g.value === 'maintenance');
  if (!goal) return null;
  // Multiply by activity, then add the goal's adjustment.
  const raw = resting * Number(p.activity) + goal.calorieAdjust;
  const [proteinPct, carbsPct, fatPct] = goal.macros;
  return {
    // Round to the nearest 10, never below the minimum.
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
