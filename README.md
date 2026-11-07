# MSO Week

See your week, your prayer times and every MSO event at UC San Diego in one place. Mark events "Interested" to see clashes with classes, shifts and prayers right away. If a class overlaps a prayer, MSO Week drafts an accommodation email to your professor. It never sends anything for you.

Built for the "Deen & Dunya: Reimagining the Muslim Student Experience" track. Frontend only: no backend, no accounts, no analytics. Your choices stay in your browser (localStorage).

## Run it on Replit

1. Upload this project to a new Replit (or import it from GitHub).
2. Run `npm install` in the Shell.
3. Press **Run**. The app starts on port 5173.
4. **Publish** it as a **Static** deployment. Use `dist` as the public directory and `npm run build` as the build command.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine unit tests (Vitest)
npm run build    # production build in dist/
```

## Good to know

- **Prayer times:** the app fetches them from the Aladhan monthly API (ISNA method) and caches each month. If the API is down, it calculates them offline with `adhan` and says so.
- **Jummah:** the two session times are at the top of `src/engine/conflicts.ts` (marked *CONFIRM WITH MSA*). You can also change them in Settings.
- **MSO events:** these include prayer, so they're never prayer-flagged. Classes and shifts are.
- **Engine debug page:** `#/debug` lists every class and event with its conflict result.
- **Reset demo** (top right) clears your saved choices and reloads the sample data.
