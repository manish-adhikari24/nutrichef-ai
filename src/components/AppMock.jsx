// Interactive app preview on the marketing pages: three tabs showing the main steps, inside a pretend browser window.
import { useRef, useState } from 'react';
import { Check, Plus, ShieldCheck, Sparkle, Timer, UsersThree, Leaf as LeafIcon } from '@phosphor-icons/react';
import MacroRing from './MacroRing.jsx';
import { img } from '../img.js';

// The three tabs, and the fake address shown for each.
const STEPS = [
  { id: 'kitchen', label: 'Add your ingredients', url: 'nutrichef.ai/generate' },
  { id: 'goals', label: 'Choose your filters', url: 'nutrichef.ai/generate' },
  { id: 'recipe', label: 'Get your recipe', url: 'nutrichef.ai/recipe' },
];

// Example data for the preview.
const INGREDIENTS = ['Eggs', 'Spinach', 'Lemon', 'Chickpeas', 'Tomato', 'Garlic'];
const FILTERS = [
  ['Meal type', 'Dinner'],
  ['Cuisine', 'Mediterranean'],
  ['Prep time', 'Under 30 min'],
  ['Difficulty', 'Easy'],
  ['Budget', 'Low'],
];

// Tab 1: ingredients added and the allergy profile.
function KitchenPanel() {
  return (
    <div className="mock-grid">
      <div>
        <p className="mock-h">What&apos;s in your kitchen?</p>
        <div className="mock-input">
          <Plus size={16} aria-hidden /> Add an ingredient
        </div>
        <ul className="chip-list" aria-label="Ingredients added">
          {INGREDIENTS.map((name) => (
            <li key={name} className="chip chip-on">
              <Check size={14} weight="bold" aria-hidden /> {name}
            </li>
          ))}
        </ul>
        <p className="mock-note">every one checked against your allergies</p>
      </div>
      <div className="meters">
        <p className="mock-h">Your allergy profile</p>
        <ul className="chip-list" aria-label="Allergies">
          <li className="chip chip-warn"><ShieldCheck size={14} weight="bold" aria-hidden /> Tree nuts</li>
          <li className="chip chip-warn"><ShieldCheck size={14} weight="bold" aria-hidden /> Shellfish</li>
        </ul>
        <p className="mock-text">Any recipe containing these is blocked before you see it.</p>
      </div>
    </div>
  );
}

// Tab 2: recipe filters and daily goals.
function FiltersPanel() {
  return (
    <div className="mock-grid">
      <div>
        <p className="mock-h">Shape the recipe</p>
        <ul className="mock-filters">
          {FILTERS.map(([label, value]) => (
            <li key={label}><span>{label}</span><b>{value}</b></li>
          ))}
        </ul>
      </div>
      <div className="meters">
        <p className="mock-h">Your daily goals</p>
        <div className="meter"><div className="meter-row"><span>Calories</span><b>1,900 kcal</b></div></div>
        <div className="meter">
          <div className="meter-row"><span>Protein</span><b>25%</b></div>
          <div className="meter-track" aria-hidden="true"><span style={{ width: '25%' }} /></div>
        </div>
        <div className="meter">
          <div className="meter-row"><span>Carbs</span><b>45%</b></div>
          <div className="meter-track" aria-hidden="true"><span style={{ width: '45%' }} /></div>
        </div>
        <div className="meter">
          <div className="meter-row"><span>Fat</span><b>30%</b></div>
          <div className="meter-track" aria-hidden="true"><span style={{ width: '30%' }} /></div>
        </div>
      </div>
    </div>
  );
}

// Tab 3: an example finished recipe with its macro ring and checks.
function RecipePanel() {
  return (
    <div className="mock-grid mock-grid-recipe">
      <div className="recipe-photo">
        <img src={img('green-plate.jpg')} alt="" loading="lazy" width="600" height="600" />
      </div>
      <div>
        <p className="mock-kicker">
          <Sparkle size={14} weight="fill" aria-hidden /> Example recipe
        </p>
        <p className="mock-title">Lemony spinach shakshuka with crispy chickpeas</p>
        <ul className="meta-list">
          <li><Timer size={16} aria-hidden /> 18 min</li>
          <li><UsersThree size={16} aria-hidden /> Serves 2</li>
          <li><LeafIcon size={16} aria-hidden /> Vegetarian</li>
        </ul>
        <div className="recipe-split">
          <MacroRing kcal={520} protein={31} carbs={42} fat={24} size={112} />
          <div className="recipe-checks">
            <p><ShieldCheck size={16} weight="bold" aria-hidden /> Allergen check passed</p>
            <p><Check size={16} weight="bold" aria-hidden /> Calories on target for dinner</p>
            <p><Check size={16} weight="bold" aria-hidden /> Protein on target</p>
            <p className="recipe-missing"><Sparkle size={16} aria-hidden /> Swap parsley for coriander</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Which panel goes with each tab.
const PANELS = { kitchen: KitchenPanel, goals: FiltersPanel, recipe: RecipePanel };

export default function AppMock() {
  // Index of the selected tab.
  const [active, setActive] = useState(0);
  // The tab buttons, so arrow keys can move focus between them.
  const tabRefs = useRef([]);
  const step = STEPS[active];
  const Panel = PANELS[step.id];

  // Left and right arrow keys move between tabs, wrapping round at each end.
  function onKeyDown(e) {
    const delta = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const next = (active + delta + STEPS.length) % STEPS.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="app-mock">
      {/* The tab buttons (accessible tab pattern). */}
      <div className="mock-tabs" role="tablist" aria-label="NutriChef AI in three steps" onKeyDown={onKeyDown}>
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            ref={(el) => (tabRefs.current[i] = el)}
            role="tab"
            id={`tab-${s.id}`}
            aria-selected={i === active}
            aria-controls={`panel-${s.id}`}
            tabIndex={i === active ? 0 : -1}
            className="mock-tab"
            onClick={() => setActive(i)}
          >
            <span className="mock-tab-num">{i + 1}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* The pretend browser showing the selected panel. */}
      <div className="browser">
        <div className="browser-bar" aria-hidden="true">
          <span className="dots"><i /><i /><i /></span>
          <span className="browser-url">{step.url}</span>
        </div>
        <div
          key={step.id}
          id={`panel-${step.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${step.id}`}
          className="browser-body"
        >
          <Panel />
        </div>
      </div>
    </div>
  );
}
