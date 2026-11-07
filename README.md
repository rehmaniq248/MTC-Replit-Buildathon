# MSA ILM+

Your classes, prayer times, tasks, reminders and every MSO event at UC San Diego, in one place. Mark events "Interested" to see clashes with classes, shifts and prayers right away. If a class overlaps a prayer, MSA ILM+ drafts an accommodation email to your professor. It never sends anything for you.

## Pages

- **Home:** today's prayer timeline, plus live tiles for Classes, Reminders, Tasks and Events.
- **Dashboard:** everything on one screen. Today's prayers, the sliding week calendar, tasks, reminders and this week's MSO events.
- **Classes:** each class's prayer-conflict status, professor details and the accommodation email.
- **Reminders and Tasks:** add, check off and delete items. They're saved in your browser.
- **Events:** every MSO event this quarter by week, with MSO filters, double-booking badges and calendar export.

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
