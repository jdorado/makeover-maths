# Deployment ownership

- Stable game ID: `makeover-maths`.
- Independent public source: <https://github.com/jdorado/makeover-maths>.
- Vercel project: `makeover-maths`, existing ezenciel team.
- Intended production origin: <https://makeover-maths.eztudy.space>.
- Shared parent identity: existing Clerk Learning Games production application.
- Dedicated Mongo database: `makeover_maths`, collection `game_saves`.
- App credential must have `readWrite` on `makeover_maths` only.
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

Not yet accepted: production Google round trip, app-scoped Atlas credential,
authenticated canonical API/Mongo readback, second Google parent, cross-app
identity/data isolation and actual phone home-screen installation. These are
live acceptance checks, not conclusions supplied by the unit tests.

## Environment

Server only: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `MONGODB_URI`,
`MONGODB_DATABASE`, `APP_ORIGINS`. Set each applicable Vercel environment.
The public config endpoint returns the publishable key and app metadata only.
Secrets and saves remain outside Git. Production uses exact HTTPS app origins;
preview guest builds do not reuse a broad or wildcard token allowlist.
