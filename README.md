# Makeover Maths

A little thinking. A lot of magic. A browser maths and fashion game: earn play
money, unlock studios, choose flowing gowns and hairstyles, enter fashion shows,
and celebrate three consecutive wins with a party.

- 50 levels, three correct answers per level, with studios, maths topics and
  fashion styles arriving as visible milestones through level 48.
- Per-topic adaptive questions with hints. Year 1 introduces topics gradually;
  Year 3 starts with the full mix.
- Two independent child profiles, each with their own progress and collection.
- Illustrated rooms with tap-to-walk and keyboard controls, 15 gown colourways,
  hair styles and colour sprays, makeup and a runway with visible theme matches.
- A free first gown choice, a winnable debut show, and party invitations that
  are spent only when the player deliberately starts the celebration.
- Automatic device saves for guests; Google parent login and canonical Mongo
  saves when the five server environment variables are configured.

## Run locally

Node 24 or 25:

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

Open <http://127.0.0.1:5193>. The Vite-only preview is explicit guest play.
For real Clerk and save API development, configure `.env.local` from
`.env.example`, link your own Vercel project and run `pnpm run dev:cloud`.
Configure the exact development origin with your Clerk development instance.

```sh
pnpm test
pnpm run build
pnpm run preview
```

## Deploy independently

For another game in this workspace, keep its own Vercel project and reuse the
existing Cloudkeepers Atlas `learning-games` binding, working private credential,
`learning_games.game_saves` and Learning Games Clerk production application with
Google already configured. No new database/password or Google OAuth client is
required. Set the five server variables listed in `.env.example`; the browser
bundle never reads them. Independent external operators supply their own
provider configuration. Add the exact app origins and use production keys for
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

## Learning evidence

Parent review can download exact questions, submitted answers, retries, help and approximate active time. Signed-in evidence stays in private parent-owned saves; guest evidence stays on the device. See [the evidence format and manual EzStudy workflow](LEARNING_EVIDENCE.md).

### Free voice trial

The **Read instructions** buttons play bundled MP3 instructions for each studio,
the maths activity and help. Generate the clips with `node scripts/generate-voice.mjs`,
supplying `OPENROUTER_API_KEY` privately in the process environment. The narrator uses a gentle female fairy-tale princess style, with the first
generated clip anchoring the voice for the others. The script uses only `fish-audio/s2.1-pro-free:free`, with no paid fallback. It saves provenance in
`public/audio/manifest.json` and reuses unchanged clips. Credentials and learner
information are never included in the audio or browser bundle. Audio buttons stay
disabled until clips exist; generation requires a valid OpenRouter credential.
In the maths dialog, **Read question** generates the current question on demand
through `/api/speech`, using the same free princess voice. Only the question text
is sent; answers, hints, profiles and learning records are excluded. Repeat plays
reuse audio cached in the browser and the shared `game_audio` collection. The
server requires `OPENROUTER_API_KEY`; there is no paid fallback. Isolated phonics
clips still need pronunciation review.

The private games credential is stored in 1Password as **Learning Games OpenRouter API Key**.

### Tablet play surface

On iPad-sized screens, the game fills the available viewport in portrait and
landscape. The room, navigation, voice and progression controls stay visible;
long studio collections scroll inside their panel. Landscape maths challenges
place the question beside the answers and hint. Dynamic viewport sizing and safe
area padding also support Safari toolbars and home-screen launch.

Competition artwork uses generated storybook illustrations to match the gowns:
22 individual shop items in `public/games/makeover-maths/gear`, with separate
face-sized makeup overlays. Shoes, bags and hair accessories use the same image
in the shop and on the character; wearable layers follow the original pose.
Sports, garden and talent competitions have their own generated room backgrounds.
Assets are cropped from transparent illustration sheets and stored as WebP.
Existing item IDs, ownership and competition scoring remain compatible with saves.
