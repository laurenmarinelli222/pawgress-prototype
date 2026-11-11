import { useMemo, useRef, useState } from 'react'
import type { AppState, Patient, Session, Staff } from './types'
import { TEMPLATES } from './types'
import {
  activePickup,
  compressImage,
  defaultPickupMessage,
  formatProposed,
  formatTime,
  pickupCountdown,
  uid,
  asset,
} from './logic'
import { Ico, PetAvatar, StatusPill, Wordmark } from './avatars'

type StaffTab = 'patients' | 'pickups' | 'updates' | 'settings'
type StaffView =
  | { name: 'list' }
  | { name: 'detail'; id: string }
  | { name: 'send'; id: string }
  | { name: 'pickup'; id: string }
  | { name: 'manage' }
  | { name: 'notices' }

const SAMPLE_PHOTOS = [
  { src: asset('samples/sample-resting.svg'), label: 'Resting' },
  { src: asset('samples/sample-monitoring.svg'), label: 'Monitoring' },
  { src: asset('samples/sample-exam.svg'), label: 'After visit' },
]

export function StaffApp({
  state,
  staff,
  apply,
  reset,
  onSwitch,
  onPhoto,
  toast,
  showToast,
}: {
  state: AppState
  staff: Staff
  apply: (fn: (s: AppState) => AppState) => void
  reset: () => void
  onSwitch: () => void
  onPhoto: (src: string) => void
  toast: string | null
  showToast: (m: string) => void
}) {
  const [tab, setTab] = useState<StaffTab>('patients')
  const [view, setView] = useState<StaffView>({ name: 'list' })
  const [todayOnly, setTodayOnly] = useState(true)
  const [menu, setMenu] = useState(false)

  const unread = state.notifications.filter((n) => n.audience === 'staff' && !n.readBy.includes(staff.id)).length
  const needsCall = state.pickups.filter((p) => p.status === 'Needs a Call' || p.status === 'Declined')

  const header = (
    <header className="header">
      <div className="header-row">
        {view.name !== 'list' && tab === 'patients' ? (
          <div className="back-row" style={{ margin: 0 }}>
            <button className="plain" onClick={() => setView({ name: 'list' })} aria-label="Back">
              {Ico.back}
            </button>
            <Wordmark subtitle="Vet" />
          </div>
        ) : (
          <div>
            <Wordmark subtitle="Vet" />
            <button className="clinic-select" type="button">
              {state.clinicName}
            </button>
          </div>
        )}
        <div className="row">
          <button
            className="icon-btn"
            aria-label="Notifications"
            onClick={() => {
              setView({ name: 'notices' })
              setTab('settings')
              apply((s) => ({
                ...s,
                notifications: s.notifications.map((n) =>
                  n.audience === 'staff' && !n.readBy.includes(staff.id)
                    ? { ...n, readBy: [...n.readBy, staff.id] }
                    : n,
                ),
              }))
            }}
          >
            {Ico.bell}
            {unread > 0 && <span className="dot" />}
          </button>
          <button className="avatar-btn" onClick={() => setMenu((v) => !v)} aria-label="Account menu">
            {initials(staff.name)}
          </button>
        </div>
      </div>
      {menu && (
        <div className="menu" onMouseLeave={() => setMenu(false)}>
          <div style={{ padding: '8px 12px', fontWeight: 800 }}>{staff.name}</div>
          <div style={{ padding: '0 12px 8px', color: 'var(--muted)', fontSize: 13 }}>{staff.title}</div>
          <button
            onClick={() => {
              setMenu(false)
              onSwitch()
            }}
          >
            Switch user
          </button>
        </div>
      )}
    </header>
  )

  return (
    <div className="screen">
      {header}
      {tab === 'patients' && view.name === 'list' && (
        <List
          state={state}
          todayOnly={todayOnly}
          setTodayOnly={setTodayOnly}
          onOpen={(id) => setView({ name: 'detail', id })}
          onSend={(id) => setView({ name: 'send', id })}
        />
      )}
      {tab === 'patients' && view.name === 'detail' && (
        <Detail
          state={state}
          staff={staff}
          patientId={view.id}
          onSend={() => setView({ name: 'send', id: view.id })}
          onPickup={() => setView({ name: 'pickup', id: view.id })}
          onPhoto={onPhoto}
          apply={apply}
        />
      )}
      {tab === 'patients' && view.name === 'send' && (
        <SendUpdate
          state={state}
          staff={staff}
          patientId={view.id}
          apply={apply}
          onDone={() => {
            showToast('Update saved and sent to owner')
            setView({ name: 'detail', id: view.id })
          }}
        />
      )}
      {tab === 'patients' && view.name === 'pickup' && (
        <SchedulePickup
          state={state}
          staff={staff}
          patientId={view.id}
          apply={apply}
          onDone={() => {
            showToast('Pickup request sent to owner')
            setView({ name: 'detail', id: view.id })
          }}
        />
      )}
      {tab === 'pickups' && (
        <PickupBoard
          state={state}
          staff={staff}
          apply={apply}
          onSchedule={(id) => {
            setTab('patients')
            setView({ name: 'pickup', id })
          }}
        />
      )}
      {tab === 'updates' && <ActivityFeed state={state} onOpen={(id) => { setTab('patients'); setView({ name: 'detail', id }) }} />}
      {tab === 'settings' && view.name === 'manage' && staff.permissions.manageStaff && (
        <StaffManage state={state} apply={apply} onBack={() => setView({ name: 'list' })} />
      )}
      {tab === 'settings' && view.name === 'notices' && (
        <StaffNotices state={state} staffId={staff.id} onOpen={(id) => { setTab('patients'); setView({ name: 'detail', id }) }} />
      )}
      {tab === 'settings' && view.name !== 'manage' && view.name !== 'notices' && (
        <Settings
          state={state}
          staff={staff}
          apply={apply}
          reset={reset}
          onSwitch={onSwitch}
          onManage={() => setView({ name: 'manage' })}
          showToast={showToast}
        />
      )}
      {needsCall.length > 0 && tab === 'pickups' ? null : null}
      {toast && <div className="toast">{toast}</div>}
      {view.name !== 'send' && view.name !== 'pickup' && <nav className="tabbar">
        <button className={`tab ${tab === 'patients' ? 'active' : ''}`} onClick={() => { setTab('patients'); if (view.name === 'manage' || view.name === 'notices') setView({ name: 'list' }) }}>
          {Ico.patients} Patients
        </button>
        <button className={`tab ${tab === 'pickups' ? 'active' : ''}`} onClick={() => { setTab('pickups'); setView({ name: 'list' }) }}>
          {Ico.schedule} Pickups
        </button>
        <button className={`tab ${tab === 'updates' ? 'active' : ''}`} onClick={() => { setTab('updates'); setView({ name: 'list' }) }}>
          {Ico.updates} Updates
        </button>
        <button className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => { setTab('settings'); if (view.name === 'manage' || view.name === 'notices') setView({ name: 'list' }); else setView({ name: 'list' }) }}>
          {Ico.settings} Settings
        </button>
      </nav>}
    </div>
  )
}

