import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { instructions, voiceModel, voiceStyle } from '../src/game/instructions.js';

// Only public question templates from game.ts may reach the speech provider.
const templates = [
  /^What is \d{1,4} [＋+−×] \d{1,4}\?$/,
  /^Which number is greater: \d{1,3} or \d{1,3}\?$/,
  /^In \d{2,3}, what is the value of the (hundreds|tens|ones) digit\?$/,
  /^\d{1,3} ribbons are shared equally between \d{1,2} gift bags\. How many in each\?$/,
  /^Which fraction is equal to \d{1,2}\/\d{1,2}\?$/,
  /^\d{1,2}\/\d{1,2} [−+] \d{1,2}\/\d{1,2} = \?$/,
  /^What is 1\/\d{1,2} of \d{1,3} flowers\?$/,
  /^A ribbon costs \d{1,2}p\. You pay £1\. How much change\?$/,
  /^A hair accessory costs £\d{1,2}\. You pay £\d{1,2}\. How much change\?$/,
  /^A rectangular stage is \d{1,2}m long and \d{1,2}m wide\. What is its perimeter\?$/,
  /^How many centimetres are in \d metres of fabric\?$/,
  /^How many sides does a (triangle|square|pentagon) have\?$/,
  /^What time is shown on the clock\?$/,
  /^How many dresses are there altogether in this chart\?$/,
  /^How many (rose|lilac|mint) dresses are in the chart\?$/,
];
export function questionSpeechText(prompt) {
  if (typeof prompt !== 'string' || prompt.length > 250 || !templates.some(pattern => pattern.test(prompt))) return null;
  return prompt.replace(/(\d+)\/(\d+)/g, '$1 over $2')
    .replace(/[＋+]/g, ' plus ').replace(/−/g, ' minus ').replace(/×/g, ' times ')
    .replace(/= \?/g, 'equals what?').replace(/£(\d+)/g, '$1 pounds')
    .replace(/(\d+)p\b/g, '$1 pence').replace(/(\d+)m\b/g, '$1 metres')
    .replace(/\s+/g, ' ').trim();
}
const pending = new Map();
export async function questionAudio(collection, prompt, { key, fetchImpl = fetch, referenceFile = 'public/audio/room.mp3' } = {}) {
  const text = questionSpeechText(prompt);
  if (!text) throw new Error('Invalid question');
  const id = 'makeover-maths:' + createHash('sha256').update(voiceModel + voiceStyle + text).digest('hex');
  let cached;
  try { cached = await collection.findOne({ _id: id }); } catch { /* Speech can work while caching reconnects. */ }
  if (cached?.audio) return { bytes: Buffer.from(cached.audio, 'base64'), cached: true, generationId: cached.generationId };
  if (pending.has(id)) return pending.get(id);
  const operation = (async () => {
    const reference = (await readFile(referenceFile)).toString('base64');
    const response = await fetchImpl('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: voiceModel, input: `${voiceStyle} ${text}`, response_format: 'mp3', input_references: [
        { type: 'input_audio', input_audio: { data: `data:audio/mpeg;base64,${reference}` } },
        { type: 'text', text: instructions.room },
      ] }), signal: AbortSignal.timeout(40000),
    });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/')) throw new Error('Speech provider unavailable');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 100 || bytes.length > 2_000_000) throw new Error('Invalid audio');
    const generationId = response.headers.get('x-generation-id');
    try { await collection.updateOne({ _id: id }, { $setOnInsert: { audio: bytes.toString('base64'), model: voiceModel, text, generationId, createdAt: new Date() } }, { upsert: true }); } catch { /* Playback does not depend on cache write acknowledgement. */ }
    return { bytes, cached: false, generationId };
  })();
  pending.set(id, operation);
  try { return await operation; } finally { pending.delete(id); }
}
