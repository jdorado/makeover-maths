import { useEffect, useRef, useState } from 'react'
import { createGameState, restoreGameState } from '../game/save.ts'
import type { GameState } from '../game/save.ts'
import { setupParentAuth } from './auth.ts'
import type { ParentAuth } from './auth.ts'
import { CloudSave } from './cloud-save.ts'
import type { RemoteSave } from './cloud-save.ts'
const guestKey = 'makeover-maths:guest:v1'
const storage = { getItem(key: string) { return localStorage.getItem(key) }, setItem(key: string, value: string) { localStorage.setItem(key, value) } }
export function useAccount(apply: (state: GameState) => void) {
  const applyRef = useRef(apply); applyRef.current = apply
  const auth = useRef<ParentAuth | null>(null), cloud = useRef<CloudSave | null>(null)
  const current = useRef<GameState | null>(null), owner = useRef<string | null>(null), ready = useRef(false)
  const [status, setStatus] = useState('Loading your adventure…'), [signedIn, setSignedIn] = useState(false), [authError, setAuthError] = useState(''), [canSignIn, setCanSignIn] = useState(false), [conflict, setConflict] = useState<RemoteSave | null>(null)
  const restore = (state: GameState) => { ready.current = true; current.current = state; applyRef.current(state) }
  useEffect(() => {
    let live = true, unsubscribe: (() => void) | undefined
    const guest = () => {
      let state = createGameState()
      try { const raw = storage.getItem(guestKey); if (raw) state = restoreGameState(JSON.parse(raw)) } catch { /* A damaged guest cache does not become a parent save. */ }
      restore(state); owner.current = null; ready.current = true; setSignedIn(false); setStatus('Guest · saved on this device')
    }
    const saver = new CloudSave({ storage, apply: restore, status: setStatus, conflict: setConflict,
      async request(method, body) {
        const token = await auth.current?.getToken()
        if (!token) throw new Error('Sign in again')
        const response = await fetch('/api/save', { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
        const result = await response.json()
        if (!response.ok) throw Object.assign(new Error(result.error || 'Save failed'), { status: response.status, body: result })
        return result
      } })
    cloud.current = saver; guest()
    const change = async (id: string | null) => {
      if (!live || owner.current === id) return
      ready.current = false; owner.current = id; setSignedIn(!!id)
      if (id) { await saver.connect(id); if (live && owner.current === id) ready.current = true }
      else { saver.disconnect(); setConflict(null); guest() }
    }
    void setupParentAuth().then(async parent => {
      if (!live) return
      auth.current = parent; setCanSignIn(true); unsubscribe = parent.onChange(id => { void change(id) }); await change(parent.userId)
    }).catch(error => { if (live) setAuthError(error instanceof Error ? error.message : 'Parent sign-in is unavailable.') })
    const reconnect = () => { if (saver.userId && !saver.remote) void saver.connect(saver.userId) }
    window.addEventListener('online', reconnect)
    return () => { live = false; unsubscribe?.(); saver.disconnect(); window.removeEventListener('online', reconnect) }
  }, [])
  function save(state: GameState) {
    if (!ready.current || JSON.stringify(current.current) === JSON.stringify(state)) return
    current.current = structuredClone(state)
    if (owner.current) cloud.current?.save(state)
    else { try { storage.setItem(guestKey, JSON.stringify(state)); setStatus('Guest · saved on this device') } catch { setStatus('Device storage unavailable · keep this page open') } }
  }
  return { status, signedIn, authError, canSignIn, conflict, save,
    signIn() { auth.current?.signIn() },
    async signOut() { await cloud.current?.flush(); if (cloud.current?.state?.dirty || cloud.current?.state?.pending) { setAuthError('Your latest changes are still saving. Please wait before signing out.'); return } await auth.current?.signOut() },
    resolve(useDevice: boolean) { cloud.current?.resolve(useDevice) } }
}