function List({
  state,
  todayOnly,
  setTodayOnly,
  onOpen,
  onSend,
}: {
  state: AppState
  todayOnly: boolean
  setTodayOnly: (v: boolean) => void
  onOpen: (id: string) => void
  onSend: (id: string) => void
}) {
  const list = state.patients.filter((p) => (todayOnly ? p.today : true))
  return (
    <>
      <div className="tabs">
        <button className={`seg ${todayOnly ? 'active' : ''}`} onClick={() => setTodayOnly(true)}>
          Patients Today ({state.patients.filter((p) => p.today).length})
        </button>
        <button className={`seg ${!todayOnly ? 'active' : ''}`} onClick={() => setTodayOnly(false)}>
          All Patients
        </button>
      </div>
      <div className="scroll">
        {list.map((p) => {
          const pickup = activePickup(state, p.id)
          return (
            <article key={p.id} className="card patient-card" onClick={() => onOpen(p.id)} role="button">
              <div className="patient-main">
                <PetAvatar name={p.avatarKey} />
                <div className="patient-info">
                  <div className="row space">
                    <h3>{p.name}</h3>
                    <StatusPill status={p.currentStatus} />
                  </div>
                  <div className="meta">{p.visitType}</div>
                  <div className="meta">
                    Last update {formatTime(p.lastUpdateAt)} by {p.lastUpdateBy}
                  </div>
                  {pickup && <div style={{ marginTop: 6 }}><StatusPill status={pickup.status === 'Declined' ? 'Needs a Call' : pickup.status} /></div>}
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={(e) => {
                  e.stopPropagation()
                  onSend(p.id)
                }}
              >
                + Send Update
              </button>
            </article>
          )
        })}
        <p className="footer-note">Prototype: push notifications simulated</p>
      </div>
    </>
  )
}

