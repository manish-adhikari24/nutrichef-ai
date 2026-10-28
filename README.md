# NutriChef AI website

Marketing site for NutriChef AI, built with Vite, React and React Router.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. `npm run build` makes a production build in `dist/`.

## Pages

| Route | File |
|---|---|
| `/` | `src/pages/Home.jsx` |
| `/how-it-works` | `src/pages/HowItWorks.jsx` |
| `/features` | `src/pages/Features.jsx` |
| `/our-story` | `src/pages/Story.jsx` |
| `/signup` | `src/pages/SignUp.jsx` |
| `/signin` | `src/pages/SignIn.jsx` |

Colors, fonts and spacing live in `src/styles/tokens.css`. See `BRAND.md` for the brand guide.

## Before launch

- Sign-up and sign-in forms are front-end only. Search for `TODO` to find where to call your API.
- Photos in `public/images/` are free Unsplash placeholders. Swap in your own when ready.
- When hosting, send every route to `index.html` (a single-page-app rewrite) so direct links
  like `/features` work.
