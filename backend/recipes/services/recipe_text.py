"""Keeps a recipe's wording consistent with its calculated nutrition.

The AI estimates nutrition while writing, but the server recalculates it from the nutrition dataset
(nutrition.py), so any figures the AI wrote into its text can disagree with the panel. These helpers
remove the AI's nutrition figures from the text and add one sentence built from the calculated values.
"""
import re

# A number followed by a nutrition unit, e.g. "612 kcal", "65 g protein", "46g of carbs", "19 grams fat".
_FIGURE = re.compile(
    r'\d[\d,.]*\s*(?:'
    r'k?cal(?:orie)?s?\b'
    r'|(?:g|grams?)\b\s*(?:of\s+)?(?:protein|carbs?|carbohydrates?|fat|fibre|fiber|sugars?)'
    r')',
    re.IGNORECASE,
)
# Words that show a sentence is about nutrition.
_NUTRITION_WORDS = re.compile(r'\b(calorie|kcal|protein|carb|fat|macro)', re.IGNORECASE)


def _sentences(text):
    return [s for s in re.split(r'(?<=[.!?])\s+', text.strip()) if s]


def strip_nutrition_figures(text):
    """Drops the sentences that quote nutrition figures, keeping everything else the AI wrote."""
    kept = [s for s in _sentences(text or '') if not (_FIGURE.search(s) and _NUTRITION_WORDS.search(s))]
    return ' '.join(kept)


def nutrition_sentence(nutrition, alignment, meal):
    """One sentence built from the calculated values, and the goal check when the user has targets."""
    sentence = (
        f"Per serving it has {nutrition['kcal']} kcal, {nutrition['protein']} g protein, "
        f"{nutrition['carbs']} g carbs and {nutrition['fat']} g fat."
    )
    if alignment:
        on_target = [item['label'].lower() for item in alignment if item['pass']]
        if len(on_target) == len(alignment):
            sentence += f' That fits your {meal.lower()} targets.'
        elif on_target:
            sentence += f" Its {' and '.join(on_target)} {'is' if len(on_target) == 1 else 'are'} on target for your {meal.lower()}."
    return sentence


def why_it_fits(text, nutrition, alignment, meal):
    """The AI's reasons without its own figures, followed by the calculated figures."""
    reasons = strip_nutrition_figures(text)
    return f'{reasons} {nutrition_sentence(nutrition, alignment, meal)}'.strip()
