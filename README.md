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
| `/dashboard` | `src/pages/dashboard/GenerateRecipe.jsx` |
| `/dashboard/nutrition` | `src/pages/dashboard/Nutrition.jsx` |
| `/dashboard/profile` | `src/pages/dashboard/Profile.jsx` |
| `/dashboard/pantry` | `src/pages/dashboard/Pantry.jsx` |
| `/dashboard/meal-plan` | `src/pages/dashboard/MealPlan.jsx` |

Colors, fonts and spacing live in `src/styles/tokens.css`. See `BRAND.md` for the brand guide.

## Before launch

- Sign-up and login have no real accounts yet: the buttons just move to the next page, and anyone can open the dashboard. Search for `TODO` to find where to add real sign-in.
- Nutrition, pantry and meal plan use sample data from `src/data/sampleDashboard.js`. The profile is saved only in the browser, so real accounts need secure storage.
- Have a lawyer review `src/data/terms.js`, fill in its bracketed details, and publish a Privacy Policy.
- The AI rate limit is per server instance. Use a shared store and real accounts before a public launch.
- Photos in `public/images/` are free Unsplash placeholders. Swap in your own when ready.
- When hosting, send every route to `index.html` (a single-page-app rewrite) so direct links
  like `/features` work.
