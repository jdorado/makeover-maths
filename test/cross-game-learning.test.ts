// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalEvidence, bindingKey } from '../server/learning-schema.js';
import { crossGameContext, linkLearner } from '../server/cross-game-learning.js';
import { saveIdentity } from '../server/save-service.js';
const learnerId = '12345678-1234-1234-1234-123456789abc';
const row = (gameId, profileId, topic) => ({ _id: `${gameId}-event`, accountId: `${gameId}:parent-a`, profileId, event: { year: 'year1', topic, difficulty: 2, contentVersion: 'v1', type: 'answer', correct: true, independent: true, helpUsed: false, attempt: 1 } });
test('shared skills match across games while challenge scales stay local', () => {
  const inputs = [row('cloudkeepers', 'player-1', 'fountain'), row('makeover-maths', 'player-1', 'addition'), row('cloudkeepers-storybook', 'explorer-one', '1')];
  const bindings = Object.fromEntries(inputs.map(r => [bindingKey(r.accountId, r.profileId), { learnerId }]));
  const evidence = inputs.map(r => canonicalEvidence(r, bindings));
  assert.ok(evidence.every(e => e.skillId === 'maths.addition' && e.schoolYear === 1 && e.learnerId === learnerId));
  assert.equal(new Set(evidence.map(e => e.challenge.gameId)).size, 3);
  assert.equal(canonicalEvidence(inputs[0]).learnerId, null);
  assert.equal(canonicalEvidence(row('future-game', 'child', 'unknown')).skillId, 'unmapped');
  assert.equal(canonicalEvidence(row('cloudkeepers', 'child', 'light-3')).skillId, 'maths.money-measurement');
});
test('linking validates owned profiles and derives account identity on the server', async () => {
  const saves = { async findOne(query) { assert.equal(query._id, saveIdentity('parent-a')); return { profiles: { child: { nickname: 'Player' } } }; } };
  let mutation;
  const learners = { async updateOne(query, update, options) { mutation = { query, update, options }; } };
  assert.equal((await linkLearner(saves, learners, 'parent-a', { learnerId, profileId: 'child', nickname: 'Learner', userId: 'parent-b' })).status, 200);
  assert.equal(mutation.query._id, 'parent-a');
  const binding = Object.values(mutation.update.$set).find(v => v.accountId);
  assert.equal(binding.accountId, saveIdentity('parent-a'));
  assert.equal((await linkLearner(saves, learners, 'parent-a', { learnerId, profileId: 'foreign-child', nickname: 'Learner' })).status, 404);
});
test('cross-game reads use the verified parent and resolve shared learners', async () => {
  const inputs = [row('cloudkeepers', 'player-1', 'fountain'), row('makeover-maths', 'player-1', 'addition')];
  const bindings = Object.fromEntries(inputs.map(r => [bindingKey(r.accountId, r.profileId), { learnerId }]));
  const saves = { find(query) {
    assert.equal(query.$or[0].parentId, 'parent-a');
    assert.ok(query.$or[1]._id.$in.every(id => id.endsWith(':parent-a')));
    return { async toArray() { return inputs.map(r => ({ _id: r.accountId, parentId: 'parent-a', profiles: {}, mutationId: 'private-mutation', digest: 'private-digest' })); } };
  } };
  const events = { find(query) {
    assert.deepEqual(query.accountId.$in, inputs.map(r => r.accountId));
    return { sort() { return this; }, limit() { return this; }, async toArray() { return inputs; } };
  } };
  const learners = { async findOne(query) { assert.equal(query._id, 'parent-a'); return { bindings, learners: { [learnerId]: { nickname: 'Learner' } } }; } };
  const context = await crossGameContext(saves, events, learners, 'parent-a');
  assert.equal(context.games.length, 2);
  assert.ok(context.evidence.every(e => e.learnerId === learnerId && e.skillId === 'maths.addition'));
  assert.ok(context.games.every(g => !g.mutationId && !g.digest));
});
