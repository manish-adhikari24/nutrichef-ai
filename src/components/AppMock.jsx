import { useRef, useState } from 'react';
import {
  Camera,
  Check,
  Plus,
  Timer,
  UsersThree,
  Leaf as LeafIcon,
  ShoppingCart,
  Sparkle,
} from '@phosphor-icons/react';
import MacroRing from './MacroRing.jsx';
import { img } from '../img.js';

const STEPS = [
  { id: 'kitchen', label: 'Tell it what you have', url: 'app.nutrichef.ai/kitchen' },
  { id: 'goals', label: 'Set your goals', url: 'app.nutrichef.ai/goals' },
  { id: 'recipe', label: 'Cook your recipe', url: 'app.nutrichef.ai/recipe/lemony-shakshuka' },
];

const PANTRY = ['Eggs (6)', 'Baby spinach', 'Lemon', 'Feta', 'Chickpeas', 'Cherry tomatoes', 'Garlic'];

function KitchenPanel() {
  return (
    <div className="mock-grid">
      <div>
        <p className="mock-h">What&apos;s in your kitchen?</p>
        <div className="mock-input">
          <Plus size={16} aria-hidden /> Add an ingredient
        </div>
        <ul className="chip-list" aria-label="Ingredients added">
          {PANTRY.map((p) => (
            <li key={p} className="chip chip-on">
              <Check size={14} weight="bold" aria-hidden /> {p}
            </li>
          ))}
        </ul>
        <p className="mock-note">7 ingredients found. That&apos;s enough for 23 recipes.</p>
      </div>
      <div className="scan">
        <img src={img('pantry-board.jpg')} alt="" loading="lazy" width="700" height="467" />
        <span className="scan-tag" style={{ left: '8%', top: '36%' }}>avocado</span>
        <span className="scan-tag" style={{ left: '44%', top: '18%' }}>eggs</span>
        <span className="scan-tag" style={{ left: '30%', top: '62%' }}>spinach</span>
        <span className="scan-tag" style={{ left: '66%', top: '46%' }}>spring onion</span>
        <span className="scan-cta">
          <Camera size={16} aria-hidden /> Scan my fridge
        </span>
      </div>
    </div>
  );
}

function Meter({ label, value, pct }) {
  return (
    <div className="meter">
      <div className="meter-row">
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <div className="meter-track" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function GoalsPanel() {
  return (
    <div className="mock-grid">
      <div>
        <p className="mock-h">How do you eat?</p>
        <ul className="chip-list" aria-label="Diet preferences">
          <li className="chip chip-on"><Check size={14} weight="bold" aria-hidden /> Vegetarian</li>
          <li className="chip">Vegan</li>
          <li className="chip">Pescatarian</li>
          <li className="chip">Keto</li>
        </ul>
        <p className="mock-h mock-h-sm">Leave out</p>
        <ul className="chip-list" aria-label="Allergies">
          <li className="chip chip-warn"><Check size={14} weight="bold" aria-hidden /> Tree nuts</li>
          <li className="chip">Gluten</li>
          <li className="chip">Shellfish</li>
        </ul>
      </div>
      <div className="meters">
        <p className="mock-h">Tonight&apos;s targets</p>
        <Meter label="Calories" value="550 kcal" pct={55} />
        <Meter label="Protein" value="30 g or more" pct={70} />
        <Meter label="Time" value="20 min or less" pct={33} />
        <Meter label="Servings" value="2" pct={25} />
      </div>
    </div>
  );
}

function RecipePanel() {
  return (
    <div className="mock-grid mock-grid-recipe">
      <div className="recipe-photo">
        <img src={img('green-plate.jpg')} alt="" loading="lazy" width="600" height="600" />
      </div>
      <div>
        <p className="mock-kicker">
          <Sparkle size={14} weight="fill" aria-hidden /> Written for you just now
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
            <p><Check size={16} weight="bold" aria-hidden /> Uses 6 of your 7 ingredients</p>
            <p><Check size={16} weight="bold" aria-hidden /> Hits your protein goal</p>
            <p className="recipe-missing">
              <ShoppingCart size={16} aria-hidden /> Parsley added to your grocery list
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const PANELS = { kitchen: KitchenPanel, goals: GoalsPanel, recipe: RecipePanel };

export default function AppMock() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef([]);
  const step = STEPS[active];
  const Panel = PANELS[step.id];

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

      <div className="browser">
        <div className="browser-bar" aria-hidden>
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
