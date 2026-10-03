import assert from 'node:assert/strict'
import test from 'node:test'
import { gear, competitionFor, questionReward, answerQuestion, availableTopics, buyItem, createMastery, decodeSave, difficulty, dresses, enterParty, enterShow, judgeShow, makeQuestion, newPlayer, progressionAtLevel, topics, unlockStudio } from '../src/game/game.ts'

test('a question pays once, mistakes preserve money, and studios and purchases charge once', () => {
  let p = newPlayer('Test', 'year1')
  const q = makeQuestion(p, 'addition')
  const wrong = answerQuestion(p, q, q.options.find(o => o !== q.answer)!).player
  assert.equal(wrong.coins, 0)
  assert.equal(wrong.correct, 0)
  p = answerQuestion(wrong, q, q.answer).player
  assert.equal(p.coins, 1000)
  assert.equal(answerQuestion(p, q, q.answer).player, p)
  p = unlockStudio(p, 'wardrobe')
  assert.equal(p.coins, 0)
  assert.equal(unlockStudio(p, 'wardrobe'), p)
  assert.equal(buyItem(p, 'dress', '2-0'), p)
  p = { ...p, coins: 20000, level: 28 }
  p = buyItem(p, 'dress', '2-0')
  assert.equal(p.coins, 20000 - dresses.find(d => d.id === '2-0')!.price)
  const coins = p.coins
  p = buyItem(p, 'dress', '0-0')
  p = buyItem(p, 'dress', '2-0')
  assert.equal(p.coins, coins)
})

test('the opening answer unlocks a free new gown and a winnable debut show', () => {
  let p = newPlayer('Test', 'year1')
  const q = makeQuestion(p, 'addition')
  p = answerQuestion(p, q, q.answer).player
  assert.equal(p.coins, 1000)
  p = unlockStudio(p, 'wardrobe')
  assert.equal(p.coins, 0)
  p = buyItem(p, 'dress', '0-1')
  assert.equal(p.dress, '0-1')
  assert.equal(p.coins, 0)
  const show = enterShow(p)
  assert.equal(show.result?.matchedTheme, true)
  assert.equal(show.result?.target, 18)
  assert.equal(show.result?.won, true)
  p = show.player
  for (let i = 0; i < 2; i++) {
    const next = makeQuestion(p, 'addition')
    p = answerQuestion(p, next, next.answer).player
    const runway = enterShow(p)
    assert.equal(runway.result?.matchedTheme, true)
    assert.equal(runway.result?.won, true)
    p = runway.player
  }
  assert.equal(p.level, 2)
  assert.equal(p.partyTickets, 1)
})

test('levels gate new styles and studios while milestones remain visible', () => {
  let p = { ...newPlayer('Test', 'year1'), coins: 50000 }
  assert.equal(unlockStudio(p, 'hair'), p)
  p = { ...p, level: 3 }
  p = unlockStudio(p, 'hair')
  assert.ok(p.unlocked.includes('hair'))
  assert.equal(buyItem(p, 'hair', 'pony'), p)
  assert.ok(progressionAtLevel(3, 'year1').includes('Hair studio'))
  assert.ok(progressionAtLevel(48, 'year1').includes('Pearl Botanical couture'))
})

test('theme descriptions use every advertised palette', () => {
  const silver = { ...newPlayer('Test', 'year1'), dress: '0-1', streak: 1 }
  assert.equal(judgeShow(silver).matchedTheme, true)
  const ruby = { ...newPlayer('Test', 'year1'), level: 2, correct: 4, dress: '1-1', streak: 1 }
  assert.equal(judgeShow(ruby).matchedTheme, true)
})

test('surprise mix introduces Year 1 topics gradually and mastery stays per topic', () => {
  let p = newPlayer('Test', 'year1')
  assert.ok(!availableTopics(p).includes('multiplication'))
  assert.ok(availableTopics(newPlayer('Test', 'year3')).includes('fractions'))
  assert.ok(availableTopics({ ...p, level: 10 }).includes('multiplication'))
  const addition = makeQuestion(p, 'addition')
  p = answerQuestion(p, addition, addition.answer).player
  assert.equal(p.mastery.addition, .15)
  assert.equal(p.mastery.fractions, 0)
  const fraction = makeQuestion(p, 'fractions')
  p = answerQuestion(p, fraction, fraction.options.find(option => option !== fraction.answer)!).player
  assert.equal(p.mastery.addition, .15)
  assert.equal(p.mastery.fractions, -.25)
})

test('150 correct answers finish all 50 levels and one player cannot change another', () => {
  let p = newPlayer('First', 'year1')
  const other = newPlayer('Second', 'year3'), untouched = structuredClone(other)
  let earned = 0
  for (let i = 0; i < 150; i++) { const q = makeQuestion(p, 'addition'); earned += questionReward(q); p = answerQuestion(p, q, q.answer).player }
  assert.equal(p.level, 50); assert.equal(p.levelCorrect, 3); assert.equal(p.completed, true)
  assert.equal(p.correct, 150); assert.equal(p.coins, earned); assert.ok(earned > 150000)
  assert.deepEqual(other, untouched)
  assert.ok(difficulty(newPlayer('Older', 'year3')) > difficulty(newPlayer('Younger', 'year1')))
})

