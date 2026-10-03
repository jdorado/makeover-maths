// Run with OPENROUTER_API_KEY supplied privately. Never put the key in Vite env.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { instructions, voiceModel, voiceStyle } from '../src/game/instructions.js';
const key = process.env.OPENROUTER_API_KEY;
if (!key) throw new Error('Supply OPENROUTER_API_KEY privately.');
await mkdir('public/audio', { recursive: true });
let manifest = {};
try { manifest = JSON.parse(await readFile('public/audio/manifest.json', 'utf8')); } catch {}
for (const [id, text] of Object.entries(instructions)) {
  const digest = createHash('sha256').update(voiceModel + voiceStyle + text).digest('hex');
  if (manifest[id]?.digest === digest) continue;
  const input = `${voiceStyle} ${text}`;
  // Anchor every instruction to the same generated female narrator.
  const references = id === 'room' ? undefined : [
    { type: 'input_audio', input_audio: { data: `data:audio/mpeg;base64,${(await readFile('public/audio/room.mp3')).toString('base64')}` } },
    { type: 'text', text: instructions.room },
  ];
  const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: voiceModel, input, response_format: 'mp3', ...(references ? { input_references: references } : {}) }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    let detail = ''; try { detail = (await response.json()).error?.message || ''; } catch {}
    // Log only a known provider error category, never response bodies or credentials.
    const category = /user not found/i.test(detail) ? 'invalid credential' : /credit|balance/i.test(detail) ? 'account credit requirement' : /rate|limit/i.test(detail) ? 'rate limit' : 'provider rejection';
    throw new Error(`Free voice request failed (${response.status}, ${category}); no paid fallback used.`);
  }
  if (!response.headers.get('content-type')?.startsWith('audio/')) throw new Error('Provider did not return audio.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100) throw new Error('Provider returned empty audio.');
  await writeFile(`public/audio/${id}.mp3`, bytes);
  manifest[id] = { digest, model: voiceModel, style: voiceStyle, text, generationId: response.headers.get('x-generation-id'), bytes: bytes.length };
  await writeFile('public/audio/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  await writeFile('src/game/voice-clips.json', JSON.stringify(Object.fromEntries(Object.entries(manifest).map(([clip, entry]) => [clip, entry.digest]))) + '\n');
  console.log(`Saved ${id}: ${bytes.length} bytes (free model).`);
}
