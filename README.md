# NutriChef AI website

Marketing site for NutriChef AI, built with Vite, React and React Router.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. `npm run build` makes a production build in `dist/`.

## Backend

The API is a Django and Django REST Framework project in `backend/`. It uses SQLite locally and PostgreSQL through `DATABASE_URL` in production.

```bash
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
cp .env.example .env
.venv/Scripts/python manage.py migrate
.venv/Scripts/python manage.py seed
.venv/Scripts/python manage.py runserver 8000
```

### Seed data

All reference data lives in JSON files in `backend/recipes/seed/`, not in the code: nutrition values, ingredient categories and aliases, allergens with their aliases and safe phrases, substitution, supplement and wellness rules, sample recipes, and every form choice (fitness goals, activity levels, diets, meal types, sexes, cuisines, difficulties, budgets and prep times).

`python manage.py seed` loads them into the database. It replaces the reference tables each time, so to change the data, edit a file and run it again. User data is never touched. Render runs it on every deploy, and the tests run it on the test database.

The server validates forms against these tables, and the website loads them from `GET /api/reference`, so the data exists in one place only.

Run the tests with `.venv/Scripts/python manage.py test`. Add `ANTHROPIC_API_KEY` to `backend/.env` to generate real AI recipes.

## Deploying

- **Database:** PostgreSQL on Neon's free plan. Copy its connection string, including `sslmode=require`.
- **Backend:** `render.yaml` defines the API on Render. Add `DATABASE_URL`, `ANTHROPIC_API_KEY`, `BREVO_API_KEY` and `EMAIL_FROM` in the Render dashboard.
- **Frontend:** on Vercel, set `VITE_API_URL` to the Render URL.

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

- Check the approximate nutrition values in `backend/recipes/seed/nutrition.json` against a published database, then run `python manage.py seed`.
- Have a lawyer review `src/data/terms.js`, fill in its bracketed details, and publish a Privacy Policy.
- Rate limits use each server's memory, so use a shared cache if you run more than one.
- Photos in `public/images/` are free Unsplash placeholders. Swap in your own when ready.
- When hosting, send every route to `index.html` (a single-page-app rewrite) so direct links
  like `/features` work.
