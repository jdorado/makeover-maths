# Private learning evidence

The public game records practice evidence in its existing private save. There is no analytics vendor or LLM call. Signed-in data belongs to the verified parent's game-scoped Mongo document; guests keep data on their device. No learner records, exports or credentials belong in this repository.

Use **Download learning evidence** in the parent practice view, Grown-up corner or Options. The JSON uses `learning-evidence-v1`, with game ID, export time and stable game-local profile IDs/nicknames. Each log contains question, answer, hint, automatic explanation, read-aloud or skipped-question events as supported by the game. Events include a question snapshot (prompt, answer, choices and visual data), generation-time difficulty/year, topic, question ID, timestamp, browser session ID and cumulative active milliseconds. Answer events include the submitted answer, attempt number, correctness, help usage and independent success.

Timing is approximate: it excludes hidden/unfocused pages, closed questions and long idle periods. It includes reading/thinking and is not a speed target. `sessionId` identifies a browser page visit; resumptions share question IDs but may have different session IDs. Reading assistance is recorded separately from mathematical hints.

Each evidence log retains at most 300 events and 90,000 JSON characters (within the existing save size limits). `dropped` indicates rolled-off events. Export regularly to retain longer history. The export also includes current unfinished questions. A question start without a solved answer or explicit skip remains unresolved; do not infer disengagement from it. Older saves migrate with an empty evidence log: historical attempts, help and timing are never invented. Practice evidence is client-recorded, not a certified assessment.

## Manual EzStudy review

1. Download the three games' evidence from the parent's signed-in account. Guest exports contain only the device's separate history.
2. Store the files privately in the existing family learning workspace. Explicitly map `(gameId, profileId)` to the child; IDs/nicknames across games are not universal learner identities. Keep this mapping private.
3. Give one manual LLM run the exports, previous private review and relevant parent observations. Deduplicate repeated exports by event ID and group attempts by question ID; cumulative time must not be summed across retries. Mark incomplete/rolled-off questions and evidence gaps.
4. Request a per-skill review: independent first-attempt performance, retry/help dependence, exact error examples, representation coverage, difficulty and changes across dated sessions. Include evidence counts and confidence. Avoid an overall age/year ability score or interpreting game completion as mastery.
5. Choose a few next activities: consolidate, extend, test transfer in a new context, or ask for an explanation. Use curriculum as a coverage reference; let evidence and curiosity guide challenge. Record decisions privately in EzStudy.

The games do not automatically upload exports to EzStudy or alter lessons. A saved private review is the next manual planning input. Parent observations and unfamiliar reasoning tasks complement the evidence.
