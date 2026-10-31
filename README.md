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
.venv/Scripts/python manage.py runserver 8000
```

Run the tests with `.venv/Scripts/python manage.py test`. Add `GEMINI_API_KEY` to `backend/.env` to generate real AI recipes.

## Deploying

- **Database:** PostgreSQL on Neon's free plan. Copy its connection string, including `sslmode=require`.
- **Backend:** `render.yaml` defines the API on Render. Add `DATABASE_URL` and `GEMINI_API_KEY` in the Render dashboard. Set `GEMINI_MODEL` to change the model.
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

- Check the approximate nutrition values in `backend/recipes/seed_data.py` against a published database. Allergen aliases also live in `src/lib/allergens.js` for instant warnings, so keep the two in step. The server's check is the one that counts.
- Have a lawyer review `src/data/terms.js`, fill in its bracketed details, and publish a Privacy Policy.
- Rate limits use each server's memory, so use a shared cache if you run more than one.
- Photos in `public/images/` are free Unsplash placeholders. Swap in your own when ready.
- When hosting, send every route to `index.html` (a single-page-app rewrite) so direct links
  like `/features` work.
