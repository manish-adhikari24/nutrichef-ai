# NutriChef AI website

Marketing site for NutriChef AI, built with Vite, React and React Router.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. `npm run build` makes a production build in `dist/`.

## AI recipes

`api/generate-recipe.js` calls Claude. Copy `.env.example` to `.env.local` and add your key for local use. On Vercel, add `ANTHROPIC_API_KEY` under Project Settings > Environment Variables.

## Pages

| Route | File |
|---|---|
| `/` | `src/pages/Home.jsx` |
| `/how-it-works` | `src/pages/HowItWorks.jsx` |
| `/features` | `src/pages/Features.jsx` |
| `/our-story` | `src/pages/Story.jsx` |
| `/signup` | `src/pages/SignUp.jsx` |
| `/login` | `src/pages/Login.jsx` |
| `/results`, `/reviews` | `src/pages/Results.jsx`, `src/pages/Reviews.jsx` |
| `/dashboard/*` | `src/pages/dashboard/` |

Colors, fonts and spacing live in `src/styles/tokens.css`. See `BRAND.md` for the brand guide.

## Before launch

- There's no real backend yet. All data goes through `src/lib/api.js`, which saves to the browser, so that's the one file to connect to the Django API. Passwords aren't checked or stored until then.
- Rule tables in `src/lib/rules.js` and allergen aliases in `src/lib/allergens.js` should move to the database. Nutrition values are AI estimates until the nutrition dataset exists.
- Have a lawyer review `src/data/terms.js`, fill in its bracketed details, and publish a Privacy Policy.
- The AI rate limit is per server instance. Use a shared store and real accounts before a public launch.
- Photos in `public/images/` are free Unsplash placeholders. Swap in your own when ready.
- When hosting, send every route to `index.html` (a single-page-app rewrite) so direct links
  like `/features` work.
