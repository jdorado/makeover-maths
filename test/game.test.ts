import assert from 'node:assert/strict'
import test from 'node:test'
import { startQualification, qualificationRules, showPrize, freshOutfit, usedItem, gear, competitionFor, outfitFitsCompetition, themeFor, questionReward, answerQuestion, availableTopics, buyItem, createMastery, decodeSave, difficulty, dresses, enterParty, enterShow, judgeShow, makeQuestion, newPlayer, progressionAtLevel, topics, unlockStudio } from '../src/game/game.ts'

function qualify(player: ReturnType<typeof newPlayer>, now = 1000) {
  let p = startQualification(player, now)
  for (let i = 0; i < qualificationRules(p).required; i++) {
    const q = makeQuestion({ ...p, challenge: null }, 'mixed'); q.qualifierId = p.qualifier!.id
    p = answerQuestion(p, q, q.answer, now + (i + 1) * 1000).player
  }
  return p
}

test('a question pays once, mistakes preserve money, and studios and purchases charge once', () => {
  let p = newPlayer('Test', 'year1')
  const q = makeQuestion(p, 'addition')
  const wrong = answerQuestion(p, q, q.options.find(o => o !== q.answer)!).player
  assert.equal(wrong.coins, 0)
  assert.equal(wrong.correct, 0)
  p = answerQuestion(wrong, q, q.answer).player
  assert.equal(p.coins, 125)
  assert.equal(p.designStars, 0)
  assert.equal(answerQuestion(p, q, q.answer).player, p)
  p = { ...p, coins: 250 }
  p = unlockStudio(p, 'wardrobe')
  assert.equal(p.coins, 0)
  assert.equal(unlockStudio(p, 'wardrobe'), p)
  assert.equal(buyItem(p, 'dress', '2-0'), p)
  p = { ...p, coins: 20000, designStars: 100, level: 28 }
  p = buyItem(p, 'dress', '2-0')
  assert.equal(p.coins, 20000 - dresses.find(d => d.id === '2-0')!.price)
  const coins = p.coins
  p = buyItem(p, 'dress', '0-0')
  p = buyItem(p, 'dress', '2-0')
  assert.equal(p.coins, coins)
})

test('opening practice buys a free gown but one answer cannot enter a show', () => {
  let p = newPlayer('Test', 'year1'), q = makeQuestion(newPlayer('Test', 'year1'), 'addition')
  p = answerQuestion(p, q, q.answer).player
  p = unlockStudio(p, 'wardrobe'); p = buyItem(p, 'dress', '0-1')
  assert.equal(p.coins, 0); assert.equal(p.dress, '0-1'); assert.equal(enterShow(p).result, null)
  const entered = enterShow(qualify(p))
  assert.equal(entered.result?.won, true)
  assert.equal(enterShow(entered.player).result, null)
  assert.equal(freshOutfit(entered.player), false)
})

test('levels gate new styles and studios while milestones remain visible', () => {
  let p = { ...newPlayer('Test', 'year1'), coins: 50000, designStars: 100 }
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
  const rose = { ...newPlayer('Test', 'year1'), competition: 'garden' as const, dress: '0-3', streak: 1 }
  assert.equal(judgeShow(rose).matchedTheme, true)
  const gold = { ...newPlayer('Test', 'year1'), competition: 'stage' as const, dress: '0-4', streak: 1 }
  assert.equal(judgeShow(gold).matchedTheme, true)
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
  assert.equal(p.correct, 150); assert.equal(p.coins, earned); assert.ok(earned > 37500)
  assert.deepEqual(other, untouched)
  assert.ok(difficulty(newPlayer('Older', 'year3')) > difficulty(newPlayer('Younger', 'year1')))
})

