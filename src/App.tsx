import { useEffect, useMemo, useState } from 'react'
import { Logo } from './avatars'
import { OwnerApp } from './owner'
import { requestNotifPermission, StaffApp } from './staff'
import { useAppStore } from './store'
import type { Session } from './types'

export default function App() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('split') === '1') return <SplitDemo />
  return <MainApp />
}

function MainApp() {
  const store = useAppStore()
  const [toast, setToast] = useState<string | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)

  const showToast = (m: string) => {
    setToast(m)
    window.setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    requestNotifPermission()
  }, [])

  if (!store.ready || !store.state) {
    return (
      <div className="app-shell">
        <div className="phone" style={{ display: 'grid', placeItems: 'center' }}>
          <Logo size={64} />
        </div>
      </div>
    )
  }

  const { state, session, apply, reset, login, logout } = store
  const staff = session?.kind === 'staff' ? state.staff.find((s) => s.id === session.staffId) : undefined
  const owner = session?.kind === 'owner' ? state.owners.find((o) => o.id === session.ownerId) : undefined

  return (
    <div className="app-shell">
      <div className="phone">
        {!session && <Welcome state={state} onLogin={login} />}
        {session?.kind === 'staff' && staff && (
          <StaffApp
            state={state}
            staff={staff}
            apply={apply}
            reset={reset}
            onSwitch={logout}
            onPhoto={setPhoto}
            toast={toast}
            showToast={showToast}
          />
        )}
        {session?.kind === 'owner' && owner && (
          <OwnerApp state={state} owner={owner} apply={apply} onSwitch={logout} onPhoto={setPhoto} />
        )}
        {session && !staff && !owner && (
          <div className="scroll">
            <p>This user is no longer in the demo data.</p>
            <button className="btn btn-primary" onClick={logout}>Switch user</button>
          </div>
        )}
        {photo && (
          <div className="lightbox" onClick={() => setPhoto(null)}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPhoto(null)}>Close</button>
            <img src={photo} alt="Update photo" />
          </div>
        )}
      </div>
      <div className="desktop-hint">
        <strong>Pawgress prototype</strong>
        <p>This phone frame is a preview. Open the same link on your phone to test camera and Add to Home Screen.</p>
        <p>
          <a href="/?split=1">Open split demo</a> to see staff and owner side by side.
        </p>
      </div>
    </div>
  )
}

function Welcome({ state, onLogin }: { state: ReturnType<typeof useAppStore>['state']; onLogin: (s: Session) => void }) {
  const [mode, setMode] = useState<'pick' | 'staff' | 'owner'>('pick')
  if (!state) return null
  const loginOwners = state.owners.filter((o) => o.id === 'jamie' || o.id === 'priya')
  return (
    <div className="welcome">
      <div className="hero-logo">
        <Logo size={88} />
      </div>
      <h1>Pawgress</h1>
      <p className="tagline">Less time answering phones. More time caring for patients.</p>
      {mode === 'pick' && (
        <>
          <button className="role-card" data-testid="role-staff" onClick={() => setMode('staff')}>
            <h2>I'm Veterinary Staff</h2>
            <div className="meta">Send updates, photos, and pickup requests</div>
          </button>
          <button className="role-card" data-testid="role-owner" onClick={() => setMode('owner')}>
            <h2>I'm a Pet Owner</h2>
            <div className="meta">Follow your pet's visit and confirm pickup</div>
          </button>
        </>
      )}
      {mode === 'staff' && (
        <div>
          <button className="btn btn-ghost" onClick={() => setMode('pick')} style={{ marginBottom: 12 }}>
            ← Back
          </button>
          <div className="person-list">
            {state.staff.filter((s) => !s.pending).map((s) => (
              <button key={s.id} className="person" data-testid={`staff-${s.id}`} onClick={() => onLogin({ kind: 'staff', staffId: s.id })}>
                {s.name}
                <small>{s.title}</small>
              </button>
            ))}
          </div>
        </div>
      )}
      {mode === 'owner' && (
        <div>
          <button className="btn btn-ghost" onClick={() => setMode('pick')} style={{ marginBottom: 12 }}>
            ← Back
          </button>
          <div className="person-list">
            {loginOwners.map((o) => {
              const pets = state.patients.filter((p) => o.petIds.includes(p.id)).map((p) => p.name).join(', ')
              return (
                <button key={o.id} className="person" data-testid={`owner-${o.id}`} onClick={() => onLogin({ kind: 'owner', ownerId: o.id })}>
                  {o.name}
                  <small>Owner of {pets}</small>
                </button>
              )
            })}
          </div>
        </div>
      )}
      <p className="footer-note">
        Fictional clinic and patients for this prototype.
        <br />
        Prototype: push notifications simulated
      </p>
    </div>
  )
}

function SplitDemo() {
  const wide = useMemo(() => window.innerWidth >= 820, [])
  if (!wide && typeof window !== 'undefined' && window.innerWidth < 820) {
    return (
      <div className="split-page">
        <h1>Split demo</h1>
        <p>This view is designed for a desktop or tablet width. On a phone, use Switch user instead.</p>
        <p><a href="/">Open the app</a></p>
      </div>
    )
  }
  return (
    <div className="split-page">
      <h1>Pawgress split demo</h1>
      <p className="meta" style={{ marginBottom: 16 }}>
        Staff on the left, owner on the right. They share the same demo data in this browser.
      </p>
      <div className="split-frames">
        <iframe title="Staff" src="/?role=staff&user=sarah" />
        <iframe title="Owner" src="/?role=owner&user=jamie" />
      </div>
      <p style={{ textAlign: 'center' }}><a href="/">Back to single view</a></p>
    </div>
  )
}
