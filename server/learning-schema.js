import { createHash } from 'node:crypto';
export const LEARNING_SCHEMA = 'learning-v1';
const storyTopics = ['place-value', 'addition', 'subtraction', 'multiplication', 'division', 'fractions-of-amounts', 'fractions', 'money', 'measurement', 'time', 'geometry-perimeter', 'data-charts'];
const topics = { place: 'place-value', addition: 'addition', subtraction: 'subtraction', multiplication: 'multiplication', division: 'division', fractions: 'fractions', money: 'money', measure: 'measurement-geometry', time: 'time', charts: 'data-charts' };
const cloudTopics = { bridge: 'place-value', nest: 'number-comparison', fountain: 'addition', windmill: 'subtraction', ship: 'multiplication', house: 'multiplication', balloon: 'multiplication', 'light-1': 'multiplication-division', 'light-2': 'fractions', 'light-3': 'money-measurement', 'light-4': 'time-geometry', 'light-5': 'data-charts' };
export function canonicalEvidence(row, bindings = {}) {
  const gameId = row.accountId.slice(0, row.accountId.indexOf(':'));
  const event = row.event;
  const skill = gameId === 'cloudkeepers-storybook' ? storyTopics[Number(event.topic)] : gameId === 'cloudkeepers' ? cloudTopics[event.topic] : topics[event.topic];
  const binding = bindings[bindingKey(row.accountId, row.profileId)];
  return { ...row, schema: LEARNING_SCHEMA, gameId, learnerId: binding?.learnerId || null,
    skillId: skill ? `maths.${skill}` : 'unmapped',
    schoolYear: Number(String(event.year).replace(/^year/, '')) || null,
    challenge: { gameId, contentVersion: event.contentVersion, localLevel: event.difficulty },
    outcome: event.type === 'answer' ? { correct: event.correct, independent: event.independent, helpUsed: event.helpUsed, attempt: event.attempt } : null };
}
export const bindingKey = (accountId, profileId) => createHash('sha256').update(JSON.stringify([accountId, profileId])).digest('hex');
