// Allergen matching for FR-06, used for instant warnings while typing. The server repeats the check.
// The allergen words and safe phrases come from the database (GET /api/reference), the same data the server uses.
// Matching covers exact names and known aliases. It can't see inside packaged
// products, so the app must still tell people to check labels themselves.

// Escapes regex special characters so ingredient words are matched literally.
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// True if the allergen (or one of its aliases) appears in the name as a whole word.
// `entry` is one item of reference.allergens: { name, aliases, exceptions }.
function matches(name, allergen, entry) {
  let text = name.toLowerCase();
  // First blank out the safe phrases, e.g. "coconut milk" for a milk allergy.
  for (const phrase of entry?.exceptions ?? []) text = text.replaceAll(phrase, ' ');
  const words = entry?.aliases?.length ? entry.aliases : [allergen.toLowerCase()];
  return words.some((word) => new RegExp(`\\b${escape(word)}(s|es)?\\b`).test(text));
}

// Returns each of the person's allergies that appears in the ingredient names.
// `allergenData` is reference.allergens from the API.
export function findAllergens(names, allergies, allergenData) {
  const byName = Object.fromEntries(allergenData.map((entry) => [entry.name, entry]));
  return allergies.filter((allergen) => names.some((name) => matches(name, allergen, byName[allergen])));
}
