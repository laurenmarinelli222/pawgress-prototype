import { useState } from 'react'
import type { AppState, Owner } from './types'
import { activePickup, formatTime } from './logic'
import { Ico, PetAvatar, StatusPill, Wordmark } from './avatars'
import { Timeline } from './timeline'
import { OwnerPetProfile } from './profile'

type OwnerTab = 'updates' | 'pets' | 'account' | 'notices'

export function OwnerApp({
  state,
  owner,
  apply,
  onSwitch,
  onPhoto,
}: {
  state: AppState
  owner: Owner
  apply: (fn: (s: AppState) => AppState) => void
  onSwitch: () => void
  onPhoto: (src: string) => void
}) {
  const pets = state.patients.filter((p) => owner.petIds.includes(p.id))
  const [petId, setPetId] = useState(pets[0]?.id ?? '')
  const [tab, setTab] = useState<OwnerTab>('updates')
  const [menu, setMenu] = useState(false)
  const [showPetProfile, setShowPetProfile] = useState(false)
  const pet = pets.find((p) => p.id === petId) ?? pets[0]
  const unread = state.notifications.filter(
    (n) => n.audience === 'owner' && n.ownerId === owner.id && !n.readBy.includes(owner.id),
  ).length

  const markRead = () =>
    apply((s) => ({
      ...s,
      notifications: s.notifications.map((n) =>
        n.audience === 'owner' && n.ownerId === owner.id && !n.readBy.includes(owner.id)
          ? { ...n, readBy: [...n.readBy, owner.id] }
          : n,
      ),
    }))

  return (
    <div className="screen">
      <header className="header">
        <div className="header-row">
          <div>
            <Wordmark />
            <div className="meta">{state.clinicName}</div>
          </div>
          <div className="row">
            <button
              className="icon-btn"
              aria-label="Notifications"
              onClick={() => {
                setTab('notices')
                markRead()
              }}
            >
              {Ico.bell}
              {unread > 0 && <span className="dot" />}
            </button>
            <button className="avatar-btn" onClick={() => setMenu((v) => !v)} aria-label="Account menu">
              {owner.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
            </button>
          </div>
        </div>
        {menu && (
          <div className="menu">
            <div style={{ padding: '8px 12px', fontWeight: 800 }}>{owner.name}</div>
            <button onClick={onSwitch}>Switch user</button>
          </div>
        )}
      </header>

      {tab === 'updates' && pet && (
        <Updates
          state={state}
          owner={owner}
          pets={pets}
          petId={pet.id}
          setPetId={setPetId}
          apply={apply}
          onPhoto={onPhoto}
          onOpenProfile={() => { setShowPetProfile(true); setTab('pets') }}
        />
      )}
      {tab === 'pets' && showPetProfile && pet && (
        <OwnerPetProfile
          patient={pet}
          assignedVet={state.staff.find((s) => s.id === pet.assignedVetId)?.name}
          onBack={() => setShowPetProfile(false)}
        />
      )}
      {tab === 'pets' && !showPetProfile && (
        <MyPets
          pets={pets}
          onOpenProfile={(id) => { setPetId(id); setShowPetProfile(true) }}
          onOpenUpdates={(id) => { setPetId(id); setTab('updates') }}
        />
      )}
      {tab === 'account' && <Account state={state} owner={owner} pets={pets} onSwitch={onSwitch} />}
      {tab === 'notices' && (
        <OwnerNotices
          state={state}
          owner={owner}
          onOpen={(id) => {
            if (id) setPetId(id)
            setTab('updates')
          }}
        />
      )}

      <nav className="tabbar owner">
        <button className={`tab ${tab === 'updates' ? 'active' : ''}`} onClick={() => setTab('updates')}>
          {Ico.updates} Updates
        </button>
        <button className={`tab ${tab === 'pets' ? 'active' : ''}`} onClick={() => { setTab('pets'); setShowPetProfile(false) }}>
          {Ico.pets} My Pets
        </button>
        <button className={`tab ${tab === 'account' ? 'active' : ''}`} onClick={() => setTab('account')}>
          {Ico.account} Account
        </button>
      </nav>
    </div>
  )
}

function Updates({
  state,
  owner,
  pets,
  petId,
  setPetId,
  apply,
  onPhoto,
  onOpenProfile,
}: {
  state: AppState
  owner: Owner
  pets: AppState['patients']
  petId: string
  setPetId: (id: string) => void
  apply: (fn: (s: AppState) => AppState) => void
  onPhoto: (src: string) => void
  onOpenProfile: () => void
}) {
  const pet = pets.find((p) => p.id === petId)!
  const updates = state.updates
    .filter((u) => u.patientId === pet.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const latest = [...updates].reverse()[0]
  const pickup = activePickup(state, pet.id)

  const respond = (kind: 'confirm' | 'decline') => {
    const now = new Date().toISOString()
    apply((s) => ({
      ...s,
      pickups: s.pickups.map((pk) =>
        pk.id === pickup?.id
          ? kind === 'confirm'
            ? { ...pk, status: 'Confirmed' as const, confirmedAt: now }
            : { ...pk, status: 'Declined' as const, declinedAt: now, staffAlerted: true }
          : pk,
      ),
      notifications: [
        {
          id: `n-${Date.now()}`,
          audience: 'staff' as const,
          title: kind === 'confirm' ? `${pet.name} pickup confirmed` : `${pet.name} pickup declined`,
          body:
            kind === 'confirm'
              ? `${owner.name} confirmed pickup for ${pickup?.proposedTime}.`
              : `${owner.name} can't make the ${pickup?.proposedTime} pickup. Call to arrange a new time.`,
          createdAt: now,
          readBy: [],
          kind: 'alert' as const,
          patientId: pet.id,
        },
        ...s.notifications,
      ],
    }))
    try {
      if (navigator.vibrate) navigator.vibrate(80)
    } catch { /* ignore */ }
  }

  return (
    <div className="scroll">
      {pets.length > 1 && (
        <div className="switch" style={{ marginBottom: 12 }}>
          {pets.map((p) => (
            <button key={p.id} className={p.id === pet.id ? 'on' : ''} onClick={() => setPetId(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      )}
      <div className="row space" style={{ marginBottom: 8, alignItems: 'center' }}>
        <div className="meta">
          {pet.breed} · {pet.visitType} – Today
        </div>
        <button className="plain-link" data-testid="open-owner-pet-profile" onClick={onOpenProfile}>
          Pet profile
        </button>
      </div>

      {pickup && (pickup.status === 'Awaiting Confirmation' || pickup.status === 'Needs a Call') && (
        <div className="card pickup-card">
          <div className="kicker" style={{ fontWeight: 800, fontSize: 18 }}>
            {pet.name} is ready to come home!
          </div>
          <div className="meta">Proposed Pickup Time</div>
          <div className="pickup-time">{pickup.proposedTime}</div>
          <p style={{ marginTop: 0 }}>{pickup.message}</p>
          {pickup.instructions && <div className="meta">Note: {pickup.instructions}</div>}
          <button className="btn btn-primary" data-testid="confirm-pickup" onClick={() => respond('confirm')}>
            Confirm Pickup
          </button>
          <button className="btn btn-outline-danger" style={{ marginTop: 8 }} data-testid="decline-pickup" onClick={() => respond('decline')}>
            I can't make this time
          </button>
        </div>
      )}
      {pickup?.status === 'Confirmed' && (
        <div className="ok-banner">
          Pickup confirmed for {pickup.proposedTime}. We look forward to seeing you!
        </div>
      )}
      {pickup?.status === 'Declined' && (
        <div className="card">
          <strong>We'll be in touch shortly.</strong>
          <p className="meta">The clinic will call you to choose a different pickup time. We won't assign a new time automatically.</p>
        </div>
      )}

      <div className="status-hero">
        <div className="kicker">
          {Ico.heart} {pet.currentStatus}
        </div>
        {latest && <div className="meta">Updated {formatTime(latest.createdAt)}</div>}
        {latest && <p style={{ marginBottom: 0 }}>{latest.message}</p>}
        {latest?.photoUrl && (
          <button style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }} onClick={() => onPhoto(latest.photoUrl!)}>
            <img className="update-photo" src={latest.photoUrl} alt={`${pet.name}`} />
          </button>
        )}
      </div>

      <h3 className="h1">Visit Timeline</h3>
      <Timeline updates={updates} onPhoto={onPhoto} />

      <div className="card" style={{ marginTop: 8 }}>
        <div className="row space">
          <div>
            <div className="meta">Need us right away?</div>
            <strong>{state.settings.phone}</strong>
          </div>
          <a className="btn btn-primary btn-sm" href={`tel:${state.settings.phoneTel}`}>
            {Ico.phone} Call clinic
          </a>
        </div>
      </div>
      <p className="footer-note">Prototype: push notifications simulated</p>
    </div>
  )
}

function MyPets({
  pets,
  onOpenProfile,
  onOpenUpdates,
}: {
  pets: AppState['patients']
  onOpenProfile: (id: string) => void
  onOpenUpdates: (id: string) => void
}) {
  return (
    <div className="scroll">
      <h2 className="h1">My Pets</h2>
      {pets.map((p) => (
        <div key={p.id} className="card" style={{ width: '100%', textAlign: 'left' }}>
          <button className="plain-block" data-testid={`owner-pet-card-${p.id}`} onClick={() => onOpenProfile(p.id)}>
            <div className="patient-main">
              {p.photoUrl ? (
                <img className="profile-photo" src={p.photoUrl} alt={p.name} width={48} height={48} />
              ) : (
                <PetAvatar name={p.avatarKey} />
              )}
              <div>
                <div className="row space">
                  <h3 style={{ margin: 0 }}>{p.name}</h3>
                  <StatusPill status={p.currentStatus} />
                </div>
                <div className="meta">{p.breed}</div>
                <div className="meta">{p.visitType} – Today</div>
              </div>
            </div>
          </button>
          <div className="btn-row" style={{ marginTop: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => onOpenProfile(p.id)}>
              Pet profile
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => onOpenUpdates(p.id)}>
              View updates
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Account({
  state,
  owner,
  pets,
  onSwitch,
}: {
  state: AppState
  owner: Owner
  pets: AppState['patients']
  onSwitch: () => void
}) {
  return (
    <div className="scroll">
      <h2 className="h1">Account</h2>
      <div className="card" data-testid="owner-account">
        <strong>{owner.name}</strong>
        <div className="meta">{pets.map((p) => p.name).join(', ')}</div>
        <dl className="facts" style={{ marginTop: 12 }}>
          <div className="fact">
            <dt>Phone</dt>
            <dd>{owner.phone}</dd>
          </div>
          <div className="fact">
            <dt>Email</dt>
            <dd>{owner.email || '—'}</dd>
          </div>
        </dl>
        <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={onSwitch}>
          Switch user
        </button>
      </div>
      <div className="card">
        <div className="meta">Clinic</div>
        <strong>{state.clinicName}</strong>
        <div className="meta">{state.settings.phone}</div>
        <a className="btn btn-primary" style={{ marginTop: 12 }} href={`tel:${state.settings.phoneTel}`}>
          Call clinic
        </a>
      </div>
      <p className="footer-note">
        Add Pawgress to your Home Screen from your browser share menu for a full-screen icon.
        <br />
        Prototype: push notifications simulated
      </p>
    </div>
  )
}

function OwnerNotices({
  state,
  owner,
  onOpen,
}: {
  state: AppState
  owner: Owner
  onOpen: (id?: string) => void
}) {
  const items = state.notifications
    .filter((n) => n.audience === 'owner' && n.ownerId === owner.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <div className="scroll">
      <h2 className="h1">Notifications</h2>
      {items.length === 0 && <div className="card meta">You're all caught up.</div>}
      {items.map((n) => (
        <button
          key={n.id}
          className={`notice ${n.readBy.includes(owner.id) ? '' : 'unread'}`}
          style={{ width: '100%', textAlign: 'left' }}
          onClick={() => onOpen(n.patientId)}
        >
          <strong>{n.title}</strong>
          <div className="meta">{formatTime(n.createdAt)}</div>
          <div>{n.body}</div>
        </button>
      ))}
    </div>
  )
}
