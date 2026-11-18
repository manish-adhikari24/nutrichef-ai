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
