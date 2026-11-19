// Allergy picker for the Profile page: click or type in one box, and a dropdown lists matching allergens.
// Chosen allergies show as removable tags. Anything not in the list can be added as typed.
// Same accessible combobox pattern as the ingredient search (arrows, Enter, Escape).
import { useState } from 'react';
import { Check, Plus, X } from '@phosphor-icons/react';

// How well an allergen matches what's typed: lower is better, null means no match.
// It also matches the allergen's other words, so "cheese" finds Milk.
function rank(entry, query) {
  const name = entry.name.toLowerCase();
  if (!query) return { score: 0 };
  if (name.startsWith(query)) return { score: 0 };
  if (name.split(' ').some((word) => word.startsWith(query))) return { score: 1 };
  const alias = entry.aliases.find((a) => a.startsWith(query) || a.split(' ').some((word) => word.startsWith(query)));
  if (alias) return { score: 2, alias };
  if (name.includes(query)) return { score: 3 };
  return null;
}

// common: the chosen allergens from the list. other: typed allergies as one comma-separated string.
// onChange is called with { allergies, otherAllergies } in the profile's shape.
export default function AllergySearch({ allergens, common, other, onChange, error }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const custom = other.split(',').map((a) => a.trim()).filter(Boolean);
  const chosen = [...common, ...custom].map((a) => a.toLowerCase());
  const query = text.trim().toLowerCase();

  // Matching allergens, best first, then an "add as typed" row for anything new.
  const matches = allergens
    .map((entry, order) => ({ ...entry, order, match: rank(entry, query) }))
    .filter((e) => e.match)
    .sort((a, b) => a.match.score - b.match.score || a.order - b.order);
  const offerTyped = query !== '' && !allergens.some((e) => e.name.toLowerCase() === query) && !chosen.includes(query);
  const rows = [...matches.map((m) => ({ ...m, kind: 'match' })), ...(offerTyped ? [{ kind: 'typed', name: text.trim() }] : [])];
  const showList = open && rows.length > 0;

  // Add or remove a listed allergen, or add a typed one. Typed names that match a listed allergen use the list.
  function choose(row) {
    if (row.kind === 'match') {
      const on = common.includes(row.name);
      onChange({ allergies: on ? common.filter((a) => a !== row.name) : [...common, row.name], otherAllergies: other });
    } else {
      addTyped([row.name]);
    }
    setText('');
    setActive(-1);
  }

  function addTyped(names) {
    let nextCommon = [...common];
    const nextCustom = [...custom];
    for (const raw of names) {
      const name = raw.trim().slice(0, 80);
      const listed = allergens.find((e) => e.name.toLowerCase() === name.toLowerCase());
      if (listed) {
        if (!nextCommon.includes(listed.name)) nextCommon = [...nextCommon, listed.name];
      } else if (name && !nextCustom.some((c) => c.toLowerCase() === name.toLowerCase())) {
        nextCustom.push(name);
      }
    }
    onChange({ allergies: nextCommon, otherAllergies: nextCustom.join(', ') });
  }

  function remove(name) {
    if (common.includes(name)) onChange({ allergies: common.filter((a) => a !== name), otherAllergies: other });
    else onChange({ allergies: common, otherAllergies: custom.filter((c) => c !== name).join(', ') });
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
    } else if (e.key === 'Enter') {
      // Enter picks the highlighted row, or adds what's typed (commas add several).
      e.preventDefault();
      if (showList && active >= 0) choose(rows[active]);
      else if (text.trim()) {
        addTyped(text.split(','));
        setText('');
      }
    }
  }

  const optionId = (i) => `p-allergy-option-${i}`;

  return (
    <div className="field allergy-field">
      <label htmlFor="p-allergy" className="field-label">Allergies</label>
      <p id="p-allergy-hint" className="field-hint">
        We check your ingredients and every recipe against these, and block any recipe that contains one.
      </p>
      <div className="combo">
        <input
          id="p-allergy"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls="p-allergy-list"
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          aria-describedby="p-allergy-hint"
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          placeholder="Search or type an allergy, e.g. peanuts"
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {/* The dropdown of allergens. Already chosen ones are ticked; picking them again removes them. */}
        {showList && (
          <ul id="p-allergy-list" role="listbox" className="combo-list" aria-label="Allergens">
            {rows.map((row, i) => {
              const on = row.kind === 'match' && common.includes(row.name);
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
                        {on && <Check size={14} weight="bold" aria-hidden />}
                        {row.name}
                        {row.match.alias && <small> includes {row.match.alias}</small>}
                      </span>
                      <span className="combo-meta">{on ? 'Added' : ''}</span>
                    </>
                  ) : (
                    <span className="combo-name"><Plus size={14} aria-hidden /> Add &ldquo;{row.name}&rdquo; as typed</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}

      {/* The chosen allergies as removable tags. */}
      {common.length + custom.length > 0 ? (
        <ul className="chip-list allergy-tags" aria-label="Your allergies">
          {[...common, ...custom].map((name) => (
            <li key={name} className="chip chip-on">
              {name}
              <button type="button" className="chip-remove" onClick={() => remove(name)} aria-label={`Remove ${name}`}>
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="field-hint allergy-tags">No allergies listed.</p>
      )}
    </div>
  );
}
