# Makeover Maths

Independent public MIT game. Follow `/Users/juancamilo/dev/specs/_game_browser-spec.md`.
Work on main and preserve unrelated work. Use npm; run focused game/platform tests,
build, and the real browser save/resume flow before releasing.

React/DOM owns rendering and deterministic game rules. The copied Clerk bootstrap
owns parent sign-in; Vercel Node API verifies the parent and owns Mongo saves.
Children have stable parent-owned profile IDs and editable nicknames. The browser
never supplies an owner ID. Keep guest progress separate from parent data.
One repository, Vercel project, domain and scoped Mongo database per game.
Keep secrets, player saves and `.vercel` out of Git. Do not add an agent runtime.
