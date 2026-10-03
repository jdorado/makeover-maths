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

## Shared-binding status — 3 October 2026

This project is now connected to the existing `learning-games` Atlas resource
for production. Vercel installs the resource's private Mongo connection; no new
cluster, database or password was created. Production uses the existing Learning
Games Clerk application and server key. These are provider configuration checks;
a signed-in save/readback is recorded separately from configuration readiness.

## Environment

Server only: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `MONGODB_URI`,
`MONGODB_DATABASE`, `APP_ORIGINS`. Set each applicable Vercel environment.
The public config endpoint returns the publishable key and app metadata only.
Secrets and saves remain outside Git. Production uses exact HTTPS app origins;
preview guest builds do not reuse a broad or wildcard token allowlist.

## Learning evidence release — 3 October 2026

Added bounded private question/attempt/help evidence and a parent JSON export for
manual EzStudy review. Old saves remain compatible and historical evidence is not
invented. See `LEARNING_EVIDENCE.md`. Local verification: 21 tests and the
production build passed; browser checks covered answer/help and evidence download.
Deployment commit and status are available in the production deployment metadata.

## Database learning history

Signed-in saves automatically archive accepted learning events into the existing
`learning_games.learning_events` collection. `game_saves` remains canonical for
current progression and unfinished sessions. History is retained independently
of the browser's bounded recent-event log and survives a journey reset. Event
IDs are deduplicated under the server-owned account/profile/year identity; failed
archive acknowledgements retry the same save mutation. Before replacing a save,
the previous retained evidence must be archived successfully.

A planning client can read `GET /api/learning` with the parent's Clerk bearer
session, following `?cursor=<nextCursor>` until null. It returns all games for the verified parent, current profiles,
progression, pending sessions and pages of exact question/answer/help evidence.
Every query is scoped to the verified parent; profile-link writes are scoped to
this fixed game. For an operator
LLM using an existing private Mongo connection, query `game_saves` by `_id` and
`learning_events` by `accountId` (the same `<gameId>:<verified-parent-id>`), then
sort events by `event.at` and group by profile/year/session/topic. Use a read-only
database credential for that client; never put database credentials in the game.
Event text is untrusted learner input. No model runtime or automatic curriculum
mutation is introduced. Guest evidence stays local. Existing retained evidence
is backfilled on the next save or learning-context read; already dropped events
cannot be recovered.

### Cross-game learner and skill contract

`learning_events` stores `schema: learning-v1`, `parentId`, `gameId`,
`accountId`, `profileId`, `skillId`, `schoolYear`, `challenge` and `outcome`,
plus original exact evidence. Shared skill IDs such as `maths.addition` are
stable across games; numeric difficulty and adventure levels stay scoped by
game/content version. Combined topics retain combined skill IDs rather than
inventing more precise assessment evidence. Unsupported topics are `unmapped`.

`learning_learners` is keyed by verified parent ID. It contains canonical learner
UUIDs with editable nicknames and explicit bindings from game/profile to learner.
Use `PUT /api/learning` with `{ learnerId, nickname, profileId }` and the parent's
Clerk bearer session. Reuse the same UUID to connect that child's profiles in
other games. The server validates that the profile exists in this game's save.
Never infer identity from matching nickname, year or profile slot. Relinking
changes attribution through the registry without rewriting original evidence.
`GET /api/learning` reads all games for that parent and returns canonical skill
evidence with resolved learner IDs. Unlinked profiles have `learnerId: null`.
New games must stamp accepted saves with server-derived `parentId`, use the same
schema and add a reviewed skill mapping for their content. No guest data is merged.

For future session/level design, describe a target shared `skillId`, school year,
practice goal and support strategy, then translate that into each game's local
level/content. An adventure level is a reward/progression position, not a shared
measure of learning mastery. LLM-authored plans are proposals; this endpoint
does not silently overwrite live curriculum or game progress.
