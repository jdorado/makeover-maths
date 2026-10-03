// Private practice evidence travels inside the existing parent-owned save.
// No tracking service, owner identifiers, or automatic learning decisions.
export const EVIDENCE_VERSION = 1;
export const MAX_EVENTS = 300;
export const MAX_LOG_BYTES = 90_000;
const sessionId = globalThis.crypto?.randomUUID?.() || `session-${Date.now()}`;
export function restoreEvidence(raw) {
  const log = { version: EVIDENCE_VERSION, dropped: 0, events: [] };
  if (!raw || raw.version !== EVIDENCE_VERSION || !Array.isArray(raw.events)) return log;
  log.dropped = Number.isSafeInteger(raw.dropped) && raw.dropped >= 0 ? raw.dropped : 0;
  for (const event of raw.events.slice(-MAX_EVENTS)) {
    if (!event || !['question', 'answer', 'hint', 'explanation', 'read', 'skip'].includes(event.type)
      || typeof event.id !== 'string' || event.id.length > 100
      || typeof event.questionId !== 'string' || event.questionId.length > 100
      || typeof event.at !== 'string' || !Number.isFinite(Date.parse(event.at))
      || typeof event.sessionId !== 'string' || event.sessionId.length > 100
      || !Number.isFinite(event.activeMs) || event.activeMs < 0 || event.activeMs > 86_400_000
      || typeof event.topic !== 'string' || event.topic.length > 100
      || typeof event.contentVersion !== 'string' || event.contentVersion.length > 100
      || typeof event.year !== 'string' || event.year.length > 30
      || !Number.isFinite(event.difficulty)
      || !event.question || typeof event.question.prompt !== 'string'
      || typeof event.question.answer !== 'string'
      || JSON.stringify(event).length > 12_000) continue;
    if (event.type === 'answer' && (typeof event.submittedAnswer !== 'string'
      || event.submittedAnswer.length > 1000 || !Number.isSafeInteger(event.attempt) || event.attempt < 1
      || typeof event.correct !== 'boolean' || typeof event.independent !== 'boolean'
      || typeof event.helpUsed !== 'boolean')) continue;
    // JSON round trip prevents prototypes/functions from entering a restored log.
    log.events.push(JSON.parse(JSON.stringify(event)));
  }
  log.dropped += Math.max(0, raw.events.length - MAX_EVENTS);
  trim(log);
  return log;
}
function trim(log) {
  while (log.events.length > MAX_EVENTS || JSON.stringify(log).length > MAX_LOG_BYTES) {
    log.events.shift(); log.dropped++;
  }
}
export function recordEvidence(log, context, type, details = {}) {
  const event = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    at: new Date().toISOString(), sessionId, type, activeMs: 0, ...context, ...details };
  // Validate new records using the same boundary as loaded data.
  const valid = restoreEvidence({ version: 1, events: [event] });
  if (valid.events.length) { log.events.push(valid.events[0]); trim(log); }
}
export function evidenceContext(question, year, difficulty, topic, activeMs = 0, contentVersion = 'maths-v1') {
  return { questionId: question.id, year: String(year), difficulty, topic: String(topic),
    contentVersion, activeMs: Math.round(activeMs), question: JSON.parse(JSON.stringify(question)) };
}
// Cumulative time, never a speed target. Only a visible, focused question counts.
export function startEvidenceClock(current, save) {
  let previous = performance.now(), lastActivity = previous, lastSave = previous;
  const activity = () => { lastActivity = performance.now(); };
  const flush = () => { tick(); save(); previous = performance.now(); };
  const tick = () => {
    const now = performance.now(), pending = current();
    if (pending && !document.hidden && document.hasFocus() && now - lastActivity < 90_000)
      pending.activeMs = Math.min(86_400_000, (pending.activeMs || 0) + Math.min(now - previous, 1000));
    previous = now;
    if (pending && now - lastSave > 15_000) { save(); lastSave = now; }
  };
  for (const name of ['pointerdown', 'keydown', 'input']) document.addEventListener(name, activity);
  document.addEventListener('visibilitychange', flush);
  window.addEventListener('pagehide', flush);
  const timer = setInterval(tick, 250);
  return () => {
    clearInterval(timer);
    for (const name of ['pointerdown', 'keydown', 'input']) document.removeEventListener(name, activity);
    document.removeEventListener('visibilitychange', flush); window.removeEventListener('pagehide', flush);
  };
}
