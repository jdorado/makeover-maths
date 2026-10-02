// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { APP_CONFIG } from "../app.config.js";
import { createGameState as createState, restoreGameState as restoreState } from "../src/game/save.ts";
import { makeQuestion } from "../src/game/game.ts";
import { CloudSave } from "../src/platform/cloud-save.ts";
import { readAccount, saveIdentity, writeAccount } from "../server/save-service.js";
import handler from "../api/save.js";

class Collection {
  constructor() { this.docs = new Map(); }
  async findOne({ _id }) { return structuredClone(this.docs.get(_id) || null); }
  async insertOne(document) { if (this.docs.has(document._id)) throw Object.assign(new Error("duplicate"), { code: 11000 }); this.docs.set(document._id, structuredClone(document)); }
  async updateOne({ _id, revision }, { $set }) { const current = this.docs.get(_id); if (current?.revision !== revision) return { matchedCount: 0 }; this.docs.set(_id, { ...current, ...structuredClone($set) }); return { matchedCount: 1 }; }
}
const memoryStorage = () => { const values = new Map(); return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) }; };
const input = (gameState = createState(), revision = 0, mutationId = crypto.randomUUID()) => ({ gameState, revision, mutationId });

test("one explicit game ID scopes account documents", () => {
  assert.equal(saveIdentity("parent-a"), `${APP_CONFIG.id}:parent-a`);
  assert.equal(APP_CONFIG.databaseName, "makeover_maths");
});

test("child profiles and unfinished questions keep independent game data", () => {
  const state = createState();
  state.profiles["player-1"].data.player.coins = 4000;
  state.profiles["player-1"].data.session.question = makeQuestion(state.profiles["player-1"].data.player, 'addition');
  assert.equal(state.profiles["player-2"].data.player.coins, 0);
  assert.deepEqual(restoreState(JSON.parse(JSON.stringify(state))), JSON.parse(JSON.stringify(state)));
  assert.throws(() => restoreState({ ...state, selectedProfileId: 'unknown' }));
});

test("verified parent IDs isolate Mongo records and request owner IDs are ignored", async () => {
  const collection = new Collection();
  const result = await writeAccount(collection, "parent-a", { ...input(), userId: "parent-b" });
  assert.equal(result.status, 200);
  assert.equal((await readAccount(collection, "parent-b")).gameState, null);
  assert.equal((await readAccount(collection, "parent-a")).gameState.gameId, APP_CONFIG.id);
});

test("duplicate mutations are idempotent and stale writes conflict", async () => {
  const collection = new Collection(); const first = input();
  assert.equal((await writeAccount(collection, "parent-a", first)).body.revision, 1);
  assert.equal((await writeAccount(collection, "parent-a", first)).body.revision, 1);
  assert.equal((await writeAccount(collection, "parent-a", input())).status, 409);
});

test("concurrent first writes have one winner and invalid game envelopes are rejected", async () => {
  const collection = new Collection();
  const results = await Promise.all([writeAccount(collection, "parent-a", input()), writeAccount(collection, "parent-a", input())]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  const invalid = createState(); invalid.profiles['player-1'].data.player.coins = -1;
  assert.equal((await writeAccount(collection, "parent-a", input(invalid, 1))).status, 400);
});

test("lost acknowledgements retry the exact persisted mutation", async () => {
  const collection = new Collection(), storage = memoryStorage(); let drop = true; const mutations = [];
  const request = async (method, body) => {
    if (method === "GET") return readAccount(collection, "parent-a");
    mutations.push(body.mutationId); const result = await writeAccount(collection, "parent-a", body);
    if (drop) { drop = false; throw new Error("response lost"); }
    if (result.status !== 200) throw Object.assign(new Error("write failed"), { status: result.status, body: result.body });
    return result.body;
  };
  const options = { storage, request, apply() {}, status() {}, conflict() {} };
  const first = new CloudSave(options); await first.connect("parent-a"); first.save(createState()); clearTimeout(first.timer); await first.flush();
  const resumed = new CloudSave(options); await resumed.connect("parent-a"); clearTimeout(resumed.timer);
  assert.equal(mutations[0], mutations[1]);
  assert.equal(resumed.state.revision, 1);
});

test("save API rejects an unauthenticated request before database access", async () => {
  const previous = { ...process.env };
  Object.assign(process.env, { CLERK_SECRET_KEY: "sk_test_placeholder", MONGODB_URI: "mongodb://127.0.0.1:1", MONGODB_DATABASE: APP_CONFIG.databaseName, APP_ORIGINS: "https://game.example.com" });
  const response = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ method: "GET", headers: {} }, response);
  assert.equal(response.code, 401);
  for (const key of ["CLERK_SECRET_KEY", "MONGODB_URI", "MONGODB_DATABASE", "APP_ORIGINS"]) {
    if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
  }
});
