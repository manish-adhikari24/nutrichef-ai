// The only place the app talks to the Django API.
const BASE = import.meta.env.VITE_API_URL ?? '';
const ACCESS = 'nc-access';
const REFRESH = 'nc-refresh';

export class ApiError extends Error {
  constructor(message, { status, code, allergens, fields } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.allergens = allergens;
    this.fields = fields ?? {};
  }
}

function getToken(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setTokens({ access, refresh }) {
  try {
    localStorage.setItem(ACCESS, access);
    if (refresh) localStorage.setItem(REFRESH, refresh);
  } catch {
    // Without storage, the person has to sign in again next visit.
  }
}

export function logout() {
  try {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

export const isSignedIn = () => Boolean(getToken(ACCESS));

async function send(path, method, body, token) {
  return fetch(`${BASE}/api/${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function refreshAccess() {
  const refresh = getToken(REFRESH);
  if (!refresh) return false;
  try {
    const response = await send('auth/refresh', 'POST', { refresh });
    if (!response.ok) return false;
    setTokens({ access: (await response.json()).access });
    return true;
  } catch {
    return false;
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  let response;
  try {
    response = await send(path, method, body, auth ? getToken(ACCESS) : null);
    if (auth && response.status === 401 && (await refreshAccess())) {
      response = await send(path, method, body, getToken(ACCESS));
    }
  } catch {
    throw new ApiError('We could not reach NutriChef AI. Check your connection and try again.', { code: 'network' });
  }

  if (auth && response.status === 401) {
    logout();
    window.location.assign('/login');
    throw new ApiError('Your session has expired. Please sign in again.', { status: 401 });
  }
  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error ?? 'Something went wrong. Try again in a moment.', { status: response.status, ...data });
  }
  return data;
}

/* ---------- Accounts ---------- */

export async function register(values) {
  setTokens(await request('auth/register', {
    method: 'POST',
    auth: false,
    body: {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
      confirmPassword: values.confirm,
      acceptedTerms: values.terms,
    },
  }));
}

export async function login(email, password) {
  setTokens(await request('auth/login', { method: 'POST', auth: false, body: { email, password } }));
}

export async function deleteAccount() {
  await request('account', { method: 'DELETE' });
  logout();
}

/* ---------- Profile ---------- */

export const EMPTY_HEALTH = {
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
};

export const getProfile = () => request('profile');

export function saveProfile(profile) {
  const blankToNull = (value) => (value === '' ? null : value);
  return request('profile', {
    method: 'PUT',
    body: {
      ...profile,
      age: blankToNull(profile.age),
      heightCm: blankToNull(profile.heightCm),
      weightKg: blankToNull(profile.weightKg),
      calorieTarget: blankToNull(profile.calorieTarget),
    },
  });
}

export function allAllergies(profile) {
  const other = profile.otherAllergies.split(',').map((a) => a.trim()).filter(Boolean);
  return [...profile.allergies, ...other];
}

/* ---------- Recipes ---------- */

export const generateRecipe = (body) => request('recipes/generate', { method: 'POST', body });
export const sampleRecipe = (body) => request('recipes/sample', { method: 'POST', body });

export function listSaved({ page = 1, tag = '', q = '' } = {}) {
  const params = new URLSearchParams({ page });
  if (tag) params.set('tag', tag);
  if (q) params.set('q', q);
  return request(`saved?${params}`);
}

export const saveRecipe = (recipeId, { note = '', rating = 0 } = {}) =>
  request('saved', { method: 'POST', body: { recipeId, note, rating } });

export const deleteSaved = (id) => request(`saved/${id}`, { method: 'DELETE' });

/* ---------- Tracking ---------- */

export const getDashboard = () => request('dashboard');
export const getLog = () => request('log');
export const logMeal = (recipeId) => request('log', { method: 'POST', body: { recipeId } });
export const removeLogged = (id) => request(`log/${id}`, { method: 'DELETE' });
export const setWater = (glasses) => request('water', { method: 'PUT', body: { glasses } });

export function totalsFor(items) {
  return items.reduce(
    (t, m) => ({ kcal: t.kcal + m.kcal, protein: t.protein + m.protein, carbs: t.carbs + m.carbs, fat: t.fat + m.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
