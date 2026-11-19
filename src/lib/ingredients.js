// Ingredient name clean-up for FR-04. The alias table and the list of known ingredients
// come from the database (GET /api/reference), the same data the server uses.

// Cleans one name: trim, collapse spaces, lowercase, then apply the alias table.
export function normalizeIngredient(raw, aliases) {
  const clean = raw.trim().replace(/\s+/g, ' ').toLowerCase();
  return aliases[clean] ?? clean;
}

// Trims, lowercases, maps aliases and merges duplicates. Names we don't know are
// kept and marked as unrecognised rather than being dropped.
// `reference` is the /api/reference data: it supplies ingredientAliases and knownIngredients.
export function normalizeList(rawList, reference) {
  const known = new Set(reference.knownIngredients);
  const seen = new Map();
  for (const raw of rawList) {
    const name = normalizeIngredient(raw, reference.ingredientAliases);
    if (name && !seen.has(name)) seen.set(name, { name, recognised: known.has(name) });
  }
  return [...seen.values()];
}

/* ---------- Search as you type (the ingredient dropdown) ---------- */

// Builds the searchable list once from the reference data:
// [{ name, display, category, order, aliases: [...] }], in the dataset's order.
export function buildIngredientIndex(reference) {
  const aliasesOf = {};
  for (const [alias, name] of Object.entries(reference.ingredientAliases)) {
    (aliasesOf[name] ??= []).push(alias);
  }
  const index = [];
  for (const category of reference.ingredientCategories) {
    for (const display of category.ingredients) {
      const name = display.toLowerCase();
      index.push({ name, display, category: category.name, order: index.length, aliases: aliasesOf[name] ?? [] });
    }
  }
  return index;
}

// Number of single-letter edits between two words (Levenshtein distance), used to forgive typos.
function editDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

// True if the query is a slightly misspelt start of the word ("brocoli" -> "broccoli").
function closeTo(query, word) {
  if (query.length < 4) return false;
  const allowed = query.length >= 7 ? 2 : 1;
  return editDistance(query, word.slice(0, query.length)) <= allowed
    || editDistance(query, word.slice(0, query.length + 1)) <= allowed;
}

// How well one ingredient matches the query: lower is better, null means no match.
// Returns { score, alias } where alias is the other name that matched, if any.
function rank(item, query) {
  if (item.name === query) return { score: 0 };
  if (item.name.startsWith(query)) return { score: 1 };
  if (item.name.split(' ').some((word) => word.startsWith(query))) return { score: 2 };
  const alias = item.aliases.find((a) => a.startsWith(query) || a.split(' ').some((word) => word.startsWith(query)));
  if (alias) return { score: 3, alias };
  if (item.name.includes(query)) return { score: 4 };
  if (item.name.split(' ').some((word) => closeTo(query, word))) return { score: 5 };
  return null;
}

// The best matches for what's typed, best first. Equal matches keep the dataset's order,
// so common cuts (chicken breast, thigh) come before less common ones.
export function searchIngredients(text, index, limit = 8) {
  const query = text.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!query) return [];
  return index
    .map((item) => ({ item, match: rank(item, query) }))
    .filter(({ match }) => match)
    .sort((a, b) => a.match.score - b.match.score || a.item.order - b.item.order)
    .slice(0, limit)
    .map(({ item, match }) => ({ ...item, alias: match.alias, exact: match.score === 0 }));
}