test('shows require a fresh answer and three consecutive wins earn one consumable invitation', () => {
  let p = { ...newPlayer('Test', 'year3'), dress: '2-0', hair: 'bun', hairColour: 'honey', makeup: 'sparkle', streak: 5 }
  assert.equal(enterShow(p).result, null)
  for (let i = 1; i <= 3; i++) {
    p = { ...p, correct: i }
    const show = enterShow(p)
    assert.equal(show.result?.won, true)
    p = show.player
    assert.equal(enterShow(p).player, p)
  }
  assert.equal(p.partyTickets, 1); assert.equal(p.wins, 3); assert.equal(p.coins, 6000)
  p = enterParty(p); assert.equal(p.partyTickets, 0); assert.equal(p.parties, 1)
  assert.equal(enterParty(p), p)
})

test('save files round-trip both players and reject invalid progress and unknown styles', () => {
  const players = [newPlayer('First', 'year1'), newPlayer('Second', 'year3')]
  players[0] = enterShow({ ...players[0], correct: 1, streak: 1 }).player
  const encode = () => JSON.stringify({ version: 1, players, active: 1 })
  assert.deepEqual(decodeSave(encode()), { players, active: 1 })
  players[0].coins = -1; assert.throws(() => decodeSave(encode())); players[0].coins = 0
  players[0].dress = 'missing'; assert.throws(() => decodeSave(encode()))
  assert.throws(() => decodeSave('{"version":3}'))
})

test('legacy global difficulty migrates safely to per-topic mastery', () => {
  const legacy: any = newPlayer('Legacy', 'year1')
  delete legacy.mastery
  legacy.adaptive = .5
  const restored = decodeSave(JSON.stringify({ version: 1, players: [legacy, legacy], active: 0 })).players[0]
  assert.ok(Object.values(restored.mastery).every(value => value === .5))
})

test('every topic and difficulty produces four distinct choices with exactly one correct answer', () => {
  let seed = 123456
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  for (const track of ['year1', 'year3'] as const) for (const level of [1, 15, 30, 50]) for (const topic of topics) for (let i = 0; i < 80; i++) {
    const q = makeQuestion({ ...newPlayer('Test', track), level, mastery: createMastery(i % 5 - 2) }, topic.id, random)
    assert.equal(q.options.length, 4, `${topic.id}: ${q.prompt}: ${q.options}`)
    assert.equal(new Set(q.options).size, 4)
    assert.equal(q.options.filter(o => o === q.answer).length, 1)
    assert.ok(q.hint && q.explanation)
    const arithmetic = q.prompt.match(/^What is (\d+) ([+−×]) (\d+)\?$/)
    if (arithmetic) { const a = Number(arithmetic[1]), b = Number(arithmetic[3]); assert.equal(Number(q.answer), arithmetic[2] === '+' ? a + b : arithmetic[2] === '−' ? a - b : a * b) }
    if (q.visual?.kind === 'clock') assert.equal(q.answer, `${q.visual.hour}:${String(q.visual.minute).padStart(2, '0')}`)
  }
})


test('selected difficulty changes the problem range and pays once after resume', () => {
  const p = { ...newPlayer('Test', 'year1'), challenge: 4 }
  const q = makeQuestion(p, 'addition', () => .9)
  assert.equal(q.difficulty, 4); assert.equal(questionReward(q), 3000)
  const earned = answerQuestion(p, q, q.answer).player
  assert.equal(earned.coins, 3000)
  const resumed = decodeSave(JSON.stringify({ version: 1, players: [earned, newPlayer('Other', 'year3')] })).players[0]
  assert.equal(resumed.challenge, 4); assert.equal(answerQuestion(resumed, q, q.answer).player.coins, 3000)
})

test('sports gear improves sports readiness; purchases and free re-equipping survive saves', () => {
  let p = { ...newPlayer('Test', 'year1'), level: 12, coins: 50000, correct: 1, streak: 5, competition: 'sport' as const, unlocked: ['wardrobe', 'hair', 'makeup'] as const }
  let player = { ...p, unlocked: [...p.unlocked] }
  assert.equal(judgeShow(player).won, false)
  for (const g of gear.filter(g => g.occasion === 'sport' && g.quality === 5)) player = buyItem(player, 'gear', g.id)
  assert.equal(judgeShow(player).won, true)
  const before = player.coins
  const item = gear.find(g => g.name === 'Team trainers')!
  player = buyItem(player, 'gear', item.id); assert.equal(player.coins, before)
  const result = enterShow(player); assert.equal(result.player.coins, before + competitionFor(player).prize)
  assert.equal(enterShow(result.player).result, null)
  const restored = decodeSave(JSON.stringify({ version: 1, players: [result.player, newPlayer('Other', 'year3')] })).players[0]
  assert.deepEqual(restored.equipment, player.equipment); assert.equal(restored.competition, 'sport')
  const corrupt = { ...restored, equipment: { shoes: 'gear-9' } }
  assert.throws(() => decodeSave(JSON.stringify({ version: 1, players: [corrupt, restored] })))
})

test('legacy players get safe progression defaults and locked competitions cannot pay', () => {
  const legacy: any = newPlayer('Old', 'year1'); delete legacy.equipment; delete legacy.challenge; delete legacy.competition
  const restored = decodeSave(JSON.stringify({ version: 1, players: [legacy, legacy] })).players[0]
  assert.deepEqual(restored.equipment, {}); assert.equal(restored.challenge, null); assert.equal(restored.competition, 'runway')
  assert.equal(enterShow({ ...restored, competition: 'stage', correct: 1 }).result, null)
})
