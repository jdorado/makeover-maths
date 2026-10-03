import { instructions } from './instructions.js';
import voiceClips from './voice-clips.json';
import { startEvidenceClock } from './evidence.js';
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { GearArt } from './GearArt'
import { Character, Room } from './Room'
import { gear, competitions, competitionFor, judgeShow, challengeReward, questionReward, logQuestion, answerQuestion, assetRoot, buyItem, createMastery, difficulty, dresses, enterParty, enterShow, hairColours, hairstyles, makeQuestion, makeups, newPlayer, nextProgression, progressionAtLevel, studioCosts, studioUnlockLevels, themeFor, topics, unlockStudio } from './game'
import type { GearSlot, Occasion, Dress, Place, Player, Question, Studio, Topic } from './game'
import { emptySession, fromGameState, toGameState } from './save'
import type { GameState, Session } from './save'
import { useAccount } from '../platform/useAccount'
import './makeover.css'

type IconName = 'star' | 'dress' | 'hair' | 'makeup' | 'home' | 'close' | 'sound' | 'mute' | 'save' | 'options' | 'help' | 'maths' | 'arrow' | 'lock' | 'check' | 'map'
function Icon({ name, size = 21 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    star: <><path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z" /><path d="m21 2 .5 1.5L23 4l-1.5.5L21 6l-.5-1.5L19 4l1.5-.5Z" /></>,
    dress: <><path d="M8 3h3v4h2V3h3l-1 6 5 12H4L9 9Z" /><path d="M9 10h6M8 16l1 5m7-5-1 5" /></>,
    hair: <><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="m8 15 10-12M16 15 6 3" /></>,
    makeup: <><path d="M5 14h7v7H5Zm1-1V6l5-3v10M16 12h5v9h-5Z" /><path d="M16 9c0-4 5-4 5 0v3h-5Z" /></>,
    home: <><path d="m3 10 9-7 9 7M5 9v12h14V9M10 21v-7h4v7" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    sound: <><path d="M4 9h4l5-4v14l-5-4H4Z" /><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
    mute: <><path d="M4 9h4l5-4v14l-5-4H4Z" /><path d="m17 9 5 6m0-6-5 6" /></>,
    save: <><path d="M5 3h12l4 4v14H3V3Zm2 0v7h10V3M7 21v-7h10v7" /></>,
    options: <><path d="m9 3-.6 3-2.6 1.5-2.9-1  -2 3.5 2.3 2v3l-2.3 2 2 3.5 2.9-1L8.4 21l.6 3h4l.6-3 2.6-1.5 2.9 1 2-3.5-2.3-2v-3l2.3-2-2-3.5-2.9 1L13.6 6 13 3Z" transform="translate(0 -1.5) scale(1 .9)"/><circle cx="11" cy="11" r="3"/></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9 8a3 3 0 1 1 4 3c-1 .5-1 1-1 2m0 3h.01" /></>,
    maths: <><rect x="4" y="2" width="16" height="20" rx="3" /><path d="M8 6h8M8 11h2m4 0h2M8 15h2m4 0h2M8 19h2m4 0h2" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    lock: <><rect x="5" y="10" width="14" height="12" rx="3" /><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    map: <><path d="m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3Zm6-3v17m6-14v17" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
const money = (n: number) => `$${n.toLocaleString('en-GB')}`
const places: { id: Place; title: string; icon: IconName }[] = [
  { id: 'room', title: 'Explore', icon: 'home' }, { id: 'wardrobe', title: 'Wardrobe', icon: 'dress' },
  { id: 'hair', title: 'Hair studio', icon: 'hair' }, { id: 'makeup', title: 'Makeup', icon: 'makeup' },
  { id: 'show', title: 'Competitions', icon: 'star' }, { id: 'party', title: 'Party', icon: 'star' },
]
type Modal = 'maths' | 'help' | 'players' | 'map' | 'complete' | 'options' | null
const resumeMessage = (player: Player) => player.completed ? `Welcome back, ${player.name}! Your superstar final bow is ready.` : player.correct ? `Welcome back, ${player.name}! Continue level ${player.level} — ${3 - player.levelCorrect} answer${3 - player.levelCorrect === 1 ? '' : 's'} to the next level.` : 'Welcome, designer! Explore your room, then solve a challenge to earn play money.'

function QuestionVisual({ visual }: { visual: Question['visual'] }) {
  if (!visual) return null
  if (visual.kind === 'clock') {
    const hand = (angle: number, length: number) => ({ x: 90 + Math.sin(angle * Math.PI / 180) * length, y: 90 - Math.cos(angle * Math.PI / 180) * length })
    const hour = hand(visual.hour * 30 + visual.minute / 2, 37), minute = hand(visual.minute * 6, 57)
    return <svg className="mm-clock" viewBox="0 0 180 180" role="img" aria-label="An analogue clock. Read its hour and minute hands."><circle cx="90" cy="90" r="82" fill="#fffaf1" stroke="#d8c59d" strokeWidth="5" />{Array.from({ length: 12 }, (_, i) => { const p = hand((i + 1) * 30, 66); return <text key={i} x={p.x} y={p.y + 5} textAnchor="middle" fill="#61516e" fontSize="15">{i + 1}</text> })}<path d={`M90 90L${hour.x} ${hour.y}`} stroke="#634c7a" strokeWidth="7" strokeLinecap="round" /><path d={`M90 90L${minute.x} ${minute.y}`} stroke="#b08dba" strokeWidth="4" strokeLinecap="round" /><circle cx="90" cy="90" r="6" fill="#634c7a" /></svg>
  }
  if (visual.kind === 'chart') return <div className="mm-chart" role="img" aria-label={visual.bars.map(b => `${b.name}: ${b.value}`).join(', ')}>{visual.bars.map(b => <div key={b.name}><span>{b.name}</span><i style={{ width: `${b.value / 12 * 70}%`, background: b.colour }} /><b>{b.value}</b></div>)}</div>
  if (visual.kind === 'sum') return <div className="mm-written-sum" aria-label="Numbers lined up in columns"><span>{visual.a}</span><span><i>{visual.operation}</i>{visual.b}</span><b>?</b></div>
  if (visual.kind === 'fraction') return <div className="mm-fraction" aria-label={`${visual.numerator} of ${visual.denominator} equal parts shaded`}>{Array.from({ length: visual.denominator }, (_, i) => <i key={i} className={i < visual.numerator ? 'filled' : ''} />)}</div>
  const shape = visual.shape
  return <svg className="mm-shape" viewBox="0 0 220 130" role="img" aria-label={shape}>{shape === 'triangle' ? <path d="M110 15 185 112H35Z" /> : shape === 'pentagon' ? <path d="m110 12 63 44-24 72H71L47 56Z" /> : <rect x={shape === 'square' ? 65 : 35} y="25" width={shape === 'square' ? 90 : 150} height="90" rx="3" />}{visual.width && <text x="110" y="18" textAnchor="middle">{visual.width}m</text>}{visual.height && <text x="205" y="75" textAnchor="middle">{visual.height}m</text>}</svg>
}

export function MakeoverMaths() {
  const [players, setPlayers] = useState<Player[]>(() => [newPlayer('Player 1', 'year1'), newPlayer('Player 2', 'year3')])
  const playersRef = useRef(players), activeRef = useRef(0)
  const [active, setActive] = useState(0), [place, setPlace] = useState<Place>('room')
  const [modal, setModal] = useState<Modal>(null), dialog = useRef<HTMLDialogElement>(null)
  const [topic, setTopic] = useState<Topic>('mixed'), [question, setQuestion] = useState<Question | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null), [hint, setHint] = useState(false)
  const [message, setMessage] = useState('Welcome, designer! Explore your room, then solve a challenge to earn play money.')
  const [poseKey, setPoseKey] = useState(0), [sound, setSound] = useState(false), soundRef = useRef(false)
  const narration = useRef<HTMLAudioElement | null>(null)
  const [voiceStatus, setVoiceStatus] = useState('')
  const speechRequest = useRef<AbortController | null>(null), speechSequence = useRef(0)
  const questionClips = useRef(new Map<string, string>())
  const audio = useRef<AudioContext | null>(null), showTimer = useRef<ReturnType<typeof setTimeout>>()
  const [dancing, setDancing] = useState(false), [showResult, setShowResult] = useState<ReturnType<typeof enterShow>['result']>(null)
  const [collection, setCollection] = useState('all'), [selectedFood, setSelectedFood] = useState(''), [partyStarted, setPartyStarted] = useState(false)
  const [imageError, setImageError] = useState(false)
  const restoring = useRef(true)
  const sessions = useRef<Session[]>([emptySession(), emptySession()])
  const account = useAccount((state: GameState) => {
    restoring.current = true
    const saved = fromGameState(state); playersRef.current = saved.players; activeRef.current = saved.active; sessions.current = saved.sessions
    setPlayers(saved.players); setActive(saved.active); setPlace(saved.place); setCollection(saved.collection); setSelectedFood(saved.selectedFood); setPartyStarted(saved.partyStarted); setMessage(resumeMessage(saved.players[saved.active]))
    const session = saved.sessions[saved.active]; setQuestion(session.question); setFeedback(session.feedback); setHint(session.hint); setTopic(session.topic); setModal(session.mathsOpen ? 'maths' : null)
    const resumedPlayer = saved.players[saved.active]
    clearTimeout(showTimer.current); setDancing(false); setShowResult(saved.place === 'show' && resumedPlayer.lastShowCorrect === resumedPlayer.correct ? resumedPlayer.lastShowResult : null)
  })
  useEffect(() => {
    if (restoring.current) { restoring.current = false; return }
    sessions.current[active] = { question, feedback, hint, topic, mathsOpen: modal === 'maths' }
    account.save(toGameState({ players, active, sessions: sessions.current, place, collection, selectedFood, partyStarted }))
  }, [players, active, question, feedback, hint, topic, modal, place, collection, selectedFood, partyStarted])
  const timingState = useRef({ question, modal, feedback }); timingState.current = { question, modal, feedback };
  const saveTiming = useRef(() => {}); saveTiming.current = () => {
    sessions.current[activeRef.current].question = timingState.current.question;
    account.save(toGameState({ players: playersRef.current, active: activeRef.current, sessions: sessions.current, place, collection, selectedFood, partyStarted }));
  };
  useEffect(() => startEvidenceClock(() => timingState.current.modal === 'maths' && timingState.current.feedback !== 'correct' ? timingState.current.question : null, () => saveTiming.current()), []);
  const player = players[active]
  useEffect(() => {
    const title = document.title; document.title = 'Makeover Maths · Solve. Style. Shine.'
    const images = ['dressing-room.png', 'show-stage.png', 'teen-lavender.png', 'teen-rose.png', 'teen-teal.png', 'hair-bun.png', 'hair-pony.png'].map(file => { const img = new Image(); img.onerror = () => setImageError(true); img.src = assetRoot + file; return img })
    return () => { document.title = title; clearTimeout(showTimer.current); void audio.current?.close(); images.forEach(i => { i.onerror = null }) }
  }, [])
  useEffect(() => { if (modal && !dialog.current?.open) dialog.current?.showModal(); else if (!modal && dialog.current?.open) dialog.current.close() }, [modal])
  useEffect(() => {
    speechSequence.current++; speechRequest.current?.abort()
    narration.current?.pause(); setVoiceStatus('')
    return () => { speechSequence.current++; speechRequest.current?.abort(); narration.current?.pause() }
  }, [place, modal, active, question?.id])
  useEffect(() => () => { questionClips.current.forEach(url => URL.revokeObjectURL(url)) }, [])
  const voiceClip = modal === 'maths' ? 'maths' : modal === 'help' ? 'help' : place
  const clipVersions = voiceClips as Record<string, string>
  const voiceReady = modal === 'maths' ? Boolean(question) : Boolean(clipVersions[voiceClip])
  async function readInstructions() {
    if (!voiceReady) return
    const clip = voiceClip
    narration.current?.pause()
    const spoken = narration.current
    if (!spoken) return
    soundRef.current = true; setSound(true)
    const sequence = ++speechSequence.current
    speechRequest.current?.abort()
    if (modal === 'maths' && question) {
      setVoiceStatus('Preparing question audio…')
      const controller = new AbortController(); speechRequest.current = controller
      try {
        let url = questionClips.current.get(question.prompt)
        if (!url) {
          // Start the audio element during the tap so Safari permits later playback.
          spoken.onended = null; spoken.onerror = null
          spoken.src = '/audio/unlock.mp3'; void spoken.play().catch(() => {})
          const response = await fetch('/api/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: question.prompt }), signal: controller.signal })
          if (!response.ok) throw new Error('Voice unavailable')
          const blob = await response.blob()
          if (sequence !== speechSequence.current) return
          url = URL.createObjectURL(blob); questionClips.current.set(question.prompt, url)
          if (questionClips.current.size > 30) { const oldest = questionClips.current.keys().next().value!; URL.revokeObjectURL(questionClips.current.get(oldest)!); questionClips.current.delete(oldest) }
        }
        if (sequence !== speechSequence.current) return
        spoken.src = url
      } catch { if (sequence === speechSequence.current) setVoiceStatus('The free voice is busy. Tap Read question to try again.'); return }
    } else spoken.src = `/audio/${clip}.mp3?v=${clipVersions[clip]}`
    setVoiceStatus(modal === 'maths' ? 'Reading question…' : 'Reading instructions…')
    spoken.onended = () => { if (sequence === speechSequence.current) setVoiceStatus('') }
    spoken.onerror = () => { if (sequence === speechSequence.current) setVoiceStatus('Audio unavailable. Please try again.') }
    void spoken.play().catch(() => { if (sequence === speechSequence.current) setVoiceStatus('Tap the read button to try again.') })
  }
  function commit(next: Player) { const copy = [...playersRef.current]; copy[activeRef.current] = next; playersRef.current = copy; setPlayers(copy) }
  function chime(melody = false) {
    if (!soundRef.current) return
    try {
      audio.current ??= new AudioContext(); const context = audio.current; void context.resume()
      ;(melody ? [523, 659, 784, 880, 784, 659] : [659, 880]).forEach((note, i) => {
        const oscillator = context.createOscillator(), gain = context.createGain(), start = context.currentTime + i * .14
        oscillator.frequency.value = note; gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.04, start + .015); gain.gain.exponentialRampToValueAtTime(.001, start + .25)
        oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start + .3)
      })
    } catch { /* Sound is optional. */ }
  }
  function openMaths() {
    const p = playersRef.current[activeRef.current]
    if (question && feedback !== 'correct') { setModal('maths'); return }
    const q = makeQuestion(p, p.correct === 0 && topic === 'mixed' ? 'addition' : topic); commit(logQuestion(p, q)); setQuestion(q); setFeedback(null); setHint(false); setModal('maths')
  }
  function answer(value: string) {
    if (!question || feedback === 'correct') return
    const before = playersRef.current[activeRef.current], result = answerQuestion(before, question, value)
    commit(result.player); setFeedback(result.correct ? 'correct' : 'wrong')
    if (result.correct && !result.duplicate) {
      chime(); setPoseKey(n => n + 1); setShowResult(null)
      const rewards = result.player.level > before.level ? progressionAtLevel(result.player.level, result.player.track) : []
      setMessage(result.player.completed ? 'You completed all 50 levels! Take a bow, maths superstar.' : result.player.level > before.level ? `Level ${result.player.level} unlocked${rewards.length ? `: ${rewards.slice(0, 2).join(' and ')}` : '! Your next adventure is ready.'}` : `Lovely thinking! ${money(questionReward(question))} added to your play-money purse.`)
    }
  }
  function nextQuestion() {
    const p = playersRef.current[activeRef.current]

    const q = makeQuestion(p, topic); commit(logQuestion(p, q)); setQuestion(q); setFeedback(null); setHint(false)
  }
  function visit(next: Place) {
    clearTimeout(showTimer.current); setDancing(false); setShowResult(null)
    if (next === 'party') {
      const p = playersRef.current[activeRef.current]
      if (place === 'party' && partyStarted) { setMessage('Your celebration is still waiting. Dance for as long as you like!'); return }
      if (p.partyTickets < 1) { setMessage('Win three fashion shows in a row to earn a party invitation.'); setPlace('show'); return }
      setPartyStarted(false); setSelectedFood(''); setMessage('Your invitation is safe. Start the party when you are ready!')
    } else setMessage({ room: 'Tap the rug to walk. Touch a studio to start styling.', wardrobe: 'Find a long gown you love. Bought gowns are yours to wear again.', hair: 'Choose a hairstyle and a colour spray.', makeup: 'A fresh face or a little shimmer — choose your favourite.', show: 'Dress for the theme, solve a question, then take the stage.' }[next])
    if (place === 'party' && next !== 'party') setPartyStarted(false)
    setPlace(next)
  }
  function unlock(studio: Studio) {
    const p = playersRef.current[activeRef.current]
    if (p.level < studioUnlockLevels[studio]) { setMessage(`Reach level ${studioUnlockLevels[studio]} to open this studio.`); openMaths(); return }
    const next = unlockStudio(p, studio)
    if (next === p) { openMaths(); return }
    commit(next); chime(); setMessage(studio === 'wardrobe' ? 'Wardrobe unlocked! Choose the Silver Starlight gown for free.' : `${places.find(s => s.id === studio)!.title} unlocked! Choose your first style.`)
  }
  function buy(category: 'dress' | 'hair' | 'colour' | 'makeup' | 'gear', id: string) {
    const p = playersRef.current[activeRef.current]
    const item = category === 'gear' ? gear.find(value => value.id === id) : category === 'dress' ? dresses.find(value => value.id === id) : category === 'hair' ? hairstyles.find(value => value.id === id) : category === 'colour' ? hairColours.find(value => value.id === id) : makeups.find(value => value.id === id)
    if (item && item.unlockLevel > p.level) { setMessage(`${item.name} unlocks at level ${item.unlockLevel}. Keep going!`); return }
    const next = buyItem(p, category, id)
    if (next === p) { setMessage('Earn a little more play money for this style.'); openMaths(); return }
    const owned = p.owned.includes(`${category}:${id}`); commit(next); setPoseKey(n => n + 1); chime(); setMessage(owned ? 'A favourite style, worn again for free.' : 'It’s yours! Your new style is ready to wear.')
  }
  function startShow() {
    const { player: next, result } = enterShow(playersRef.current[activeRef.current])
    if (!result) { setMessage('Solve one new question before your next fashion show.'); openMaths(); return }
    commit(next); setShowResult(null); setDancing(true); chime(true)
    clearTimeout(showTimer.current)
    showTimer.current = setTimeout(() => { setDancing(false); setShowResult(result); setMessage(result.won ? `You won! ${money(competitionFor(next).prize)} bonus. ${next.partyTickets ? 'A party invitation is waiting!' : 'Keep shining for three wins in a row.'}` : 'A lovely debut! $500 for taking part. Try a new style or build your maths streak.') }, 3800)
  }
  function startParty() {
    if (!partyStarted) {
      const p = playersRef.current[activeRef.current], entered = enterParty(p)
      if (entered === p) { setMessage('Your invitation is no longer available. Win three shows in a row for another.'); visit('show'); return }
      commit(entered); setPartyStarted(true); setDancing(true); chime(true); setMessage('The party has begun! Pick a treat and dance.')
      return
    }
    setDancing(!dancing); if (!dancing) chime(true)
  }
  function switchPlayer(index: number) {
    if (index === activeRef.current) return
    sessions.current[activeRef.current] = { question, feedback, hint, topic, mathsOpen: modal === 'maths' }
    const session = sessions.current[index]
    clearTimeout(showTimer.current); activeRef.current = index; setActive(index); setPlace('room'); setQuestion(session.question); setFeedback(session.feedback); setHint(session.hint); setTopic(session.topic); setShowResult(null); setDancing(false); setPartyStarted(false); setModal(session.mathsOpen ? 'maths' : null); setPoseKey(0)
    setMessage(`Welcome back, ${playersRef.current[index].name}! Your own wardrobe and progress are ready.`)
  }
  function changeTrack(index: number, track: Player['track']) {
    if (playersRef.current[index].track === track) return
    const copy = [...playersRef.current]
    const pending = index === activeRef.current ? question : sessions.current[index].question;
    if (pending && sessions.current[index].feedback !== 'correct') copy[index] = logQuestion(copy[index], pending, 'skip');
    copy[index] = { ...copy[index], track, challenge: null, mastery: createMastery() }
    playersRef.current = copy; setPlayers(copy); sessions.current[index] = emptySession()
    if (index === activeRef.current) { setQuestion(null); setFeedback(null); setHint(false); setTopic('mixed') }
  }
  function pose() { setPoseKey(n => n + 1); chime() }
  const studio = ['wardrobe', 'hair', 'makeup'].includes(place) ? place as Studio : null
  const locked = studio && !player.unlocked.includes(studio), studioLevelLocked = studio ? player.level < studioUnlockLevels[studio] : false, theme = themeFor(player)
  const currentDress = dresses.find(d => d.id === player.dress)!
  const visibleDresses = dresses.filter(d => collection === 'all' || d.id.startsWith(collection))
  const nextUnlock = nextProgression(player)
  const event = competitionFor(player), preview = judgeShow(player)
  function chooseChallenge(value: string) {
    if (question && feedback !== 'correct') commit(logQuestion(playersRef.current[activeRef.current], question, 'skip'))
    commit({ ...playersRef.current[activeRef.current], challenge: value === 'auto' ? null : Number(value) }); setQuestion(null); setFeedback(null)
  }
  function gearShop(slots: GearSlot[]) {
    return <><h3 className="mm-small-heading">Build your event kit</h3><div className="mm-gear-grid">{gear.filter(g => slots.includes(g.slot)).map(g => {
      const owned = player.owned.includes(`gear:${g.id}`), wearing = player.equipment[g.slot] === g.id
      return <button key={g.id} className={`mm-gear-card ${wearing ? 'selected' : ''}`} onClick={() => buy('gear', g.id)} aria-pressed={wearing}><span className="mm-gear-art"><GearArt item={g} /></span><strong>{g.name}</strong><small>{g.slot} · {g.occasion} · Fit +{g.quality}</small><b>{wearing ? 'Wearing' : owned ? 'Wear free' : money(g.price)}</b>{!owned && <small>{Math.max(0, g.price - player.coins) ? `${money(Math.max(0, g.price - player.coins))} still to save` : 'Ready to buy'}</small>}</button>
    })}</div>{slots.map(slot => player.equipment[slot] && <button className="mm-secondary" key={slot} onClick={() => { const equipment = { ...player.equipment }; delete equipment[slot]; commit({ ...player, equipment }) }}>Remove {slot}</button>)}</>
  }

  return <main className="mm-app">
    <audio ref={narration} preload="none" />
    <header className="mm-header"><a className="mm-brand" href="/"><span className="mm-brand-mark"><Icon name="star" size={28} /></span><span>makeover<span className="mm-brand-maths">maths</span><small>A LITTLE THINKING. A LOT OF MAGIC.</small></span></a>
      <div className="mm-player-switch" aria-label="Choose a player">{players.map((p, i) => <button key={i} className={i === active ? 'active' : ''} onClick={() => switchPlayer(i)} aria-pressed={i === active}><span className="mm-avatar">{i ? '✿' : '✦'}</span><span>{p.name}<small>{p.track === 'year1' ? 'Year 1' : 'Year 3'}</small></span></button>)}</div>
      <div className="mm-header-tools"><div className="mm-wallet"><span>✦</span><div><small>PLAY MONEY</small><strong aria-label={`${player.coins} play dollars`}>{money(player.coins)}</strong></div></div><button className="mm-icon-button" onClick={() => setModal('options')} aria-label="Options" title="Options"><Icon name="options" /></button><button className="mm-icon-button" aria-label={sound ? 'Turn sound off' : 'Turn sound on'} onClick={() => { soundRef.current = !sound; setSound(!sound); if (!sound) chime(); else { speechSequence.current++; speechRequest.current?.abort(); narration.current?.pause(); setVoiceStatus('') } }} title={sound ? 'Sound on' : 'Sound off'}><Icon name={sound ? 'sound' : 'mute'} /></button><button className="mm-icon-button" onClick={() => setModal('help')} aria-label="How to play"><Icon name="help" /></button></div>
    </header>
    <div className="mm-voice-guide"><button className="mm-secondary" disabled={!voiceReady} onClick={readInstructions}><Icon name="sound" size={18} />Read instructions</button><span role="status">{voiceReady ? voiceStatus : 'Voice preview is awaiting audio setup.'}</span><p>{instructions[place]}</p></div>
    <div className="mm-intro"><div><p className="mm-eyebrow">SOLVE. STYLE. SHINE.</p><h1>Your imagination starts here<span> ✧</span></h1><p>Every little answer opens a beautiful new possibility.</p></div><button className="mm-level-badge" onClick={() => setModal(player.completed ? 'complete' : 'map')}><span className="mm-level-star">✦</span><div><small>{player.completed ? 'ALL 50 COMPLETE' : 'YOUR ADVENTURE'}</small><strong>{player.completed ? 'Maths superstar' : `Level ${player.level} of 50`}</strong><span className="mm-level-dots">{[0, 1, 2].map(i => <i key={i} className={i < player.levelCorrect ? 'filled' : ''} />)}<em>3 answers per level</em></span></div><Icon name="arrow" size={17} /></button></div>
    <nav className="mm-nav" aria-label="Game places">{places.map(p => { const isLocked = p.id === 'party' ? player.partyTickets === 0 && !(place === 'party' && partyStarted) : p.id in studioCosts && !player.unlocked.includes(p.id as Studio); return <button key={p.id} className={place === p.id ? 'active' : ''} onClick={() => visit(p.id)} aria-pressed={place === p.id}><Icon name={p.icon} size={18} />{p.title}{isLocked && <Icon name="lock" size={12} />}{p.id === 'party' && player.partyTickets > 0 && <b className="mm-ticket-count">{player.partyTickets}</b>}</button> })}<button className="mm-earn" onClick={openMaths}><Icon name="maths" size={18} />Earn play money<Icon name="arrow" size={17} /></button></nav>
    {imageError && <p role="alert" className="mm-asset-error">A picture could not load. Refresh the page to try again.</p>}
    <div className="mm-layout"><Room player={player} place={place} onVisit={visit} dancing={dancing} poseKey={poseKey} onPose={pose} />
      <aside key={place} className="mm-studio"><div className="mm-studio-heading"><span className="mm-mini-icon"><Icon name={places.find(p => p.id === place)!.icon} /></span><div><p className="mm-eyebrow">{place === 'room' ? 'MAKE YOURSELF AT HOME' : place === 'show' ? 'YOUR MOMENT TO SHINE' : place === 'party' ? 'YOU EARNED THIS' : 'YOUR STYLE STORY'}</p><h2>{place === 'room' ? 'Welcome, designer' : places.find(p => p.id === place)!.title}</h2></div></div>
        {locked && studio ? <div className="mm-locked"><div className="mm-lock-orbit"><Icon name="lock" size={34} /><span>✧</span></div><h3>{studioLevelLocked ? `A level ${studioUnlockLevels[studio]} adventure` : 'A new door to open'}</h3><p>{studioLevelLocked ? `Keep solving to discover your ${places.find(p => p.id === studio)!.title.toLowerCase()}.` : `Use your play money to unlock your ${places.find(p => p.id === studio)!.title.toLowerCase()}.`}</p><div className="mm-unlock-price"><small>{studioLevelLocked ? 'UNLOCKS AT' : 'UNLOCK FOREVER'}</small><strong>{studioLevelLocked ? `Level ${studioUnlockLevels[studio]}` : money(studioCosts[studio])}</strong><span>{studioLevelLocked ? `You are on level ${player.level}` : '1 correct answer = $1,000'}</span></div><button className="mm-primary" onClick={() => unlock(studio)}>{studioLevelLocked ? `Continue towards level ${studioUnlockLevels[studio]}` : player.coins >= studioCosts[studio] ? 'Unlock this studio' : 'Earn play money'}<Icon name="arrow" size={17} /></button><p className="mm-fine-print">New styles keep arriving as your level grows. Everything you buy stays in your collection.</p></div> : <>
          {place === 'room' && <><p className="mm-panel-copy">Your very own fashion adventure. A little maths, a lovely gown, and a moment in the spotlight.</p><div className="mm-mission"><span>✦</span><small>YOUR NEXT LITTLE ADVENTURE</small><h3>{player.completed ? 'Celebrate your achievement' : !player.unlocked.includes('wardrobe') ? 'Open your wardrobe' : nextUnlock ? `Reach level ${nextUnlock.level}` : 'Create your dream look'}</h3><p>{!player.unlocked.includes('wardrobe') ? 'One correct answer opens it, with a new gown choice waiting for free.' : nextUnlock ? `${nextUnlock.rewards.slice(0, 2).join(' and ')} ${nextUnlock.rewards.length > 1 ? 'are' : 'is'} waiting.` : 'Pick a style, practise maths, then enter a fashion show.'}</p><button className="mm-primary" onClick={player.completed ? () => setModal('complete') : openMaths}>{player.completed ? 'See your achievement' : 'Let’s do some maths'}<Icon name="arrow" size={17} /></button></div><div className="mm-current-look"><div><Character player={player} thumbnail /></div><section><small>YOUR LOOK RIGHT NOW</small><strong>{currentDress.name}</strong><span>Made for your imagination</span></section></div><div className="mm-stats"><div><b>{player.correct}</b><span>answers</span></div><div><b>{player.wins}</b><span>show wins</span></div><div><b>{player.parties}</b><span>parties</span></div></div></>}
          {place === 'wardrobe' && <><p className="mm-panel-copy">Save for shoes and bags that suit your next event. Gown collections unlock across all 50 levels.</p><div className="mm-theme-tip"><small>CURRENT SHOW THEME</small><strong>{theme.name}</strong><span>Matching gowns earn +2 Style and are marked with a star.</span></div>{gearShop(['shoes', 'bag'])}<h3 className="mm-small-heading">Gown collections</h3><div className="mm-collection-tabs" aria-label="Dress collections">{[['all', 'All'], ['0', 'Starlight'], ['1', 'Satin · L10'], ['2', 'Botanical · L28']].map(([id, label]) => <button key={id} onClick={() => setCollection(id)} className={collection === id ? 'active' : ''} aria-pressed={collection === id}>{label}</button>)}</div><div className="mm-dress-grid">{visibleDresses.map(dress => <DressCard key={dress.id} dress={dress} player={player} matchesTheme={theme.palettes.includes(dress.palette)} onChoose={() => buy('dress', dress.id)} />)}</div><p className="mm-fine-print">15 colourways · New styles through level 48 · Wear owned styles for free</p></>}
          {place === 'hair' && <><p className="mm-panel-copy">A graceful updo or soft waves? Make it yours. More colours and styles arrive as you progress.</p>{gearShop(['accessory'])}<h3 className="mm-small-heading">Choose your hairstyle</h3><div className="mm-hair-grid">{hairstyles.map(h => { const owned = player.owned.includes(`hair:${h.id}`), levelLocked = !owned && h.unlockLevel > player.level; return <button key={h.id} disabled={levelLocked} className={`mm-style-card ${player.hair === h.id ? 'selected' : ''} ${levelLocked ? 'locked' : ''}`} onClick={() => buy('hair', h.id)} aria-pressed={player.hair === h.id}><div className="mm-hair-preview"><img src={assetRoot + h.asset} alt="" /></div><strong>{h.name}</strong><span>{levelLocked ? `Level ${h.unlockLevel}` : player.hair === h.id ? 'Wearing' : owned ? 'Wear it' : money(h.price)}</span></button> })}</div><h3 className="mm-small-heading">Try a colour spray</h3><div className="mm-colour-grid">{hairColours.map(c => { const owned = player.owned.includes(`colour:${c.id}`), levelLocked = !owned && c.unlockLevel > player.level; return <button key={c.id} disabled={levelLocked} className={`${player.hairColour === c.id ? 'selected' : ''} ${levelLocked ? 'locked' : ''}`} onClick={() => buy('colour', c.id)} aria-pressed={player.hairColour === c.id}><i style={{ background: c.colour }} /><strong>{c.name}</strong><span>{levelLocked ? `Level ${c.unlockLevel}` : player.hairColour === c.id ? 'Wearing' : owned ? 'Wear it' : money(c.price)}</span></button> })}</div><p className="mm-fine-print">Changing styles you already own is always free.</p></>}
          {place === 'makeup' && <><p className="mm-panel-copy">A tiny finishing touch. Every look is lovely, including a fresh face. New looks arrive through level 40.</p>{gearShop(['eyes', 'lips'])}<div className="mm-makeup-grid">{makeups.map(m => { const owned = player.owned.includes(`makeup:${m.id}`), levelLocked = !owned && m.unlockLevel > player.level; return <button key={m.id} disabled={levelLocked} className={`mm-makeup-card ${player.makeup === m.id ? 'selected' : ''} ${levelLocked ? 'locked' : ''}`} onClick={() => buy('makeup', m.id)} aria-pressed={player.makeup === m.id}><span className="mm-makeup-swatch" style={{ '--swatch': m.colour } as CSSProperties}>{m.id === 'sparkle' ? '✧' : '✿'}</span><div><strong>{m.name}</strong><small>{m.id === 'natural' ? 'Your own natural glow' : m.id === 'rose' ? 'A soft rosy blush' : m.id === 'peach' ? 'Warm cheeks and shimmer' : 'A sprinkling of golden magic'}</small><span>{levelLocked ? `Unlocks at level ${m.unlockLevel}` : player.makeup === m.id ? 'Wearing' : owned ? 'Wear it' : money(m.price)}</span></div>{player.makeup === m.id && <Icon name="check" size={16} />}</button> })}</div></>}
          {place === 'show' && <><div className="mm-event-list" aria-label="Choose a competition">{competitions.map(c => <button key={c.id} disabled={player.level < c.level || dancing} className={player.competition === c.id ? 'selected' : ''} aria-pressed={player.competition === c.id} onClick={() => { commit({ ...player, competition: c.id as Occasion, lastShowResult: null }); setShowResult(null) }}><strong>{c.name}</strong><span>{player.level < c.level ? `Level ${c.level} unlock` : `Win ${money(c.prize)} · target ${c.id === 'runway' ? judgeShow({ ...player, competition: 'runway' }).target : c.target}`}</span></button>)}</div><div className="mm-fit-preview"><strong>{event.name}</strong><p>{event.description}</p><b>Your score preview: {preview.total}/30 · target {preview.target}</b><p>Style {preview.style} · Creativity {preview.creativity} · Maths {preview.confidence}</p><small>{preview.won ? 'Your look is ready! Solve a fresh question to enter.' : 'Save for matching gear or practise to build your maths confidence.'} Entry is free · participation pays $500.</small><p>{Object.values(player.equipment).map(id => gear.find(g => g.id === id)?.name).filter(Boolean).join(' · ') || 'No extra gear equipped yet'}</p></div><div className="mm-show-theme"><small>{player.wins === 0 ? 'YOUR DEBUT THEME' : 'TODAY’S THEME'}</small><h3>{theme.name}</h3><p>{theme.description}</p></div><div className="mm-win-streak"><div>{[0, 1, 2].map(i => <span key={i} className={i < (player.showStreak % 3 || (player.showStreak ? 3 : 0)) ? 'filled' : ''}>★</span>)}</div><p>3 wins in a row = a party invitation</p></div>{showResult ? <div className={`mm-results ${showResult.won ? 'won' : ''}`} role="status"><h3>{showResult.won ? 'You lit up the runway!' : 'A lovely first step!'}</h3><strong>{showResult.won ? `+ ${money(event.prize)}` : '+ $500'} play money</strong><div className="mm-judges">{[['Style', showResult.style, '✿'], ['Creativity', showResult.creativity, '✧'], ['Maths confidence', showResult.confidence, '✦']].map(([label, score, icon]) => <div key={label}><span>{icon}</span><b>{score}/10</b><small>{label}</small></div>)}</div><p className="mm-theme-result">{event.id !== 'runway' ? 'Matching event gear adds Style and Creativity.' : showResult.matchedTheme ? '★ Theme match: +2 Style' : `No theme bonus — try ${theme.palettes.join(' or ')}.`}</p><p>{showResult.won ? `You scored ${showResult.total} against a target of ${showResult.target}. Your outfit, ideas, and maths made a brilliant team.` : `You scored ${showResult.total}. Aim for ${showResult.target}: match the theme, try an unlocked accessory, or build your maths streak.`}</p></div> : <div className="mm-show-preview"><span>✧</span><h3>{dancing ? 'The spotlight is yours…' : 'Ready for your entrance?'}</h3><p>{player.wins === 0 ? 'Choose matching gear and solve a fresh question before you enter.' : 'Judges cheer for style, creativity, and maths confidence.'}</p></div>}<button className="mm-primary" disabled={dancing} onClick={startShow}>{dancing ? 'Enjoy your little dance…' : player.lastShowCorrect === player.correct || !player.correct ? 'Solve maths to enter' : 'Take the stage'}<Icon name="star" size={17} /></button>{player.partyTickets > 0 && <button className="mm-secondary mm-party-invite" onClick={() => visit('party')}>Your party invitation is here! ✧</button>}</>}
          {place === 'party' && <><div className="mm-party-card"><span>✧</span><h3>You’re on the guest list!</h3><p>{partyStarted ? 'A beautiful gown, fancy treats, and a dance floor all to yourself. Enjoy your celebration.' : 'Your invitation stays safe until you choose Start the party.'}</p></div><h3 className="mm-small-heading">Pick a party treat</h3><div className="mm-foods">{[['Cupcakes', '🧁'], ['Strawberries', '🍓'], ['Sparkling juice', '🍹']].map(([name, emoji]) => <button key={name} onClick={() => { setSelectedFood(name); chime(); setMessage(`A little ${name.toLowerCase()} treat. Enjoy your celebration!`) }} className={selectedFood === name ? 'selected' : ''}><span>{emoji}</span><strong>{name}</strong></button>)}</div><p className="mm-treat-message">{selectedFood ? `${selectedFood}, served with a little sparkle!` : 'Choose something delicious.'}</p><button className="mm-primary" onClick={startParty}>{!partyStarted ? 'Start the party' : dancing ? 'Pause the dance' : 'Let’s dance'}<Icon name="star" size={17} /></button><button className="mm-secondary" onClick={() => { visit('room'); openMaths() }}>Back to your adventure<Icon name="arrow" size={17} /></button></>}
        </>}
        <div className="mm-studio-footer"><span>✧ Your ideas make the magic.</span><button onClick={() => setModal('map')} aria-label="See all 50 levels"><Icon name="map" size={17} /></button></div>
      </aside>
    </div>
    <div className="mm-status"><span className="mm-status-dot" /><p role="status" aria-live="polite">{message}</p><button onClick={() => setModal('players')}>Players & maths settings<Icon name="arrow" size={14} /></button></div>
    <footer className="mm-footer"><span className="mm-save-status" role="status">{account.status}</span><span>Gowns, shoes, bags & more · Your own pace · A little maths magic</span></footer>
    <dialog className={`mm-dialog ${modal === 'map' ? 'mm-map-dialog' : ''}`} ref={dialog} aria-labelledby="mm-dialog-title" onCancel={() => setModal(null)} onClick={event => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) setModal(null) } }}>
      <button className="mm-dialog-close" onClick={() => setModal(null)} aria-label="Close dialog"><Icon name="close" /></button>
      {modal === 'options' && <><p className="mm-eyebrow">PARENT OPTIONS</p><h2 id="mm-dialog-title">Keep your little adventures <span>✧</span></h2><p className="mm-dialog-lead">{account.signedIn ? 'Both child profiles save automatically to your parent account.' : 'Guest play stays on this device. Sign in to save both child profiles online.'}</p><p className="mm-account-status" role="status">{account.status}</p>{account.authError && <p role="alert">{account.authError}</p>}{account.signedIn ? <button className="mm-secondary" onClick={() => { void account.signOut() }}>Sign out</button> : <button className="mm-primary" disabled={!account.canSignIn} onClick={() => { setModal(null); account.signIn() }}>Continue with Google<Icon name="arrow" size={17} /></button>}<p className="mm-fine-print">Guest and parent adventures are separate. Children use profiles, so they don’t need their own Google accounts.</p>{account.conflict && <div className="mm-save-note"><strong>Another device has a newer save</strong><p>Choose which adventure to continue. This choice applies to both child profiles.</p><button className="mm-primary" onClick={() => account.resolve(false)}>Use the online adventure</button><button className="mm-secondary" onClick={() => account.resolve(true)}>Keep this device’s adventure</button></div>}<button className="mm-secondary" onClick={() => setModal('players')}>Players & maths settings<Icon name="arrow" size={17} /></button></>}
      {modal === 'maths' && question && <><p className="mm-eyebrow">{player.name.toUpperCase()} · LEVEL {player.level} · {topics.find(t => t.id === question.topic)!.name.toUpperCase()}</p><h2 id="mm-dialog-title">A little maths magic <span>✧</span></h2><p className="mm-dialog-lead">Think it through. This challenge pays <b>{money(questionReward(question))}</b> per correct answer.</p><button className="mm-secondary" disabled={!voiceReady} onClick={readInstructions}><Icon name="sound" size={18} />Read question</button><p role="status">{voiceStatus}</p><div className="mm-question"><h3>{question.prompt}</h3><QuestionVisual visual={question.visual} /></div><div className="mm-answers">{question.options.map(option => <button key={option} disabled={feedback === 'correct'} className={feedback === 'correct' && option === question.answer ? 'correct' : ''} onClick={() => answer(option)}>{option}{feedback === 'correct' && option === question.answer && <Icon name="check" />}</button>)}</div>{feedback === 'correct' ? <div className="mm-correct-feedback" role="status"><strong>Lovely thinking! + {money(questionReward(question))} ✦</strong><p>{question.explanation}</p><div><button className="mm-primary" onClick={nextQuestion}>Next question<Icon name="arrow" size={17} /></button><button className="mm-secondary" onClick={() => { setModal(null); visit('wardrobe') }}>Go shopping<Icon name="dress" size={17} /></button></div></div> : <><p className="mm-try-again" role="status">{feedback === 'wrong' ? 'Good try! Take another look. Your play money is safe.' : 'No hurry. Take all the time you need.'}</p><button className="mm-hint-button" onClick={() => { if (!hint) { question.helpUsed = true; commit(logQuestion(playersRef.current[activeRef.current], question, 'hint')); } setHint(!hint) }}>{hint ? 'Hide the little hint' : 'A little hint, please'} ✧</button>{hint && <p className="mm-hint">{question.hint}</p>}</>}<p className="mm-fine-print mm-question-footer">{player.track === 'year1' ? 'Year 1 starting point' : 'Year 3 starting point'} · Questions gently adapt as you practise.</p></>}
      {modal === 'help' && <><button className="mm-secondary" disabled={!voiceReady} onClick={readInstructions}><Icon name="sound" size={18} />Read instructions</button><p role="status">{voiceStatus}</p><p className="mm-eyebrow">YOUR LITTLE GUIDE</p><h2 id="mm-dialog-title">Welcome to Makeover Maths <span>✧</span></h2><div className="mm-help-steps"><div><b>1</b><section><h3>Think & earn</h3><p>Choose a topic and challenge in Players & maths settings. Correct answers pay $1,000–$5,000 according to difficulty. Three answers complete a level. Surprise mix introduces new topics gently and adapts each topic separately.</p></section></div><div><b>2</b><section><h3>Unlock & style</h3><p>Your first answer opens the wardrobe and a free new gown. More studios, colours and collections arrive through level 48.</p></section></div><div><b>3</b><section><h3>Shine & celebrate</h3><p>Matching the show theme adds 2 Style points. Choose an event and check your predicted score before entering; three wins in a row earn a party invitation that stays safe until you start the party.</p></section></div></div><p className="mm-help-controls">Tap the rug or use arrow keys to walk. Tap a studio to visit. Touch your character to strike a pose.</p><div className="mm-save-note"><strong>Your adventure saves automatically</strong><p>Guest play saves on this device. A parent can sign in with Google in Options to keep both children’s adventures online.</p></div><button className="mm-primary" onClick={() => setModal('players')}>Choose players & maths<Icon name="arrow" size={17} /></button></>}
      {modal === 'players' && <><p className="mm-eyebrow">MADE FOR YOUR OWN PACE</p><h2 id="mm-dialog-title">Two designers, two adventures <span>✧</span></h2><p className="mm-dialog-lead">Each player has their own money, wardrobe, progress, and per-topic challenge.</p><div className="mm-player-settings">{players.map((p, i) => <section key={i}><label htmlFor={`mm-name-${i}`}>Player {i + 1} name</label><input id={`mm-name-${i}`} value={p.name} maxLength={24} onChange={event => { const copy = [...playersRef.current]; copy[i] = { ...copy[i], name: event.target.value }; playersRef.current = copy; setPlayers(copy) }} /><div className="mm-track-choice">{(['year1', 'year3'] as const).map(track => <button key={track} className={p.track === track ? 'active' : ''} aria-pressed={p.track === track} onClick={() => changeTrack(i, track)}><b>{track === 'year1' ? 'Year 1' : 'Year 3'}</b><span>{track === 'year1' ? 'Topics introduced gradually' : 'All topics from the start'}</span></button>)}</div></section>)}</div><label className="mm-topic-label" htmlFor="mm-challenge">Choose your challenge & payout</label><select id="mm-challenge" value={player.challenge ?? 'auto'} onChange={e => chooseChallenge(e.target.value)}><option value="auto">Recommended · adapts to your progress</option>{Array.from({ length: player.track === 'year1' ? 5 : 9 }, (_, i) => <option key={i} value={i}>Challenge {i + 1} · {money(challengeReward(i))} per answer</option>)}</select><p className="mm-fine-print">Choose freely: easier practice pays less; bigger number ranges and multi-step challenges pay more. Every three answers advance your journey. Hints and retries are free.</p><label className="mm-topic-label" htmlFor="mm-topic">Maths to practise</label><select id="mm-topic" value={topic} onChange={event => { if (question && feedback !== 'correct') commit(logQuestion(playersRef.current[activeRef.current], question, 'skip')); setTopic(event.target.value as Topic); setQuestion(null) }}>{topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select><p className="mm-fine-print">Surprise mix unlocks topics with progression; choosing a topic directly keeps it available for focused practice. {player.challenge !== null ? `Selected challenge: ${player.challenge + 1}, paying ${money(challengeReward(player.challenge))}.` : topic === 'mixed' ? 'Challenge adapts separately for every topic.' : `Current ${topics.find(item => item.id === topic)!.name.toLowerCase()} challenge: ${difficulty(player, topic) + 1} of ${player.track === 'year1' ? 5 : 9}.`}</p><button className="mm-primary" onClick={() => setModal(null)}>Ready to play<Icon name="star" size={17} /></button></>}
      {modal === 'map' && <><p className="mm-eyebrow">YOUR 50-LEVEL ADVENTURE</p><h2 id="mm-dialog-title">One little step at a time <span>✧</span></h2><p className="mm-dialog-lead">Three correct answers per level. Current level: {player.level}.{nextUnlock ? ` Next unlock at level ${nextUnlock.level}: ${nextUnlock.rewards.slice(0, 2).join(' and ')}.` : ''}</p><div className="mm-level-map">{Array.from({ length: 50 }, (_, i) => i + 1).map(level => { const rewards = progressionAtLevel(level, player.track), current = level === player.level && !player.completed; return <button key={level} disabled={!current} title={rewards.join(' · ') || undefined} className={`${level < player.level || player.completed ? 'done' : current ? 'current' : ''} ${rewards.length ? 'milestone' : ''}`} aria-label={`Level ${level}${level < player.level || player.completed ? ', complete' : current ? ', current' : ', coming next'}${rewards.length ? `, unlocks ${rewards.join(', ')}` : ''}`} onClick={openMaths}>{level < player.level || player.completed ? '✦' : level}<small>{level < player.level || player.completed ? level : rewards.length ? '◆' : ''}</small></button> })}</div><p className="mm-map-key">◆ New style, studio, maths topic, or final reward</p><div className="mm-stats"><div><b>{player.correct}</b><span>answers</span></div><div><b>{player.wins}</b><span>show wins</span></div><div><b>{player.parties}</b><span>parties</span></div></div><button className="mm-primary" onClick={player.completed ? () => setModal('complete') : openMaths}>{player.completed ? 'See your achievement' : 'Continue your adventure'}<Icon name="arrow" size={17} /></button></>}
      {modal === 'complete' && <><div className="mm-achievement">✦</div><p className="mm-eyebrow">ALL 50 LEVELS COMPLETE</p><h2 id="mm-dialog-title">Take a bow, {player.name || 'designer'}!</h2><p className="mm-dialog-lead">You are a Makeover Maths superstar. Every answer was a little step towards this moment.</p><div className="mm-stats"><div><b>{player.correct}</b><span>answers</span></div><div><b>{player.wins}</b><span>show wins</span></div><div><b>{player.parties}</b><span>parties</span></div></div><button className="mm-primary" onClick={() => { setModal(null); visit('show') }}>Take a final bow<Icon name="star" size={17} /></button><p className="mm-fine-print">Your achievement saves automatically.</p></>}
    </dialog>
  </main>
}
function DressCard({ dress, player, matchesTheme, onChoose }: { dress: Dress; player: Player; matchesTheme: boolean; onChoose: () => void }) {
  const wearing = player.dress === dress.id, owned = player.owned.includes(`dress:${dress.id}`), levelLocked = !owned && dress.unlockLevel > player.level
  const status = levelLocked ? `Level ${dress.unlockLevel} · ${money(dress.price)}` : wearing ? 'Wearing' : owned ? 'Wear it' : dress.price === 0 ? 'Free' : money(dress.price)
  return <button disabled={levelLocked} className={`mm-dress-card ${wearing ? 'selected' : ''} ${levelLocked ? 'locked' : ''}`} onClick={onChoose} aria-pressed={wearing} aria-label={`${dress.name}, ${status}${matchesTheme ? ', matches the current theme' : ''}`}><div className="mm-dress-preview"><Character player={{ ...player, dress: dress.id }} thumbnail /><i style={{ background: dress.colour }} />{matchesTheme && <span className="mm-theme-match" title="Matches the current show theme">★</span>}{wearing && <span className="mm-wearing-check"><Icon name="check" size={13} /></span>}</div><strong>{dress.name}</strong><span>{status}</span></button>
}
