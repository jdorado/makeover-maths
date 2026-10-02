# Release work frame

Objective: release the existing Makeover Maths game with the Cloudkeepers platform
boundary and the reusable browser-game spec.

Constraints: preserve the current game; use the shared Learning Games Clerk app;
keep one independent repository/project/database; retain generic public defaults;
keep secrets and private saves outside source.

Owner: Juan. Simplest path: copy the proven narrow auth/API/save boundary and
attach a game-specific save adapter; deploy to `makeover-maths.eztudy.space`.

Proof: clean build and focused checks; real Google return to this origin; two
profiles resume distinct progress and unfinished questions; authenticated API and
Mongo readback; a second parent and cross-game isolation; branded install assets.

Stop only for missing provider authority or a human sign-in/install step that
cannot be completed through the available authenticated tools.
