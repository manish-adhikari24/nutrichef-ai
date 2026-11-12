// The only place the app talks to the Django API.
// The API address: empty locally (Vite forwards /api to Django), the Render URL in production.
const BASE = import.meta.env.VITE_API_URL ?? '';
// localStorage keys for the access token, refresh token and trusted-device token.
const ACCESS = 'nc-access';
const REFRESH = 'nc-refresh';
// Lets this browser skip the sign-in code for 30 days after "Keep me signed in".
const DEVICE = 'nc-device';

// An error from the API, carrying the status, error code, blocked allergens and field errors.
export class ApiError extends Error {
  constructor(message, { status, code, allergens, fields } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.allergens = allergens;
    this.fields = fields ?? {};
  }
}

// Read a token safely. Storage can be blocked, e.g. in private browsing.
function getToken(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Save tokens after sign-in. Refresh and device tokens are only replaced when the server sends new ones.
function setTokens({ access, refresh, deviceToken }) {
  try {
    localStorage.setItem(ACCESS, access);
    if (refresh) localStorage.setItem(REFRESH, refresh);
    if (deviceToken) localStorage.setItem(DEVICE, deviceToken);
  } catch {
    // Without storage, the person has to sign in again next visit.
  }
}

// Sign out on this browser. The device token stays, so "Keep me signed in" still skips the code.
export function logout() {
  try {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

// True if there is an access token.
export const isSignedIn = () => Boolean(getToken(ACCESS));

// Sends one request, as JSON, with the access token if there is one.
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

// Swap the refresh token for a new access token. Returns false if that isn't possible.
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

// Every API call goes through here. It handles expired tokens, network errors and error messages.
async function request(path, { method = 'GET', body, auth = true } = {}) {
  let response;
  try {
    response = await send(path, method, body, auth ? getToken(ACCESS) : null);
    // Access token expired: refresh it once and try again.
    if (auth && response.status === 401 && (await refreshAccess())) {
      response = await send(path, method, body, getToken(ACCESS));
    }
  } catch {
    throw new ApiError('We could not reach NutriChef AI. Check your connection and try again.', { code: 'network' });
  }

  // Still not authorised: sign out and go to the login page.
  if (auth && response.status === 401) {
    logout();
    window.location.assign('/login');
    throw new ApiError('Your session has expired. Please sign in again.', { status: 401 });
  }
  // 204 No Content (e.g. after a delete) has no body.
  if (response.status === 204) return null;

  // Turn the server's {"error", "fields"} reply into an ApiError the page can show.
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error ?? 'Something went wrong. Try again in a moment.', { status: response.status, ...data });
  }
  return data;
}

/* ---------- Accounts ---------- */

// Creates the account and emails a verification code. No tokens until it's verified.
export async function register(values) {
  return request('auth/register', {
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
  });
}

// Send the emailed code. Correct: save the tokens (signed in).
export async function verifyEmail(email, code, keepSignedIn) {
  setTokens(await request('auth/verify-email', { method: 'POST', auth: false, body: { email, code, keepSignedIn } }));
}

// Returns { ticket } when an email code is needed, or signs straight in on a trusted device.
export async function login(email, password) {
  const data = await request('auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password, deviceToken: getToken(DEVICE) },
  });
  if (data.ticket) return { ticket: data.ticket };
  setTokens(data);
  return {};
}

// Step 2 of sign-in: the ticket plus the emailed code.
export async function verifyLogin(ticket, code, keepSignedIn) {
  setTokens(await request('auth/login/verify', { method: 'POST', auth: false, body: { ticket, code, keepSignedIn } }));
}

// Resend a code, request a reset code, and set a new password with the code.
export const resendCode = (body) => request('auth/resend-code', { method: 'POST', auth: false, body });
export const forgotPassword = (email) => request('auth/password/forgot', { method: 'POST', auth: false, body: { email } });
export const resetPassword = (body) => request('auth/password/reset', { method: 'POST', auth: false, body });

// Settings: make every device need a code again, and forget this browser's device token.
export async function forgetTrustedDevices() {
  await request('auth/devices', { method: 'DELETE' });
  try {
    localStorage.removeItem(DEVICE);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

// Delete the account on the server, then sign out here.
export async function deleteAccount() {
  await request('account', { method: 'DELETE' });
  logout();
}

/* ---------- Profile ---------- */

// Default health values, used by "Remove my health details" on the Profile page.
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

// Read and save the profile (FR-03). Blank number fields are sent as null.
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

// Picked allergies plus the typed ones, as one list.
export function allAllergies(profile) {
  const other = profile.otherAllergies.split(',').map((a) => a.trim()).filter(Boolean);
  return [...profile.allergies, ...other];
}

/* ---------- Recipes ---------- */

// Generate a real recipe or a sample recipe.
export const generateRecipe = (body) => request('recipes/generate', { method: 'POST', body });
export const sampleRecipe = (body) => request('recipes/sample', { method: 'POST', body });

/* ---------- Recipe chat ---------- */

// The 20 newest recipes. The server answers 404 while the chat feature is switched off.
export const listRecent = () => request('recipes/recent');
// One recipe with its chat messages and whether it's saved.
export const getRecipeChat = (recipeId) => request(`recipes/${recipeId}`);
// Delete a recipe, its chat and its saved copy.
export const deleteRecipe = (recipeId) => request(`recipes/${recipeId}`, { method: 'DELETE' });
// Send a chat message. The reply may come with a changed recipe.
export const sendChat = (recipeId, message) => request(`recipes/${recipeId}/chat`, { method: 'POST', body: { message } });

// One page of saved recipes, with optional filter tag and search text.
export function listSaved({ page = 1, tag = '', q = '' } = {}) {
  const params = new URLSearchParams({ page });
  if (tag) params.set('tag', tag);
  if (q) params.set('q', q);
  return request(`saved?${params}`);
}

// Save a recipe with an optional note and rating.
export const saveRecipe = (recipeId, { note = '', rating = 0 } = {}) =>
  request('saved', { method: 'POST', body: { recipeId, note, rating } });

// Remove a saved recipe.
export const deleteSaved = (id) => request(`saved/${id}`, { method: 'DELETE' });

/* ---------- Tracking ---------- */

// Dashboard data, the meal log, logging and removing meals, and the water count.
export const getDashboard = () => request('dashboard');
export const getLog = () => request('log');
export const logMeal = (recipeId) => request('log', { method: 'POST', body: { recipeId } });
export const removeLogged = (id) => request(`log/${id}`, { method: 'DELETE' });
export const setWater = (glasses) => request('water', { method: 'PUT', body: { glasses } });

// Adds up calories and macros for a list of meals or days.
export function totalsFor(items) {
  return items.reduce(
    (t, m) => ({ kcal: t.kcal + m.kcal, protein: t.protein + m.protein, carbs: t.carbs + m.carbs, fat: t.fat + m.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
