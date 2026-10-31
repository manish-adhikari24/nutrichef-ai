// The only place the app reads or saves data. For now everything is kept in this
// browser. When the Django API is ready, these functions switch to network calls
// and the pages don't need to change.
import { findAllergens } from './allergens.js';

const KEYS = {
  accounts: 'nc-accounts',
  session: 'nc-session',
  profile: 'nc-profile',
  saved: 'nc-saved',
  log: 'nc-log',
  water: 'nc-water',
  generated: 'nc-generated',
  failed: 'nc-failed-logins',
};

const MAX_FAILED_LOGINS = 5;
const LOGIN_LOCK_MS = 30 * 1000;

function read(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const today = () => new Date().toLocaleDateString('en-CA');

export function lastDays(count) {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - i));
    return date;
  });
}

/* ---------- Accounts ---------- */

// TODO: replace with the Django register endpoint, which hashes passwords with bcrypt.
// Passwords are never stored in the browser.
export function register({ firstName, lastName, email }) {
  const address = email.trim().toLowerCase();
  const accounts = read(KEYS.accounts, []);
  if (accounts.includes(address)) {
    return { ok: false, error: 'This email is already registered. Sign in instead.' };
  }
  write(KEYS.accounts, [...accounts, address]);
  write(KEYS.session, { email: address });
  saveProfile({ ...EMPTY_PROFILE, firstName: firstName.trim(), lastName: lastName.trim() });
  return { ok: true };
}

// TODO: replace with the Django login endpoint, which checks the password and issues a JWT.
export function login(email) {
  const failed = read(KEYS.failed, { count: 0, at: 0 });
  if (failed.count >= MAX_FAILED_LOGINS && Date.now() - failed.at < LOGIN_LOCK_MS) {
    return { ok: false, error: 'Too many attempts. Wait 30 seconds and try again.' };
  }
  const address = email.trim().toLowerCase();
  if (!read(KEYS.accounts, []).includes(address)) {
    write(KEYS.failed, { count: failed.count >= MAX_FAILED_LOGINS ? 1 : failed.count + 1, at: Date.now() });
    return { ok: false, error: 'Invalid email or password.' };
  }
  write(KEYS.failed, { count: 0, at: 0 });
  write(KEYS.session, { email: address });
  return { ok: true };
}

export const isSignedIn = () => Boolean(read(KEYS.session, null));

export function logout() {
  try {
    localStorage.removeItem(KEYS.session);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

/* ---------- Profile ---------- */

export const EMPTY_PROFILE = {
  firstName: '',
  lastName: '',
  age: '',
  sex: '',
  heightCm: '',
  weightKg: '',
  activity: '1.375',
  goal: 'maintenance',
  calorieTarget: '',
  proteinPct: 25,
  carbsPct: 45,
  fatPct: 30,
  diet: 'No specific diet',
  allergies: [],
  otherAllergies: '',
  dislikes: '',
  healthConsent: false,
  showSupplements: true,
  showWellness: true,
};

export function loadProfile() {
  const stored = read(KEYS.profile, {});
  // Only known fields are kept, which drops health conditions stored by older versions (NFR-04).
  const profile = { ...EMPTY_PROFILE };
  for (const key of Object.keys(EMPTY_PROFILE)) {
    if (stored[key] !== undefined) profile[key] = stored[key];
  }
  return profile;
}

export function saveProfile(profile) {
  return write(KEYS.profile, profile);
}

export function allAllergies(profile) {
  const other = profile.otherAllergies.split(',').map((a) => a.trim()).filter(Boolean);
  return [...profile.allergies, ...other];
}

export function isProfileComplete(profile) {
  return Number(profile.calorieTarget) > 0 && Boolean(profile.goal);
}

/* ---------- Recipes ---------- */

export class RecipeError extends Error {
  constructor(message, code, allergens) {
    super(message);
    this.code = code;
    this.allergens = allergens;
  }
}

// Asks the server for a recipe, then checks it against the person's allergies
// again here, even if they haven't consented to sending allergies to the AI.
export async function generateRecipe(request, allergies) {
  let response;
  try {
    response = await fetch('/api/generate-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch {
    throw new RecipeError('Check your internet connection and try again.', 'network');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new RecipeError(data.error ?? 'The recipe couldn\'t be generated. Try again in a moment.', data.code, data.allergens);
  }
  return acceptRecipe(data.recipe, request, allergies, 'ai');
}

// Applies the same safety check to any recipe before it can be shown or counted.
export function acceptRecipe(recipe, request, allergies, source) {
  const found = findAllergens(recipe.ingredients.map((i) => i.name), allergies);
  if (found.length) {
    throw new RecipeError(`We blocked this recipe because it contains ${found.join(', ')}. Generate another one.`, 'blocked', found);
  }
  const counts = read(KEYS.generated, {});
  write(KEYS.generated, { ...counts, [today()]: (counts[today()] ?? 0) + 1 });
  return {
    ...recipe,
    id: `r${Date.now()}`,
    source,
    meal: request.meal,
    cuisine: request.cuisine,
    budget: request.budget,
    diet: request.diet || '',
    allergiesChecked: allergies,
    generatedAt: new Date().toISOString(),
  };
}

export const generatedCount = (date = today()) => read(KEYS.generated, {})[date] ?? 0;

/* ---------- Saved recipes ---------- */

export const listSaved = () =>
  read(KEYS.saved, []).sort((a, b) => b.savedAt.localeCompare(a.savedAt));

export function saveRecipe(recipe, { note = '', rating = 0 } = {}) {
  const saved = read(KEYS.saved, []);
  if (saved.some((s) => s.recipe.id === recipe.id)) {
    return { ok: false, error: 'Recipe already saved.' };
  }
  write(KEYS.saved, [...saved, { id: `s${Date.now()}`, recipe, note, rating, savedAt: new Date().toISOString() }]);
  return { ok: true };
}

export const isSaved = (recipeId) => read(KEYS.saved, []).some((s) => s.recipe.id === recipeId);

export function deleteSaved(id) {
  write(KEYS.saved, read(KEYS.saved, []).filter((s) => s.id !== id));
}

/* ---------- Food log and water ---------- */

export function logMeal(recipe) {
  const { kcal, protein, carbs, fat } = recipe.nutrition;
  const entry = { id: `m${Date.now()}`, date: today(), title: recipe.title, meal: recipe.meal, kcal, protein, carbs, fat };
  write(KEYS.log, [...read(KEYS.log, []), entry]);
}

export function removeLogged(id) {
  write(KEYS.log, read(KEYS.log, []).filter((m) => m.id !== id));
}

export const mealsOn = (date = today()) => read(KEYS.log, []).filter((m) => m.date === date);

export function totalsFor(meals) {
  return meals.reduce(
    (t, m) => ({ kcal: t.kcal + m.kcal, protein: t.protein + m.protein, carbs: t.carbs + m.carbs, fat: t.fat + m.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export const waterToday = () => read(KEYS.water, {})[today()] ?? 0;

export function setWaterToday(count) {
  write(KEYS.water, { ...read(KEYS.water, {}), [today()]: Math.max(0, count) });
}

/* ---------- Clearing data ---------- */

export function clearAllData() {
  try {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
