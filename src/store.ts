import { useCallback, useEffect, useState } from 'react'
import type { AppState, Session } from './types'
import { createSeed } from './seed'
import { deriveState } from './logic'

const DB_NAME = 'pawgress-demo'
const DB_STORE = 'kv'
const STATE_KEY = 'workspace:pawgress-demo'
const CHANNEL = 'pawgress-demo'
const SESSION_KEY = 'pawgress.session'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(): Promise<AppState | null> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly')
      const q = tx.objectStore(DB_STORE).get(STATE_KEY)
      q.onsuccess = () => resolve((q.result as AppState) ?? null)
      q.onerror = () => reject(q.error)
    })
  } catch {
    try {
      const raw = localStorage.getItem(STATE_KEY)
      return raw ? (JSON.parse(raw) as AppState) : null
    } catch {
      return null
    }
  }
}

async function idbSet(state: AppState): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite')
      tx.objectStore(DB_STORE).put(state, STATE_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state))
    } catch {
      // quota exceeded — keep in-memory only
    }
  }
}

let channel: BroadcastChannel | null = null
function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!channel) channel = new BroadcastChannel(CHANNEL)
  return channel
}

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

function writeSession(session: Session | null) {
  if (!session) sessionStorage.removeItem(SESSION_KEY)
  else sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function useAppStore() {
  const [state, setState] = useState<AppState | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  const persist = useCallback(async (next: AppState, broadcast = true) => {
    const derived = deriveState(next)
    setState(derived)
    await idbSet(derived)
    if (broadcast) getChannel()?.postMessage({ type: 'invalidate' })
  }, [])

  const reload = useCallback(async (broadcast = false) => {
    const existing = await idbGet()
    const base = existing && existing.workspaceId === 'pawgress-demo' ? existing : createSeed()
    const derived = deriveState(base)
    setState(derived)
    if (derived !== base) await idbSet(derived)
    if (broadcast) getChannel()?.postMessage({ type: 'invalidate' })
    return derived
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    let sess = readSession()
    const role = params.get('role')
    const user = params.get('user')
    if (role === 'staff' && user) sess = { kind: 'staff', staffId: user }
    if (role === 'owner' && user) sess = { kind: 'owner', ownerId: user }
    if (sess) {
      writeSession(sess)
      setSession(sess)
    }
    reload().finally(() => setReady(true))
    const ch = getChannel()
    const onMsg = (ev: MessageEvent) => {
      if (ev.data?.type === 'invalidate') reload(false)
    }
    ch?.addEventListener('message', onMsg)
    const onStorage = (e: StorageEvent) => {
      if (e.key === STATE_KEY) reload(false)
    }
    window.addEventListener('storage', onStorage)
    return () => {
      ch?.removeEventListener('message', onMsg)
      window.removeEventListener('storage', onStorage)
    }
  }, [reload])

  useEffect(() => {
    if (!state) return
    const awaiting = state.pickups.some((p) => p.status === 'Awaiting Confirmation')
    if (!awaiting) return
    const t = window.setInterval(() => {
      setState((cur) => {
        if (!cur) return cur
        const next = deriveState(cur)
        if (next === cur) return cur
        void idbSet(next)
        getChannel()?.postMessage({ type: 'invalidate' })
        return next
      })
    }, 1000)
    return () => window.clearInterval(t)
  }, [state?.pickups, state?.settings.demoSpeed, state?.settings.reminderMinutes, state?.settings.escalateMinutes])

  const apply = useCallback((mutator: (current: AppState) => AppState) => {
    setState((cur) => {
      if (!cur) return cur
      const next = deriveState(mutator(cur))
      const bumped = { ...next, version: cur.version + 1 }
      void idbSet(bumped)
      getChannel()?.postMessage({ type: 'invalidate' })
      return bumped
    })
  }, [])

  const reset = useCallback(async () => {
    const seed = createSeed()
    await idbSet(seed)
    setState(seed)
    getChannel()?.postMessage({ type: 'invalidate' })
  }, [])

  const login = useCallback((s: Session) => {
    writeSession(s)
    setSession(s)
  }, [])

  const logout = useCallback(() => {
    writeSession(null)
    setSession(null)
  }, [])

  return { state, session, ready, apply, reset, login, logout, reload: () => reload(false), persist }
}

export type StoreApi = ReturnType<typeof useAppStore>
