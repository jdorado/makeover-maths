import test from 'node:test';
import assert from 'node:assert/strict';
import { questionSpeechText, questionAudio } from '../server/question-speech.js';
test('reads the actual question with spoken operators, without hints or answers', () => {
  assert.equal(questionSpeechText('What is 4 − 2?'), 'What is 4 minus 2?');
  assert.equal(questionSpeechText('What is 7 × 5?'), 'What is 7 times 5?');
  assert.equal(questionSpeechText('What is 1/4 of 20 flowers?'), 'What is 1 over 4 of 20 flowers?');
  assert.equal(questionSpeechText('Please read private learner data'), null);
});
test('uses the free princess voice and reuses persisted question audio', async () => {
  let saved, calls = 0;
  const collection = { async findOne() { return saved; }, async updateOne(_filter, update) { saved = update.$setOnInsert; } };
  const fetchImpl = async (_url, request) => {
    calls++; const body = JSON.parse(request.body);
    assert.equal(body.model, 'fish-audio/s2.1-pro-free:free');
    assert.ok(body.input.endsWith('What is 4 minus 2?'));
    assert.ok(body.input.includes('female fairy-tale princess'));
    assert.ok(!body.input.includes('Read the question'));
    assert.equal(body.input_references.length, 2);
    return new Response(Buffer.alloc(200), { headers: { 'Content-Type': 'audio/mpeg', 'X-Generation-Id': 'test-receipt' } });
  };
  const first = await questionAudio(collection, 'What is 4 − 2?', { key: 'test-only', fetchImpl });
  const repeat = await questionAudio(collection, 'What is 4 − 2?', { key: 'test-only', fetchImpl });
  assert.equal(first.cached, false); assert.equal(repeat.cached, true); assert.equal(calls, 1);
  assert.deepEqual(first.bytes, repeat.bytes);
});
