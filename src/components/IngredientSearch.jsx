// Ingredient box with a dropdown of close matches as you type, e.g. "chicken" -> chicken breast,
// chicken thigh, whole chicken. Follows the accessible combobox pattern, so it works with the keyboard
// (arrows, Enter, Escape) and screen readers.
import { useMemo, useRef, useState } from 'react';
import { Check, Plus } from '@phosphor-icons/react';
import { buildIngredientIndex, normalizeIngredient, searchIngredients } from '../lib/ingredients.js';

// added: names already in the list (lowercase). onAdd: called with one or more names to add.
export default function IngredientSearch({ reference, added, onAdd }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  // Index of the highlighted row, or -1 for none.
  const [active, setActive] = useState(-1);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // The searchable list is built once from the reference data.
  const index = useMemo(() => buildIngredientIndex(reference), [reference]);

  // Several ingredients can be typed with commas. The dropdown searches the last one.
  const parts = text.split(',');
  const current = parts[parts.length - 1].trim();
  const earlier = parts.slice(0, -1).map((p) => p.trim()).filter(Boolean);
  const matches = searchIngredients(current, index);
  // The last row adds exactly what was typed, unless it's already an exact match.
  const typedName = normalizeIngredient(current, reference.ingredientAliases);
  const offerTyped = current !== '' && !matches.some((m) => m.name === typedName);
  const rows = [...matches.map((m) => ({ ...m, kind: 'match' })), ...(offerTyped ? [{ kind: 'typed', display: current }] : [])];
  const showList = open && rows.length > 0;

  // Add the chosen row (plus anything typed before a comma), then clear the box.
  function choose(row) {
    onAdd([...earlier, row.display]);
    setText('');
    setActive(-1);
    setError('');
    setOpen(false);
    inputRef.current?.focus();
  }

  // Enter or the Add button: use the highlighted row, otherwise add what's typed.
  function submit(e) {
    e.preventDefault();
    if (showList && active >= 0) {
      choose(rows[active]);
      return;
    }
    const all = text.split(',').map((p) => p.trim()).filter(Boolean);
    if (all.length === 0) {
      setError('Type an ingredient to add it.');
      return;
    }
    onAdd(all);
    setText('');
    setActive(-1);
    setError('');
    setOpen(false);
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (rows.length ? (i + 1) % rows.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (rows.length ? (i <= 0 ? rows.length - 1 : i - 1) : -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  }

  const optionId = (i) => `g-ingredient-option-${i}`;

  return (
    <form className="dash-add ingredient-search" onSubmit={submit} noValidate>
      <div className="dash-add-name combo">
        <label htmlFor="g-ingredient" className="field-label">What&apos;s in your fridge?</label>
        <input
          id="g-ingredient"
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls="g-ingredient-list"
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          placeholder="Start typing, e.g. chicken"
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); setActive(-1); setError(''); }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          // Close after a click elsewhere. Rows use onMouseDown, so a click on a row still counts.
          onBlur={() => setOpen(false)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'g-ingredient-error' : 'g-ingredient-hint'}
        />
        {/* The dropdown of matches. */}
        {showList && (
          <ul id="g-ingredient-list" role="listbox" className="combo-list" aria-label="Matching ingredients">
            {rows.map((row, i) => {
              const already = row.kind === 'match' && added.includes(row.name);
              return (
                <li
                  key={row.kind === 'match' ? row.name : 'typed'}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  className={`combo-option${i === active ? ' is-active' : ''}${row.kind === 'typed' ? ' is-typed' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); choose(row); }}
                  onMouseEnter={() => setActive(i)}
                >
                  {row.kind === 'match' ? (
                    <>
                      <span className="combo-name">
                        {already && <Check size={14} weight="bold" aria-hidden />}
                        {row.display}
                        {row.alias && <small> also called {row.alias}</small>}
                      </span>
                      <span className="combo-meta">{already ? 'Added' : row.category}</span>
                    </>
                  ) : (
                    <span className="combo-name"><Plus size={14} aria-hidden /> Add &ldquo;{row.display}&rdquo; as typed</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <button type="submit" className="btn btn-primary dash-add-btn"><Plus size={18} aria-hidden /> Add</button>
      {error
        ? <p id="g-ingredient-error" className="field-error dash-add-error" role="alert">{error}</p>
        : <p id="g-ingredient-hint" className="field-hint dash-add-error">Pick a match, or add several at once with commas.</p>}
    </form>
  );
}
