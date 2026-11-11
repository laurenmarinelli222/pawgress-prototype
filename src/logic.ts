export function asset(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}${path.replace(/^\//, '')}`
}

import type { AppState, Pickup, PickupStatus } from './types'

export function reminderMs(settings: AppState['settings']): number {
  if (settings.demoSpeed === 'fast') return 20_000
  return Math.max(1, settings.reminderMinutes) * 60_000
}

export function escalateMs(settings: AppState['settings']): number {
  if (settings.demoSpeed === 'fast') return 40_000
  return Math.max(2, settings.escalateMinutes) * 60_000
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function activePickup(state: AppState, patientId: string): Pickup | undefined {
  const active: PickupStatus[] = [
    'Awaiting Confirmation',
    'Confirmed',
    'Declined',
    'Needs a Call',
  ]
  const list = state.pickups
    .filter((p) => p.patientId === patientId && active.includes(p.status))
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
  return list[0]
}

export function deriveState(state: AppState, now = Date.now()): AppState {
  const rMs = reminderMs(state.settings)
  const eMs = escalateMs(state.settings)
  let changed = false
  const notifications = [...state.notifications]
  const pickups = state.pickups.map((p) => {
    if (p.status !== 'Awaiting Confirmation') return p
    const elapsed = now - new Date(p.requestedAt).getTime()
    const next = { ...p }
    if (elapsed >= eMs) {
      next.status = 'Needs a Call'
      next.needsCallAt = next.needsCallAt ?? new Date(now).toISOString()
      if (!next.reminderSentAt) next.reminderSentAt = new Date(now).toISOString()
      if (!next.staffAlerted) {
        next.staffAlerted = true
        const patient = state.patients.find((x) => x.id === p.patientId)
        notifications.unshift({
          id: uid('n'),
          audience: 'staff',
          title: `${patient?.name ?? 'Patient'} needs a call`,
          body: `${patient?.ownerName ?? 'The owner'} has not confirmed the ${p.proposedTime} pickup. Please call to arrange a new time.`,
          createdAt: new Date(now).toISOString(),
          readBy: [],
          kind: 'alert',
          patientId: p.patientId,
        })
      }
      if (!next.ownerNotifiedReminder) {
        next.ownerNotifiedReminder = true
        const patient = state.patients.find((x) => x.id === p.patientId)
        const ownerId = patient?.ownerId
        notifications.unshift({
          id: uid('n'),
          audience: 'owner',
          ownerId,
          title: `Reminder: confirm ${patient?.name}'s pickup`,
          body: `We haven't heard back about the ${p.proposedTime} pickup time for ${patient?.name}. Please confirm or let us know if you need a different time.`,
          createdAt: new Date(now).toISOString(),
          readBy: [],
          kind: 'reminder',
          patientId: p.patientId,
        })
      }
      changed = true
    } else if (elapsed >= rMs && !next.ownerNotifiedReminder) {
      next.reminderSentAt = new Date(now).toISOString()
      next.ownerNotifiedReminder = true
      const patient = state.patients.find((x) => x.id === p.patientId)
      notifications.unshift({
        id: uid('n'),
        audience: 'owner',
        ownerId: patient?.ownerId,
        title: `Reminder: confirm ${patient?.name}'s pickup`,
        body: `Just a reminder — ${patient?.name} is ready to come home at ${p.proposedTime}. Please confirm or let us know if you need a different time.`,
        createdAt: new Date(now).toISOString(),
        readBy: [],
        kind: 'reminder',
        patientId: p.patientId,
      })
      changed = true
    }
    return next
  })
  if (!changed) return state
  return { ...state, pickups, notifications, version: state.version + 1 }
}

export function pickupCountdown(p: Pickup, settings: AppState['settings'], now = Date.now()): {
  label: string
  remaining: number
  phase: 'reminder' | 'escalate' | 'overdue'
} {
  const elapsed = now - new Date(p.requestedAt).getTime()
  const r = reminderMs(settings)
  const e = escalateMs(settings)
  if (elapsed >= e) return { label: 'Needs a call', remaining: 0, phase: 'overdue' }
  if (elapsed >= r) {
    return { label: `Call if no reply in ${fmtDuration(e - elapsed)}`, remaining: e - elapsed, phase: 'escalate' }
  }
  return { label: `Reminder in ${fmtDuration(r - elapsed)}`, remaining: r - elapsed, phase: 'reminder' }
}

export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60)
  const rem = s % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    return `${h}h ${m % 60}m`
  }
  if (m > 0) return `${m}m ${rem.toString().padStart(2, '0')}s`
  return `${rem}s`
}

export function statusTone(status: string): 'purple' | 'blue' | 'green' | 'amber' | 'red' | 'gray' {
  const s = status.toLowerCase()
  if (s.includes('needs a call') || s.includes('declined') || s.includes('attention')) return 'red'
  if (s.includes('awaiting') || s.includes('pending') || s.includes('reminder')) return 'amber'
  if (
    s.includes('stable') ||
    s.includes('confirmed') ||
    s.includes('completed') ||
    s.includes('resting') ||
    s.includes('eating') ||
    s.includes('ready')
  )
    return 'green'
  if (s.includes('monitor') || s.includes('procedure')) return 'blue'
  if (s.includes('checked in') || s.includes('canceled') || s.includes('cancelled')) return 'gray'
  return 'purple'
}

export async function compressImage(file: File, maxEdge = 1200, quality = 0.7): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImg(url)
    const canvas = document.createElement('canvas')
    let w = img.naturalWidth || img.width
    let h = img.naturalHeight || img.height
    const edge = Math.max(w, h)
    if (edge > maxEdge) {
      const scale = maxEdge / edge
      w = Math.round(w * scale)
      h = Math.round(h * scale)
    }
    canvas.width = Math.max(1, w)
    canvas.height = Math.max(1, h)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

export function formatProposed(date: string, time: string): string {
  try {
    const [y, m, d] = date.split('-').map(Number)
    const dt = new Date(y, (m || 1) - 1, d || 1)
    const label = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    return `${label} at ${time}`
  } catch {
    return `${date} ${time}`
  }
}

export function defaultPickupMessage(name: string, time: string): string {
  return `${name} is ready to come home! Your pickup time is scheduled for ${time}. Please confirm that this works for you.`
}
