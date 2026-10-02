# Deployment ownership

- Stable game ID: `makeover-maths`.
- Independent public source: <https://github.com/jdorado/makeover-maths>.
- Vercel project: `makeover-maths`, existing ezenciel team.
- Production origin: <https://makeover-maths.eztudy.space>.
- Shared parent identity: existing Clerk Learning Games production application.
- Shared Atlas binding: existing Cloudkeepers `learning-games` deployment/integration and working private credential.
- Mongo database: `learning_games`, collection `game_saves`; every read/write is scoped by the server-owned game/parent key.
- Reuse the existing provider bindings; no new Atlas password or Clerk/Google setup is required. Shared credentials do not provide a database permission boundary between game backends.
- Source/release branch: `main`; exact release commit is available in GitHub and
  Vercel deployment metadata.

The narrow platform boundary follows the Cloudkeepers setup. React/DOM and the
maths rules belong to this game; no common game framework or agent runtime is
introduced. Parent IDs come only from verified Clerk claims. Stable child IDs
`player-1` and `player-2` have editable nicknames and are not Clerk accounts.
Mongo documents use `_id = makeover-maths:<verified parent>` and contain the
schema/content versions, revision, selected profile, both profiles, view,
mutation ID/digest and timestamp. A stale device receives an explicit conflict.

## Verification — 2 October 2026

Passed locally: production build; 12 focused domain/platform checks (duplicate
rewards, 50-level completion, purchased item ownership, party invitations,
question generation, profile separation, bounded save validation, parent
isolation, revision conflicts, concurrent initial saves, lost acknowledgement
retry, unauthenticated API rejection). Real Brave guest play earned $1,000 and
resumed the unfinished next question after reload.

Production deployment: Vercel Ready at `makeover-maths.eztudy.space`; GitHub
checks passed for source commit `9f543d6`. Brave guest play verified independent
profile progress and exact question/hint restoration after reload. The shared
production Clerk keys and exact app origins were configured. The original setup
requested a separate scoped Atlas password; that requirement is superseded by
the shared-provider contract. Reuse the working Cloudkeepers Atlas binding and
`MONGODB_DATABASE=learning_games`. The save function includes the
shared TypeScript validators explicitly and responds with a setup error while
the credential is missing, instead of crashing during import.

iPhone Chrome loaded the production game. The Add to Home Screen sheet showed
the branded gown icon, short name Makeover, correct HTTPS origin and Open as Web
App enabled. Add was submitted; mirroring disconnected when the phone became
active, so installation completion and standalone launch are not yet confirmed.

Not yet accepted: production Google round trip, shared Atlas binding,
authenticated canonical API/Mongo readback, second Google parent, cross-app
identity/data isolation and actual phone home-screen installation. These are
live acceptance checks, not conclusions supplied by the unit tests.

## Shared-binding status — 2 October 2026

Source guidance, environment examples and save scoping now target the shared
Atlas resource and `learning_games.game_saves`. Provider readback found only the
reference `cloudkeepers` project connected to that resource. The connection for
this project remains pending action-time approval; the source change is not
live Google/Mongo acceptance evidence. Do not create another Atlas password.

## Environment

Server only: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `MONGODB_URI`,
`MONGODB_DATABASE`, `APP_ORIGINS`. Set each applicable Vercel environment.
The public config endpoint returns the publishable key and app metadata only.
Secrets and saves remain outside Git. Production uses exact HTTPS app origins;
preview guest builds do not reuse a broad or wildcard token allowlist.
