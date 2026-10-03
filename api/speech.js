import { audioCollection } from '../server/database.js';
import { questionAudio, questionSpeechText } from '../server/question-speech.js';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); return response.status(405).json({ error: 'Method not allowed.' }); }
  if (Number(request.headers['content-length']) > 1024) return response.status(413).json({ error: 'Question is too long.' });
  const allowed = (process.env.APP_ORIGINS || '').split(',').map(value => value.trim());
  if (request.headers.origin && !allowed.includes(request.headers.origin)) return response.status(403).json({ error: 'Origin not allowed.' });
  let prompt;
  try { const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body; prompt = body?.prompt; } catch {}
  if (!questionSpeechText(prompt)) return response.status(400).json({ error: 'Choose a game question to read.' });
  if (!process.env.OPENROUTER_API_KEY) return response.status(503).json({ error: 'Question voice is not configured.' });
  try {
    const audio = await questionAudio(await audioCollection(), prompt, { key: process.env.OPENROUTER_API_KEY });
    response.setHeader('Content-Type', 'audio/mpeg');
    response.setHeader('X-Audio-Cache', audio.cached ? 'hit' : 'miss');
    if (audio.generationId) response.setHeader('X-Generation-Id', audio.generationId);
    return response.status(200).send(audio.bytes);
  } catch { return response.status(503).json({ error: 'The free voice is busy. Please try again.' }); }
}
