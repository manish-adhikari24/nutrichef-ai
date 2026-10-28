import { Leaf, Egg, Whisk } from '../components/Doodles.jsx';
import SignupBand from '../components/SignupBand.jsx';
import { img } from '../img.js';

const VALUES = [
  {
    doodle: Leaf,
    title: 'Waste less',
    body: 'Roughly a third of the food the world produces is lost or wasted. Every recipe we write starts with what is already in your kitchen.',
  },
  {
    doodle: Egg,
    title: 'Eat on purpose',
    body: 'Good nutrition should not mean weighing every leaf. We do the maths so you can just cook.',
  },
  {
    doodle: Whisk,
    title: 'Keep cooking fun',
    body: 'No lectures and no guilt. Just a nudge toward something tasty that you can start tonight.',
  },
];

export default function Story() {
  return (
    <>
      <section className="page-hero" aria-labelledby="story-title">
        <div className="wrap">
          <h1 id="story-title" className="display-1">
            It started with a sad fridge.
          </h1>
        </div>
      </section>

      <section className="section story" aria-label="Our story">
        <div className="wrap story-grid">
          <div className="story-photo">
            <img
              src={img('cooking-together.jpg')}
              alt="Two people laughing while cooking together in a bright kitchen"
              loading="lazy"
              width="1400"
              height="933"
            />
          </div>
          <div className="story-copy">
            <p className="story-lead">
              Half an onion, three eggs, some wilting spinach and a vague promise to eat better.
              We kept opening the same fridge and ordering the same takeout.
            </p>
            <p>
              Recipe sites wanted us to go shopping first. Nutrition apps wanted us to log every
              bite. Neither one looked at what we actually had.
            </p>
            <p>
              So we built NutriChef AI: a cook that starts with your kitchen, knows a little
              nutrition, and writes you something good to make tonight. It&apos;s still early, and
              we&apos;re building it alongside the home cooks who use it.
            </p>
            <span className="note">the NutriChef team</span>
          </div>
        </div>
      </section>

      <section className="section values" aria-labelledby="values-title">
        <div className="wrap">
          <h2 id="values-title" className="display-2">What we cook by</h2>
          <ul className="values-list">
            {VALUES.map(({ doodle: D, title, body }) => (
              <li key={title}>
                <D className="value-doodle" />
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SignupBand heading="Come cook with us." />
    </>
  );
}
