# Makeover Maths

A little thinking. A lot of magic. A browser maths and fashion game: earn play
money, unlock studios, choose flowing gowns and hairstyles, enter fashion shows,
and celebrate three consecutive wins with a party.

- 50 levels, three correct answers per level, Year 1 and Year 3 starting points.
- Adaptive questions with hints: place value, arithmetic, multiplication,
  division, fractions, money, measurement, shapes, time and charts.
- Two independent child profiles, each with their own progress and collection.
- Illustrated rooms with tap-to-walk and keyboard controls, 15 gown colourways,
  hair styles and colour sprays, makeup and a runway.
- Automatic device saves for guests; Google parent login and canonical Mongo
  saves when the five server environment variables are configured.

## Run locally

Node 24 or 25:

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:5193>. The Vite-only preview is explicit guest play.
For real Clerk and save API development, configure `.env.local` from
`.env.example`, link your own Vercel project and run `npm run dev:cloud`.
Configure the exact development origin with your Clerk development instance.

```sh
npm test
npm run build
npm run preview
```

## Deploy independently

Use your own Vercel project and app-scoped MongoDB credential. Set the five
server variables listed in `.env.example`; the browser bundle never reads them.
Enable Google in Clerk, add the exact app origins and use production keys for
production. `APP_ORIGINS` is an exact comma-separated allowlist, without paths or
trailing slashes. Both Clerk return URLs point to the current game origin.

`api/config.js` exposes only public Clerk configuration. `api/save.js` verifies
the Clerk session and constructs the save identity from its claims. The save
service validates both profiles and unfinished questions, uses atomic revisions,
and persists mutation IDs so lost acknowledgements can be retried safely.
Guest progress is separate; signing in does not import a guest adventure.

Account actions are under Options. Conflicting devices ask which adventure to
continue. Sign-out waits for acknowledged progress. Guest saves depend on browser
storage; clearing browser data removes them.

See [PLATFORM.md](PLATFORM.md) for release ownership and verification status.
Assets are included locally. [docs/art.md](docs/art.md) records their generation.
Run `node scripts/icons.mjs` to regenerate the branded install icons.

MIT licensed. No player data, credentials or agent runtime are included.
