import { createGameState, restoreGameState } from '../game/save.ts'
import type { GameState } from '../game/save.ts'

export type RemoteSave = { revision: number; gameState: GameState | null; updatedAt: string | null }
type Pending = { mutationId: string; revision: number; gameState: GameState }
type Cache = { revision: number; gameState: GameState; dirty: boolean; pending: Pending | null }
type Options = { storage: Pick<Storage, 'getItem' | 'setItem'>; request: (method: 'GET' | 'PUT', body?: Pending) => Promise<RemoteSave>; apply: (state: GameState) => void; status: (message: string) => void; conflict: (remote: RemoteSave | null) => void }

// Copied boundary: one persisted request, one atomic revision, explicit conflicts.
export class CloudSave {
  userId: string | null = null; state: Cache | null = null; remote: RemoteSave | null = null
  ready = false; busy = false; generation = 0; cacheAvailable = true; retryDelay = 2000
  timer: ReturnType<typeof setTimeout> | undefined
  options: Options
  constructor(options: Options) { this.options = options }
  cacheKey() { return `makeover-maths:account:${this.userId}` }
  status(message: string) { this.options.status(this.cacheAvailable ? message : `Device cache unavailable · ${message}`) }
  cache() {
    try { this.options.storage.setItem(this.cacheKey(), JSON.stringify(this.state)); this.cacheAvailable = true }
    catch { this.cacheAvailable = false; this.status('Keep this page open until saved online') }
  }
  async connect(userId: string | null) {
    clearTimeout(this.timer); const generation = ++this.generation
    this.userId = userId; this.state = null; this.remote = null; this.ready = false; this.options.conflict(null); this.retryDelay = 2000
    if (!userId) return
    try {
      const cached = JSON.parse(this.options.storage.getItem(this.cacheKey()) || 'null') as Cache | null
      if (cached && Number.isSafeInteger(cached.revision) && cached.revision >= 0) {
        cached.gameState = restoreGameState(cached.gameState)
        if (cached.pending) {
          if (!/^[a-f0-9-]{36}$/.test(cached.pending.mutationId) || cached.pending.revision !== cached.revision) throw new Error('Invalid pending save')
          cached.pending.gameState = restoreGameState(cached.pending.gameState)
        }
        this.state = cached
      }
    } catch { /* Online copy remains canonical. */ }
    this.state ??= { revision: 0, gameState: createGameState(), dirty: false, pending: null }
    this.options.apply(this.state.gameState); this.status('Checking online save…')
    try {
      const remote = await this.options.request('GET'); if (generation !== this.generation) return
      if (this.state.pending || this.state.dirty) {
        if (remote.revision !== this.state.revision && (!this.state.pending || remote.revision !== this.state.revision + 1)) { this.remote = remote; this.options.conflict(remote); this.status('Two saves need your choice'); return }
      } else {
        this.state = { revision: remote.revision, gameState: remote.gameState ? restoreGameState(remote.gameState) : createGameState(), dirty: false, pending: null }
        this.options.apply(this.state.gameState); this.cache()
      }
      this.ready = true
      if (this.state.pending || this.state.dirty) await this.flush(); else this.status(remote.gameState ? 'Saved online' : 'Saves automatically')
    } catch { if (generation === this.generation) { this.ready = true; this.status('On this device · reconnecting…'); this.schedule() } }
  }
  save(gameState: GameState) {
    if (!this.userId || !this.state) return
    this.state.gameState = structuredClone(gameState); this.state.dirty = true; this.cache()
    this.status(this.remote ? 'Two saves need your choice' : 'Saving…'); this.schedule(800)
  }
  schedule(delay = this.retryDelay) {
    clearTimeout(this.timer); this.timer = setTimeout(() => { void this.flush() }, delay)
    ;(this.timer as unknown as { unref?: () => void }).unref?.()
  }
  async flush() {
    if (!this.userId || !this.state || !this.ready || this.remote || this.busy || (!this.state.dirty && !this.state.pending)) return
    const generation = this.generation; this.busy = true
    this.state.pending ??= { mutationId: crypto.randomUUID(), revision: this.state.revision, gameState: structuredClone(this.state.gameState) }
    const sent = this.state.pending; this.cache(); this.status('Saving…')
    try {
      const remote = await this.options.request('PUT', sent); if (generation !== this.generation) return
      this.state.revision = remote.revision; this.state.pending = null; this.retryDelay = 2000
      this.state.dirty = JSON.stringify(this.state.gameState) !== JSON.stringify(sent.gameState); this.cache()
      this.status(this.state.dirty ? 'Saving…' : 'Saved online')
    } catch (error) {
      if (generation !== this.generation) return
      const e = error as { status?: number; body?: RemoteSave }
      if (e.status === 409 && e.body) { this.remote = e.body; this.options.conflict(e.body); this.status('Two saves need your choice') }
      else this.status('On this device · reconnecting…')
    } finally {
      this.busy = false
      if (generation === this.generation && this.userId && this.ready && (this.state?.dirty || this.state?.pending) && !this.remote) {
        const delay = this.state.pending ? this.retryDelay : 800
        if (this.state.pending) this.retryDelay = Math.min(30000, this.retryDelay * 2)
        this.schedule(delay)
      }
    }
  }
  resolve(useDevice: boolean) {
    if (!this.remote || !this.state) return
    this.state.revision = this.remote.revision; this.state.pending = null; this.state.dirty = useDevice
    if (!useDevice) { this.state.gameState = this.remote.gameState ? restoreGameState(this.remote.gameState) : createGameState(); this.options.apply(this.state.gameState) }
    this.remote = null; this.options.conflict(null); this.ready = true; this.cache()
    if (useDevice) void this.flush(); else this.status('Saved online')
  }
  disconnect() { clearTimeout(this.timer); ++this.generation; this.userId = null; this.ready = false }
}