function Detail({
  state,
  staff,
  patientId,
  onSend,
  onPickup,
  onPhoto,
  apply,
}: {
  state: AppState
  staff: Staff
  patientId: string
  onSend: () => void
  onPickup: () => void
  onPhoto: (src: string) => void
  apply: (fn: (s: AppState) => AppState) => void
}) {
  const p = state.patients.find((x) => x.id === patientId)
  const pickup = p ? activePickup(state, p.id) : undefined
  const updates = state.updates
    .filter((u) => u.patientId === patientId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const latest = [...updates].reverse()[0]
  if (!p) return <div className="scroll">Patient not found.</div>
  const owner = state.owners.find((o) => o.id === p.ownerId)
  return (
    <div className="scroll">
      <div className="card patient-main">
        <PetAvatar name={p.avatarKey} size={64} />
        <div className="patient-info">
          <div className="row space">
            <h3 style={{ margin: 0 }}>{p.name}</h3>
            <StatusPill status={p.currentStatus} />
          </div>
          <div className="meta">{p.breed} · {p.visitType}</div>
          <div className="meta">Owner: {p.ownerName}</div>
          {owner && (
            <a className="meta" href={`tel:${owner.phone.replace(/[^\d+]/g, '')}`} style={{ color: 'var(--purple)' }}>
              {owner.phone}
            </a>
          )}
        </div>
      </div>
      {pickup && (
        <div className={`card pickup-card`}>
          <div className="row space">
            <strong>Pickup</strong>
            <StatusPill status={pickup.status} />
          </div>
          <div className="pickup-time">{pickup.proposedTime}</div>
          <div className="meta">{formatProposed(pickup.proposedDate, pickup.proposedTime)}</div>
          {(pickup.status === 'Needs a Call' || pickup.status === 'Declined') && (
            <div className="alert-banner" style={{ marginTop: 10 }}>
              {pickup.status === 'Declined' ? `${p.ownerName} declined this time.` : `${p.ownerName} hasn't confirmed.`} Call to arrange a new time — don't assign a replacement automatically.
            </div>
          )}
          {(pickup.status === 'Needs a Call' || pickup.status === 'Declined') && owner && (
            <div className="btn-row" style={{ marginTop: 8 }}>
              <a className="btn btn-primary btn-sm" href={`tel:${owner.phone.replace(/[^\d+]/g, '')}`}>
                Call owner
              </a>
              {staff.permissions.schedulePickup && (
                <button className="btn btn-ghost btn-sm" onClick={onPickup}>
                  Schedule a new time
                </button>
              )}
            </div>
          )}
          {pickup.status === 'Awaiting Confirmation' && (
            <div className="meta" style={{ marginTop: 8 }}>{pickupCountdown(pickup, state.settings).label}</div>
          )}
        </div>
      )}
      {latest?.photoUrl && (
        <button className="card" style={{ padding: 0, overflow: 'hidden' }} onClick={() => onPhoto(latest.photoUrl!)}>
          <img className="update-photo" src={latest.photoUrl} alt={`${p.name} latest photo`} style={{ margin: 0, borderRadius: 20 }} />
        </button>
      )}
      <div className="btn-row" style={{ marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={onSend}>+ Send Update</button>
        {staff.permissions.schedulePickup ? (
          <button className="btn btn-ghost" onClick={onPickup}>Schedule Pickup</button>
        ) : (
          <button className="btn btn-ghost" disabled title="Only authorized clinical staff can schedule pickup">
            Schedule Pickup
          </button>
        )}
      </div>
      <h3 className="h1">Visit Timeline</h3>
      <Timeline updates={updates} onPhoto={onPhoto} />
    </div>
  )
}

export function Timeline({
  updates,
  onPhoto,
}: {
  updates: AppState['updates']
  onPhoto: (src: string) => void
}) {
  return (
    <div className="timeline">
      {updates.map((u) => (
        <div className="t-item" key={u.id}>
          <div className="t-dot">{Ico.check}</div>
          <div>
            <div className="row space">
              <strong>{u.status}</strong>
              <span className="meta">{formatTime(u.createdAt)}</span>
            </div>
            <div className="meta">by {u.senderName}</div>
            <div style={{ marginTop: 4 }}>{u.message}</div>
            {u.photoUrl && (
              <button className="t-thumb" onClick={() => onPhoto(u.photoUrl!)}>
                <img src={u.photoUrl} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function SendUpdate({
  state,
  staff,
  patientId,
  apply,
  onDone,
}: {
  state: AppState
  staff: Staff
  patientId: string
  apply: (fn: (s: AppState) => AppState) => void
  onDone: () => void
}) {
  const p = state.patients.find((x) => x.id === patientId)!
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id)
  const [message, setMessage] = useState(TEMPLATES[0].message(p))
  const [photo, setPhoto] = useState<string | undefined>()
  const [confirm, setConfirm] = useState(false)
  const [sending, setSending] = useState(false)
  const idem = useRef(uid('idem'))
  const takeRef = useRef<HTMLInputElement>(null)
  const chooseRef = useRef<HTMLInputElement>(null)

  const selectTemplate = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id)!
    setTemplateId(id)
    setMessage(t.message(p))
  }

  const onFile = async (file?: File | null) => {
    if (!file) return
    const data = await compressImage(file)
    setPhoto(data)
  }

  const send = () => {
    if (!confirm || sending) return
    setSending(true)
    const key = idem.current
    const t = TEMPLATES.find((x) => x.id === templateId)!
    const now = new Date().toISOString()
    apply((s) => {
      if (s.updates.some((u) => u.idempotencyKey === key)) return s
      const update = {
        id: uid('u'),
        idempotencyKey: key,
        patientId: p.id,
        visitId: p.visitId,
        templateId,
        status: t.label,
        message: message.trim(),
        photoUrl: photo,
        senderId: staff.id,
        senderName: staff.name,
        createdAt: now,
      }
      return {
        ...s,
        updates: [...s.updates, update],
        patients: s.patients.map((pt) =>
          pt.id === p.id
            ? { ...pt, currentStatus: t.label, lastUpdateAt: now, lastUpdateBy: staff.name, lastUpdateById: staff.id }
            : pt,
        ),
        notifications: [
          {
            id: uid('n'),
            audience: 'owner' as const,
            ownerId: p.ownerId,
            title: `Update for ${p.name}`,
            body: message.trim() || `${p.name} is ${t.label}.`,
            createdAt: now,
            readBy: [],
            kind: 'update' as const,
            patientId: p.id,
          },
          ...s.notifications,
        ],
      }
    })
    maybeNotify(`Update for ${p.name}`, message.trim())
    onDone()
  }

  return (
    <>
    <div className="scroll has-dock">
      <h2 className="h1">Send Update</h2>
      <div className="meta" style={{ marginBottom: 12 }}>
        {p.name} · {p.visitType}
      </div>
      <div className="section-label">1. Choose Update</div>
      {TEMPLATES.map((t) => (
        <button key={t.id} className={`radio ${templateId === t.id ? 'on' : ''}`} onClick={() => selectTemplate(t.id)}>
          <span className="dot" />
          <span>
            <strong>{t.label}</strong>
          </span>
        </button>
      ))}
      <div className="section-label">2. Add a Message (optional)</div>
      <textarea maxLength={250} value={message} onChange={(e) => setMessage(e.target.value.slice(0, 250))} />
      <div className="counter">{message.length}/250</div>
      <div className="section-label">3. Add a Photo (optional)</div>
      {photo ? (
        <div className="photo-preview">
          <img src={photo} alt="Preview" />
          <button className="x-btn" onClick={() => setPhoto(undefined)} aria-label="Remove photo">
            ×
          </button>
          <div className="btn-row" style={{ marginTop: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => takeRef.current?.click()}>Retake</button>
            <button className="btn btn-ghost btn-sm" onClick={() => chooseRef.current?.click()}>Replace</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPhoto(undefined)}>Remove</button>
          </div>
        </div>
      ) : (
        <div className="photo-box">
          <div className="btn-row">
            <button className="btn btn-ghost btn-sm" onClick={() => takeRef.current?.click()}>{Ico.camera} Take Photo</button>
            <button className="btn btn-ghost btn-sm" onClick={() => chooseRef.current?.click()}>Choose Photo</button>
          </div>
          <div className="meta" style={{ margin: '12px 0 8px' }}>Use sample photo</div>
          <div className="btn-row">
            {SAMPLE_PHOTOS.map((s) => (
              <button key={s.src} className="btn btn-ghost btn-sm" onClick={() => setPhoto(s.src)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <input ref={takeRef} className="hidden-file" type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={chooseRef} className="hidden-file" type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
      <div className="action-dock">
      <label className="check">
        <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
        <span>I confirm this update and photo are accurate and for the correct patient</span>
      </label>
      <button className="btn btn-primary" data-testid="send-update" disabled={!confirm || sending} onClick={send}>
        Send Update
      </button>
      </div>
    </>
  )
}

function SchedulePickup({
  state,
  staff,
  patientId,
  apply,
  onDone,
}: {
  state: AppState
  staff: Staff
  patientId: string
  apply: (fn: (s: AppState) => AppState) => void
  onDone: () => void
}) {
  const p = state.patients.find((x) => x.id === patientId)!
  const existing = activePickup(state, p.id)
  const today = new Date()
  const isoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [date, setDate] = useState(isoDate)
  const [time, setTime] = useState('15:30')
  const prettyTime = useMemo(() => toPrettyTime(time), [time])
  const [instructions, setInstructions] = useState('')
  const [message, setMessage] = useState(defaultPickupMessage(p.name, '3:30 PM'))
  const [confirmReplace, setConfirmReplace] = useState(!existing)
  const [sending, setSending] = useState(false)

  const onTime = (t: string) => {
    setTime(t)
    const pretty = toPrettyTime(t)
    setMessage(defaultPickupMessage(p.name, pretty))
  }

  const send = () => {
    if (sending) return
    if (existing && existing.status !== 'Canceled' && existing.status !== 'Completed' && !confirmReplace) return
    setSending(true)
    const now = new Date().toISOString()
    const pretty = toPrettyTime(time)
    apply((s) => {
      const cancelled = s.pickups.map((pk) => {
        const active = ['Awaiting Confirmation', 'Confirmed', 'Declined', 'Needs a Call'].includes(pk.status)
        if (pk.patientId === p.id && active) {
          return { ...pk, status: 'Canceled' as const, canceledAt: now }
        }
        return pk
      })
      const pickup = {
        id: uid('pk'),
        patientId: p.id,
        visitId: p.visitId,
        proposedDate: date,
        proposedTime: pretty,
        proposedAt: new Date(`${date}T${time}`).toISOString(),
        instructions,
        message: message.trim() || defaultPickupMessage(p.name, pretty),
        status: 'Awaiting Confirmation' as const,
        requestedAt: now,
        requestedBy: staff.id,
        requestedByName: staff.name,
      }
      return {
        ...s,
        pickups: [...cancelled, pickup],
        notifications: [
          {
            id: uid('n'),
            audience: 'owner' as const,
            ownerId: p.ownerId,
            title: `${p.name} is ready to come home`,
            body: `Proposed pickup time: ${pretty}. Please confirm or let us know if you need a different time.`,
            createdAt: now,
            readBy: [],
            kind: 'pickup' as const,
            patientId: p.id,
          },
          ...s.notifications,
        ],
      }
    })
    maybeNotify(`${p.name} is ready to come home`, `Proposed pickup time: ${pretty}`)
    onDone()
  }

  return (
    <>
    <div className="scroll has-dock">
      <h2 className="h1">Schedule Pickup</h2>
      <div className="meta" style={{ marginBottom: 12 }}>{p.name} · {p.ownerName}</div>
      {existing && existing.status !== 'Canceled' && existing.status !== 'Completed' && (
        <div className="alert-banner">
          There is already an active pickup request ({existing.status} for {existing.proposedTime}). Changing the time requires the owner to confirm again.
          <label className="check" style={{ color: 'var(--text)', marginBottom: 0 }}>
            <input type="checkbox" checked={confirmReplace} onChange={(e) => setConfirmReplace(e.target.checked)} />
            <span>Cancel the current request and send a new time</span>
          </label>
        </div>
      )}
      <div className="section-label">Pickup date</div>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <div className="section-label">Proposed time</div>
      <input type="time" value={time} onChange={(e) => onTime(e.target.value)} />
      <div className="section-label">Instructions (optional)</div>
      <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Enter at the side door, bring a leash…" />
      <div className="section-label">Message</div>
      <textarea maxLength={250} value={message} onChange={(e) => setMessage(e.target.value.slice(0, 250))} />
      <div className="counter">{message.length}/250</div>
    </div>
      <div className="action-dock">
      <button
        className="btn btn-primary"
        disabled={sending || !!(existing && existing.status !== 'Canceled' && existing.status !== 'Completed' && !confirmReplace)}
        data-testid="send-pickup"
        onClick={send}
      >
        Send Pickup Request
      </button>
      </div>
    </>
  )
}

function PickupBoard({
  state,
  staff,
  apply,
  onSchedule,
}: {
  state: AppState
  staff: Staff
  apply: (fn: (s: AppState) => AppState) => void
  onSchedule: (patientId: string) => void
}) {
  const rows = [...state.pickups].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
  const alerts = rows.filter((p) => p.status === 'Needs a Call' || p.status === 'Declined')
  return (
    <div className="scroll">
      <h2 className="h1">Pickups</h2>
      {alerts.length > 0 && (
        <div className="alert-banner">{alerts.length} pickup{alerts.length > 1 ? 's' : ''} need follow-up</div>
      )}
      {rows.length === 0 && <div className="card meta">No pickup requests yet. Schedule one from a patient record.</div>}
      {rows.map((pk) => {
        const p = state.patients.find((x) => x.id === pk.patientId)
        const owner = state.owners.find((o) => o.id === p?.ownerId)
        const waiting = pk.status === 'Awaiting Confirmation'
        return (
          <div className="card" key={pk.id}>
            <div className="row space">
              <strong>{p?.name ?? pk.patientId}</strong>
              <StatusPill status={pk.status} />
            </div>
            <div className="meta">{pk.proposedTime} · {p?.ownerName}</div>
            {waiting && <div className="meta">{pickupCountdown(pk, state.settings).label}</div>}
            {(pk.status === 'Needs a Call' || pk.status === 'Declined') && owner && (
              <div className="btn-row" style={{ marginTop: 10 }}>
                <a className="btn btn-primary btn-sm" href={`tel:${owner.phone.replace(/[^\d+]/g, '')}`}>Call owner</a>
                {staff.permissions.schedulePickup && (
                  <button className="btn btn-ghost btn-sm" onClick={() => onSchedule(pk.patientId)}>New time</button>
                )}
              </div>
            )}
            {staff.permissions.manageConfirmations && (pk.status === 'Confirmed' || pk.status === 'Awaiting Confirmation' || pk.status === 'Needs a Call') && (
              <div className="btn-row" style={{ marginTop: 10 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    apply((s) => ({
                      ...s,
                      pickups: s.pickups.map((x) => x.id === pk.id ? { ...x, status: 'Completed' as const, completedAt: new Date().toISOString() } : x),
                    }))
                  }
                >
                  Mark Completed
                </button>
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() =>
                    apply((s) => ({
                      ...s,
                      pickups: s.pickups.map((x) => x.id === pk.id ? { ...x, status: 'Canceled' as const, canceledAt: new Date().toISOString() } : x),
                    }))
                  }
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ActivityFeed({ state, onOpen }: { state: AppState; onOpen: (id: string) => void }) {
  const items = [...state.updates].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <div className="scroll">
      <h2 className="h1">Updates</h2>
      <p className="meta" style={{ marginBottom: 12 }}>Every team member can see updates sent by anyone.</p>
      {items.map((u) => {
        const p = state.patients.find((x) => x.id === u.patientId)
        return (
          <button key={u.id} className="card" style={{ width: '100%', textAlign: 'left' }} onClick={() => onOpen(u.patientId)}>
            <div className="row" style={{ gap: 12 }}>
              {p && <PetAvatar name={p.avatarKey} size={44} />}
              <div style={{ flex: 1 }}>
                <div className="row space">
                  <strong>{p?.name} · {u.status}</strong>
                  <span className="meta">{formatTime(u.createdAt)}</span>
                </div>
                <div className="meta">Sent by {u.senderName}</div>
                <div style={{ marginTop: 4 }}>{u.message}</div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function Settings({
  state,
  staff,
  apply,
  reset,
  onSwitch,
  onManage,
  showToast,
}: {
  state: AppState
  staff: Staff
  apply: (fn: (s: AppState) => AppState) => void
  reset: () => void
  onSwitch: () => void
  onManage: () => void
  showToast: (m: string) => void
}) {
  return (
    <div className="scroll">
      <h2 className="h1">Settings</h2>
      <div className="card">
        <div className="meta">Signed in as</div>
        <strong>{staff.name}</strong>
        <div className="meta">{staff.title}</div>
        <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={onSwitch}>
          Switch user
        </button>
      </div>
      <div className="section-label">Demo speed</div>
      <div className="switch">
        <button
          className={state.settings.demoSpeed === 'real' ? 'on' : ''}
          onClick={() => apply((s) => ({ ...s, settings: { ...s.settings, demoSpeed: 'real' } }))}
        >
          Real (15 / 30 min)
        </button>
        <button
          className={state.settings.demoSpeed === 'fast' ? 'on' : ''}
          onClick={() => apply((s) => ({ ...s, settings: { ...s.settings, demoSpeed: 'fast' } }))}
        >
          Fast demo (20s / 40s)
        </button>
      </div>
      <p className="meta" style={{ marginTop: 8 }}>
        In Fast demo, unanswered pickup requests remind the owner after 20 seconds and alert staff after 40 seconds. Status is computed from timestamps, so it still works if this screen is closed.
      </p>
      {staff.permissions.manageSettings && (
        <div className="card" style={{ marginTop: 16 }}>
          <strong>Reminder timing (Real mode)</strong>
          <div className="section-label">Remind owner after (minutes)</div>
          <input
            type="number"
            min={1}
            value={state.settings.reminderMinutes}
            onChange={(e) => apply((s) => ({ ...s, settings: { ...s.settings, reminderMinutes: Math.max(1, Number(e.target.value) || 1) } }))}
          />
          <div className="section-label">Mark "Needs a Call" after (minutes)</div>
          <input
            type="number"
            min={2}
            value={state.settings.escalateMinutes}
            onChange={(e) => apply((s) => ({ ...s, settings: { ...s.settings, escalateMinutes: Math.max(2, Number(e.target.value) || 2) } }))}
          />
        </div>
      )}
      {staff.permissions.manageStaff && (
        <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={onManage}>
          Staff management
        </button>
      )}
      <button
        className="btn btn-ghost"
        style={{ marginTop: 12 }}
        onClick={() => {
          if (confirm('Reset all demo data back to the starting patients and timeline?')) {
            reset()
            showToast('Demo data reset')
          }
        }}
      >
        Reset demo data
      </button>
      <p className="footer-note">
        Clinic phone: {state.settings.phone}
        <br />
        Prototype: push notifications simulated. Shared state stays in this browser so you can switch roles on the same phone.
      </p>
    </div>
  )
}

function StaffManage({
  state,
  apply,
  onBack,
}: {
  state: AppState
  apply: (fn: (s: AppState) => AppState) => void
  onBack: () => void
}) {
  const [name, setName] = useState('')
  const [title, setTitle] = useState('Vet Tech')
  const [sent, setSent] = useState('')
  return (
    <div className="scroll">
      <div className="back-row">
        <button className="plain" onClick={onBack} aria-label="Back">{Ico.back}</button>
        <h2 className="h1" style={{ margin: 0 }}>Staff management</h2>
      </div>
      {state.staff.map((st) => (
        <div className="card" key={st.id}>
          <div className="row space">
            <div>
              <strong>{st.name}</strong>
              <div className="meta">{st.title}{st.pending ? ' · Invited (pending)' : ''}</div>
            </div>
          </div>
          {(['sendUpdates', 'schedulePickup', 'manageConfirmations', 'manageStaff', 'manageSettings'] as const).map((key) => (
            <label className="toggle-row" key={key}>
              <span>{labelPerm(key)}</span>
              <input
                type="checkbox"
                checked={st.permissions[key]}
                onChange={(e) =>
                  apply((s) => ({
                    ...s,
                    staff: s.staff.map((x) =>
                      x.id === st.id ? { ...x, permissions: { ...x.permissions, [key]: e.target.checked } } : x,
                    ),
                  }))
                }
              />
            </label>
          ))}
        </div>
      ))}
      <div className="card">
        <strong>Invite staff</strong>
        <div className="section-label">Name</div>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        <div className="section-label">Role</div>
        <select value={title} onChange={(e) => setTitle(e.target.value)}>
          <option>Vet Tech</option>
          <option>Receptionist</option>
          <option>Veterinarian</option>
          <option>Clinic Administrator</option>
        </select>
        <button
          className="btn btn-primary"
          style={{ marginTop: 12 }}
          onClick={() => {
            if (!name.trim()) return
            const id = uid('staff')
            apply((s) => ({
              ...s,
              staff: [
                ...s.staff,
                {
                  id,
                  name: name.trim(),
                  title,
                  role: title === 'Veterinarian' ? 'veterinarian' : title === 'Clinic Administrator' ? 'clinic_admin' : title === 'Receptionist' ? 'receptionist' : 'vet_tech',
                  pending: true,
                  permissions: {
                    sendUpdates: true,
                    schedulePickup: title === 'Veterinarian' || title === 'Clinic Administrator',
                    manageConfirmations: true,
                    manageStaff: title === 'Clinic Administrator',
                    manageSettings: title === 'Clinic Administrator',
                  },
                },
              ],
            }))
            setSent(`Invite sent to ${name.trim()} (simulated)`)
            setName('')
          }}
        >
          Send invite
        </button>
        {sent && <div className="ok-banner" style={{ marginTop: 10 }}>{sent}</div>}
      </div>
    </div>
  )
}

function StaffNotices({ state, staffId, onOpen }: { state: AppState; staffId: string; onOpen: (id: string) => void }) {
  const items = state.notifications.filter((n) => n.audience === 'staff').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <div className="scroll">
      <h2 className="h1">Notifications</h2>
      {items.length === 0 && <div className="card meta">No staff alerts yet.</div>}
      {items.map((n) => (
        <button key={n.id} className={`notice ${n.readBy.includes(staffId) ? '' : 'unread'}`} onClick={() => n.patientId && onOpen(n.patientId)} style={{ width: '100%', textAlign: 'left' }}>
          <strong>{n.title}</strong>
          <div className="meta">{formatTime(n.createdAt)}</div>
          <div>{n.body}</div>
        </button>
      ))}
    </div>
  )
}

function initials(name: string) {
  return name
    .replace('Admin ', '')
    .replace('Dr. ', '')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function labelPerm(key: string) {
  return {
    sendUpdates: 'Send routine updates',
    schedulePickup: 'Schedule pickup',
    manageConfirmations: 'Manage confirmations',
    manageStaff: 'Manage staff',
    manageSettings: 'Edit clinic settings',
  }[key] ?? key
}

function toPrettyTime(hhmm: string) {
  const [hStr, mStr] = hhmm.split(':')
  let h = Number(hStr)
  const m = mStr ?? '00'
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ap}`
}

function maybeNotify(title: string, body: string) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(120)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  } catch {
    /* ignore */
  }
}

export function requestNotifPermission() {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  } catch {
    /* ignore */
  }
}

export function parseStaffSession(session: Session, state: AppState): Staff | undefined {
  if (session.kind !== 'staff') return
  return state.staff.find((s) => s.id === session.staffId)
}
