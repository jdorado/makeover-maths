import { decodeSave, newPlayer, topics } from './game.ts'
import type { Place, Player, Question, Topic } from './game.ts'

export const GAME_ID = 'makeover-maths'
export type Session = { question: Question | null; feedback: 'correct' | 'wrong' | null; hint: boolean; topic: Topic; mathsOpen: boolean }
export type Snapshot = { players: Player[]; active: number; sessions: Session[]; place: Place; collection: string; selectedFood: string }
export type GameState = {
  schemaVersion: 1; gameId: typeof GAME_ID; contentVersion: 1; selectedProfileId: string;
  profiles: Record<string, { id: string; nickname: string; data: { player: Player; session: Session } }>;
  view: { place: Place; collection: string; selectedFood: string };
}
export const emptySession = (): Session => ({ question: null, feedback: null, hint: false, topic: 'mixed', mathsOpen: false })
export const createSnapshot = (): Snapshot => ({ players: [newPlayer('Player 1', 'year1'), newPlayer('Player 2', 'year3')], active: 0, sessions: [emptySession(), emptySession()], place: 'room', collection: 'all', selectedFood: '' })
export function toGameState(snapshot: Snapshot): GameState {
  return { schemaVersion: 1, gameId: GAME_ID, contentVersion: 1, selectedProfileId: `player-${snapshot.active + 1}`,
    profiles: Object.fromEntries(snapshot.players.map((player, i) => [`player-${i + 1}`, { id: `player-${i + 1}`, nickname: player.name, data: { player, session: snapshot.sessions[i] } }])),
    view: { place: snapshot.place, collection: snapshot.collection, selectedFood: snapshot.selectedFood } }
}
function validQuestion(raw: unknown): Question | null {
  if (raw === null || raw === undefined) return null
  if (!raw || typeof raw !== 'object') throw new Error('Invalid unfinished question.')
  const q = raw as Question
  if (![q.id, q.prompt, q.answer, q.hint, q.explanation].every(s => typeof s === 'string' && s.length <= 1000) || q.id.length > 80 || !topics.some(t => t.id === q.topic)
    || !Array.isArray(q.options) || q.options.length !== 4 || new Set(q.options).size !== 4 || !q.options.every(s => typeof s === 'string' && s.length < 100) || !q.options.includes(q.answer)) throw new Error('Invalid unfinished question.')
  if (q.visual) {
    const v = q.visual, bounded = (n: number, max = 10000) => Number.isSafeInteger(n) && n >= 0 && n <= max
    if (v.kind === 'clock') { if (!bounded(v.hour, 12) || v.hour < 1 || !bounded(v.minute, 59)) throw new Error('Invalid clock.') }
    else if (v.kind === 'chart') { if (!Array.isArray(v.bars) || v.bars.length !== 3 || v.bars.some(b => !bounded(b.value, 12) || !['Rose', 'Lilac', 'Mint'].includes(b.name) || !/^#[a-f0-9]{6}$/i.test(b.colour))) throw new Error('Invalid chart.') }
    else if (v.kind === 'fraction') { if (!bounded(v.denominator, 20) || v.denominator < 1 || !bounded(v.numerator, v.denominator)) throw new Error('Invalid fraction.') }
    else if (v.kind === 'sum') { if (!bounded(v.a) || !bounded(v.b) || !['+', '−'].includes(v.operation)) throw new Error('Invalid calculation.') }
    else if (v.kind === 'shape') { if (!['rectangle', 'triangle', 'square', 'pentagon'].includes(v.shape) || (v.width !== undefined && !bounded(v.width)) || (v.height !== undefined && !bounded(v.height))) throw new Error('Invalid shape.') }
    else throw new Error('Invalid question picture.')
  }
  return structuredClone(q)
}
export function restoreGameState(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid game save.')
  if (JSON.stringify(raw).length > 300000) throw new Error('Game save is too large.')
  const s = raw as GameState
  if (s.schemaVersion !== 1 || s.gameId !== GAME_ID || s.contentVersion !== 1 || !s.profiles || typeof s.profiles !== 'object' || Array.isArray(s.profiles)
    || Object.keys(s.profiles).length !== 2 || !['player-1', 'player-2'].includes(s.selectedProfileId)) throw new Error('Invalid game version or profiles.')
  const profiles = ['player-1', 'player-2'].map(id => s.profiles[id])
  if (profiles.some((p, i) => !p || p.id !== `player-${i + 1}` || typeof p.nickname !== 'string' || p.nickname.length > 24 || !p.data)) throw new Error('Invalid child profile.')
  const players = decodeSave(JSON.stringify({ version: 1, players: profiles.map(p => ({ ...p.data.player, name: p.nickname })), active: s.selectedProfileId === 'player-2' ? 1 : 0 })).players
  const sessions = profiles.map(p => {
    const rawSession = p.data.session
    if (!rawSession || !topics.some(t => t.id === rawSession.topic) || ![null, 'correct', 'wrong'].includes(rawSession.feedback)) throw new Error('Invalid question session.')
    const question = validQuestion(rawSession.question)
    return { question, feedback: question ? rawSession.feedback : null, hint: rawSession.hint === true, topic: rawSession.topic, mathsOpen: rawSession.mathsOpen === true && !!question }
  })
  const place = s.view?.place ?? 'room'
  if (!['room', 'wardrobe', 'hair', 'makeup', 'show', 'party'].includes(place)) throw new Error('Invalid game place.')
  return toGameState({ players, active: s.selectedProfileId === 'player-2' ? 1 : 0, sessions, place, collection: ['all', '0', '1', '2'].includes(s.view?.collection) ? s.view.collection : 'all', selectedFood: ['Cupcakes', 'Strawberries', 'Sparkling juice'].includes(s.view?.selectedFood) ? s.view.selectedFood : '' })
}
export function fromGameState(state: GameState): Snapshot {
  const profiles = ['player-1', 'player-2'].map(id => state.profiles[id])
  return { players: profiles.map(p => p.data.player), sessions: profiles.map(p => p.data.session), active: state.selectedProfileId === 'player-2' ? 1 : 0, ...state.view }
}
export const createGameState = () => toGameState(createSnapshot())