test('shows require a new qualifier and fresh pieces and three consecutive wins earn one consumable invitation', () => {
  let p = { ...newPlayer('Test', 'year3'), dress: '2-0', hair: 'bun', hairColour: 'honey', makeup: 'sparkle', streak: 5 }
  assert.equal(enterShow(p).result, null)
  for (let i = 1; i <= 3; i++) {
    p = qualify({ ...p, correct: i, usedItems: [], lastLooks: {} })
    const before = p.coins, prize = showPrize(p, judgeShow(p))
    const show = enterShow(p)
    assert.equal(show.result?.won, true)
    p = show.player
    assert.equal(p.coins, before + prize)
    assert.equal(enterShow(p).player, p)
  }
  assert.equal(p.partyTickets, 1); assert.equal(p.wins, 3)
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
  assert.equal(q.difficulty, 4); assert.equal(questionReward(q), 650)
  const earned = answerQuestion(p, q, q.answer).player
  assert.equal(earned.coins, 650)
  const resumed = decodeSave(JSON.stringify({ version: 1, players: [earned, newPlayer('Other', 'year3')] })).players[0]
  assert.equal(resumed.challenge, 4); assert.equal(answerQuestion(resumed, q, q.answer).player.coins, 650)
})

test('sports gear improves sports readiness; purchases and free re-equipping survive saves', () => {
  let p = { ...newPlayer('Test', 'year1'), level: 12, coins: 50000, designStars: 100, correct: 1, streak: 5, competition: 'sport' as const, unlocked: ['wardrobe', 'hair', 'makeup'] as const }
  let player = { ...p, unlocked: [...p.unlocked] }
  assert.equal(judgeShow(player).won, false)
  player = buyItem(player, 'dress', 'sport-mint')
  for (const g of gear.filter(g => g.occasion === 'sport' && g.quality === 5)) player = buyItem(player, 'gear', g.id)
  assert.equal(judgeShow(player).won, true)
  const before = player.coins
  const item = gear.find(g => g.name === 'Team trainers')!
  player = buyItem(player, 'gear', item.id); assert.equal(player.coins, before)
  player = qualify(player); const balance = player.coins; const result = enterShow(player); assert.equal(result.player.coins, balance + showPrize(player, judgeShow(player)))
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


test('sports requires a uniform and each generated venue has its own theme', () => {
  let player = { ...newPlayer('Designer', 'year3'), level: 12, correct: 1, streak: 5, coins: 100000, designStars: 100, competition: 'sport' as const, unlocked: ['wardrobe'] as ('wardrobe')[] }
  for (const g of gear.filter(g => g.occasion === 'sport' && ['shoes', 'bag'].includes(g.slot))) player = buyItem(player, 'gear', g.id)
  assert.equal(outfitFitsCompetition(player), false)
  assert.equal(judgeShow(player).won, false)
  assert.equal(enterShow(player).result, null)
  const balance = player.coins
  player = buyItem(player, 'dress', 'sport-mint')
  assert.equal(player.coins, balance)
  assert.equal(outfitFitsCompetition(player), true)
  assert.equal(themeFor(player).name, 'Team spirit')
  assert.equal(outfitFitsCompetition({ ...player, competition: 'runway' }), false)
  assert.equal(themeFor({ ...player, competition: 'garden' }).name, 'Garden in bloom')
  assert.equal(themeFor({ ...player, competition: 'stage' }).name, 'Lavender talent night')
})

test('new jewellery saves by slot and glasses and masks replace each other', () => {
  let player = { ...newPlayer('Designer', 'year3'), level: 12, coins: 100000, designStars: 100, unlocked: ['wardrobe'] as ('wardrobe')[] }
  for (const slot of ['necklace', 'ring', 'bracelet', 'earrings', 'glasses']) {
    const item = gear.find(g => g.slot === slot && g.occasion === 'runway')!
    player = buyItem(player, 'gear', item.id)
    assert.equal(player.equipment[item.slot], item.id)
  }
  const glasses = player.equipment.glasses!
  const mask = gear.find(g => g.slot === 'mask' && g.occasion === 'runway')!
  player = buyItem(player, 'gear', mask.id)
  assert.equal(player.equipment.glasses, undefined)
  const restored = decodeSave(JSON.stringify({ version: 1, players: [player, newPlayer('Other', 'year3')] })).players[0]
  assert.deepEqual(restored.equipment, player.equipment)
  const balance = restored.coins
  const reEquipped = buyItem(restored, 'gear', glasses)
  assert.equal(reEquipped.equipment.mask, undefined)
  assert.equal(reEquipped.coins, balance)
  assert.throws(() => decodeSave(JSON.stringify({ version: 1, players: [{ ...restored, equipment: { ...restored.equipment, glasses } }, newPlayer('Other', 'year3')] })))
})

test('qualifier fails on mistakes, help or elapsed time and cannot count practice or duplicate answers', () => {
  for (const failure of ['wrong', 'hint', 'timeout']) {
    const p = startQualification(newPlayer('Test', 'year3'), 1000), q = makeQuestion(p, 'addition'); q.qualifierId = p.qualifier!.id
    if (failure === 'hint') q.helpUsed = true
    const next = answerQuestion(p, q, failure === 'wrong' ? q.options.find(a => a !== q.answer)! : q.answer, failure === 'timeout' ? p.qualifier!.deadline + 1 : 2000).player
    assert.equal(next.qualifier, null); assert.equal(enterShow(next).result, null)
  }
  const p = startQualification(newPlayer('Test', 'year1'), 1000), practice = makeQuestion(p, 'addition')
  assert.equal(answerQuestion(p, practice, practice.answer, 2000).player.qualifier!.count, 0)
  const q = makeQuestion(p, 'addition'); q.qualifierId = p.qualifier!.id
  const next = answerQuestion(p, q, q.answer, 2000).player
  assert.equal(answerQuestion(next, q, q.answer, 3000).player.qualifier!.count, 1)
})

test('wealth cannot bypass earned stars and used pieces need paid fresh editions', () => {
  let p = { ...newPlayer('Test', 'year1'), level: 12, coins: 100000, unlocked: ['wardrobe'] as ('wardrobe')[] }
  assert.equal(buyItem(p, 'dress', '0-2'), p)
  p = { ...p, designStars: 10 }; p = buyItem(p, 'dress', '0-2')
  const entered = enterShow(qualify(p)).player
  assert.equal(usedItem(entered, 'dress:0-2'), true)
  assert.equal(enterShow(qualify(entered)).result, null)
  assert.equal(buyItem(entered, 'dress', '0-2'), entered)
  const rotatedEntry = { ...entered, lastLooks: { runway: ['dress:0-1'] } }; const fresh = buyItem(rotatedEntry, 'dress', '0-2')
  assert.equal(fresh.coins, entered.coins - 2000); assert.equal(fresh.designStars, entered.designStars - 1)
  assert.equal(freshOutfit(fresh), true) // Earlier styles can be renewed after rotating.
  const repeated = { ...fresh, dress: '0-1', equipment: {} }; assert.equal(freshOutfit(repeated), false)
  const restored = decodeSave(JSON.stringify({version: 1, players: [qualify(entered), newPlayer('Other', 'year3')]})).players[0]
  assert.deepEqual(restored.usedItems, entered.usedItems); assert.ok(restored.qualifier?.finishedAt)
  assert.equal(restored.designStars, qualify(entered).designStars)
})

test('prizes reward winning score and qualifier speed, with no participation payment', () => {
  const fast = qualify(newPlayer('Test', 'year3')), result = judgeShow(fast)
  const slow = { ...fast, qualifier: { ...fast.qualifier!, finishedAt: fast.qualifier!.deadline - 1 } }
  assert.ok(showPrize(fast, result) > showPrize(slow, result))
  assert.equal(showPrize(fast, { ...result, won: false }), 0)
  const otherEvent = { ...fast, competition: 'sport' as const, level: 3, dress: 'sport-mint' }
  assert.equal(enterShow(otherEvent).result, null)
})
