// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveEvidence, evidenceRows, captureSave, learningContext } from '../server/learning-service.js';
import { saveIdentity } from '../server/save-service.js';
import { createGameState as fresh } from '../src/game/save.ts';
const log = s => s.profiles['player-1'].data.player.evidence;
const envelope = (gameState, revision, mutationId) => ({ gameState, revision, mutationId });
class Saves {
  docs = new Map();
  async findOne({ _id }) { return structuredClone(this.docs.get(_id) || null); }
  async insertOne(doc) { this.docs.set(doc._id, structuredClone(doc)); }
  async updateOne({ _id, revision }, { $set }) {
    if (this.docs.get(_id)?.revision !== revision) return { matchedCount: 0 };
    this.docs.set(_id, { ...this.docs.get(_id), ...structuredClone($set) }); return { matchedCount: 1 };
  }
}
class Events {
  docs = new Map(); fail = false;
  async bulkWrite(ops) {
    if (this.fail) throw new Error('archive unavailable');
    for (const { updateOne: op } of ops) if (!this.docs.has(op.filter._id)) this.docs.set(op.filter._id, structuredClone(op.update.$setOnInsert));
  }
  find(query) {
    let rows = [...this.docs.values()].filter(row => row.accountId === query.accountId && (!query._id || row._id > query._id.$gt));
    return { sort() { rows.sort((a,b) => a._id.localeCompare(b._id)); return this; }, limit(n) { rows = rows.slice(0,n); return this; }, async toArray() { return structuredClone(rows); } };
  }
}
const event = { id: 'event-1', questionId: 'question-1', sessionId: 'session-1', type: 'answer', at: '2026-10-03T10:00:00Z', year: '1', difficulty: 0, topic: 'addition', contentVersion: 'test-v1', activeMs: 1500, question: { prompt: '1 + 1', answer: '2' }, submittedAnswer: '2', attempt: 1, correct: true, independent: true, helpUsed: false };
const input = (revision = 0) => { const state = fresh(); log(state).events.push(structuredClone(event)); return envelope(state, revision, crypto.randomUUID()); };
test('archives accepted saves idempotently and preserves history through reset', async () => {
  const saves = new Saves(), events = new Events(), first = input();
  assert.equal((await captureSave(saves, events, 'parent-a', first)).status, 200);
  assert.equal((await captureSave(saves, events, 'parent-a', first)).status, 200);
  assert.equal(events.docs.size, 1);
  assert.equal((await captureSave(saves, events, 'parent-a', input(),)).status, 409);
  const reset = envelope(fresh(), 1, crypto.randomUUID());
  await captureSave(saves, events, 'parent-a', reset);
  assert.equal(events.docs.size, 1);
  const context = await learningContext(saves, events, 'parent-a');
  assert.equal(context.evidence[0].event.submittedAnswer, '2');
  assert.equal((await learningContext(saves, events, 'parent-b')).evidence.length, 0);
});
test('archive failure after accepted save is repaired by the identical mutation', async () => {
  const saves = new Saves(), events = new Events(), first = input(); events.fail = true;
  await assert.rejects(captureSave(saves, events, 'parent-a', first));
  assert.equal((await saves.findOne({ _id: saveIdentity('parent-a') })).revision, 1);
  events.fail = false;
  const result = await captureSave(saves, events, 'parent-a', first);
  assert.equal(result.body.revision, 1); assert.equal(events.docs.size, 1);
  events.fail = true;
  await assert.rejects(captureSave(saves, events, 'parent-a', envelope(fresh(), 1, crypto.randomUUID())));
  assert.equal((await saves.findOne({ _id: saveIdentity('parent-a') })).revision, 1);
});
test('context backfills old saves, paginates and excludes foreign game/account evidence', async () => {
  const saves = new Saves(), events = new Events();
  const raw = input();
  // Obtain a normalized historical document without the archive hook.
  const { writeAccount } = await import('../server/save-service.js');
  await writeAccount(saves, 'parent-a', raw);
  const document = await saves.findOne({ _id: saveIdentity('parent-a') });
  const row = evidenceRows(document)[0];
  for (let i = 0; i < 205; i++) events.docs.set(String(i).padStart(64,'0'), { ...row, _id: String(i).padStart(64,'0'), eventId: `history-${i}` });
  await archiveEvidence(events, { ...document, _id: 'another-game:parent-a' });
  const page = await learningContext(saves, events, 'parent-a');
  assert.equal(page.evidence.length, 200); assert.ok(page.nextCursor);
  const last = await learningContext(saves, events, 'parent-a', page.nextCursor);
  assert.equal(last.evidence.length, 6); assert.equal(last.nextCursor, null);
  assert.ok([...page.evidence, ...last.evidence].every(e => e.accountId === saveIdentity('parent-a')));
});

test('learning API rejects unauthenticated requests and write methods', async () => {
  const { default: handler } = await import('../api/learning.js');
  const previous = { ...process.env };
  Object.assign(process.env, { CLERK_SECRET_KEY: 'test-only', MONGODB_URI: 'test-only', MONGODB_DATABASE: 'learning_games', APP_ORIGINS: 'https://game.invalid' });
  try {
    const response = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ method: 'GET', headers: {}, url: '/api/learning' }, response);
    assert.equal(response.code, 401);
    await handler({ method: 'POST', headers: {}, url: '/api/learning' }, response);
    assert.equal(response.code, 405);
  } finally {
    for (const key of ['CLERK_SECRET_KEY', 'MONGODB_URI', 'MONGODB_DATABASE', 'APP_ORIGINS']) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});
