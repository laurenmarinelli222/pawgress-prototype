import { useEffect, useRef, useState } from 'react'
import type {
  AgeMode,
  // species
  AppState,
  AuthorizedPickup,
  ContactMethod,
  NeuterStatus,
  Owner,
  Patient,
  Sex,
  Staff,
  StaffNote,
  WeightUnit,
} from './types'
import {
  activePickup,
  asset,
  compressImage,
  copyText,
  formatAddress,
  formatAge,
  formatDateTime,
  formatPrettyDate,
  formatTime,
  generatePatientId,
  isValidEmail,
  isValidPhone,
  nextPatientSeq,
  profilePerms,
  pronounsFromSex,
  telHref,
  uid,
} from './logic'
import { Ico, PetAvatar, StatusPill } from './avatars'
import { Timeline } from './timeline'

const SAMPLE_PHOTOS = [
  { src: asset('samples/sample-resting.svg'), label: 'Resting' },
  { src: asset('samples/sample-monitoring.svg'), label: 'Monitoring' },
  { src: asset('samples/sample-exam.svg'), label: 'After visit' },
]

type Section = 'overview' | 'pet' | 'owner' | 'notes'

export function PatientProfile({
  state,
  staff,
  patientId,
  onSend,
  onPickup,
  onPhoto,
  apply,
  showToast,
}: {
  state: AppState
  staff: Staff
  patientId: string
  onSend: () => void
  onPickup: () => void
  onPhoto: (src: string) => void
  apply: (fn: (s: AppState) => AppState) => void
  showToast: (m: string) => void
}) {
  const [section, setSection] = useState<Section>('overview')
  const p = state.patients.find((x) => x.id === patientId)
  const owner = p ? state.owners.find((o) => o.id === p.ownerId) : undefined
  const perms = profilePerms(staff)
  if (!p) return <div className="scroll">Patient not found.</div>

  return (
    <div className="scroll profile-screen" data-testid="patient-profile">
      <div className="card patient-main profile-hero">
        <ProfilePhoto patient={p} size={64} />
        <div className="patient-info">
          <div className="row space">
            <h3 style={{ margin: 0 }}>
              {p.name}
              {p.nickname ? <span className="nickname"> “{p.nickname}”</span> : null}
            </h3>
            <StatusPill status={p.currentStatus} />
          </div>
          <div className="meta" data-testid="patient-id">
            Patient ID {p.patientId}
          </div>
          <div className="meta">
            {p.breed} · {p.visitType}
          </div>
          <div className="meta">Owner: {p.ownerName}</div>
        </div>
      </div>

      <div className="profile-tabs" role="tablist" aria-label="Patient profile sections">
        <TabBtn id="overview" label="Overview" current={section} onSelect={setSection} />
        <TabBtn id="pet" label="Pet" current={section} onSelect={setSection} />
        <TabBtn id="owner" label="Owner" current={section} onSelect={setSection} />
        <TabBtn id="notes" label="Staff Notes" current={section} onSelect={setSection} />
      </div>

      <p className="role-hint" data-testid="role-hint">
        {perms.hint}
      </p>

      {section === 'overview' && (
        <Overview
          state={state}
          staff={staff}
          patient={p}
          owner={owner}
          perms={perms}
          onSend={onSend}
          onPickup={onPickup}
          onPhoto={onPhoto}
          apply={apply}
          showToast={showToast}
        />
      )}
      {section === 'pet' && (
        <PetSection
          patient={p}
          staff={staff}
          perms={perms}
          apply={apply}
          showToast={showToast}
          onPhoto={onPhoto}
        />
      )}
      {section === 'owner' && (
        <OwnerSection owner={owner} staff={staff} perms={perms} apply={apply} showToast={showToast} patient={p} />
      )}
      {section === 'notes' && (
        <NotesSection state={state} staff={staff} patient={p} apply={apply} showToast={showToast} />
      )}
    </div>
  )
}

function TabBtn({
  id,
  label,
  current,
  onSelect,
}: {
  id: Section
  label: string
  current: Section
  onSelect: (s: Section) => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={current === id}
      className={`profile-tab ${current === id ? 'active' : ''}`}
      data-testid={`profile-tab-${id}`}
      onClick={() => onSelect(id)}
    >
      {label}
    </button>
  )
}

function ProfilePhoto({ patient, size = 56 }: { patient: Patient; size?: number }) {
  if (patient.photoUrl) {
    return <img className="profile-photo" src={patient.photoUrl} alt={patient.name} width={size} height={size} />
  }
  return <PetAvatar name={patient.avatarKey} size={size} />
}

function Overview({
  state,
  staff,
  patient,
  owner,
  perms,
  onSend,
  onPickup,
  onPhoto,
  apply,
  showToast,
}: {
  state: AppState
  staff: Staff
  patient: Patient
  owner?: Owner
  perms: ReturnType<typeof profilePerms>
  onSend: () => void
  onPickup: () => void
  onPhoto: (src: string) => void
  apply: (fn: (s: AppState) => AppState) => void
  showToast: (m: string) => void
}) {
  const pickup = activePickup(state, patient.id)
  const updates = state.updates
    .filter((u) => u.patientId === patient.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const latest = [...updates].reverse()[0]
  const vet = state.staff.find((s) => s.id === patient.assignedVetId)
  const vets = state.staff.filter((s) => s.role === 'veterinarian')
  const [editing, setEditing] = useState(false)
  const [reason, setReason] = useState(patient.visitReason || patient.visitType)
  const [visitDate, setVisitDate] = useState(patient.visitDate || '')
  const [checkIn, setCheckIn] = useState(toLocalInput(patient.checkInAt))
  const [vetId, setVetId] = useState(patient.assignedVetId || '')

  useEffect(() => {
    if (editing) return
    setReason(patient.visitReason || patient.visitType)
    setVisitDate(patient.visitDate || '')
    setCheckIn(toLocalInput(patient.checkInAt))
    setVetId(patient.assignedVetId || '')
  }, [patient, editing])

  const saveVisit = () => {
    apply((s) => ({
      ...s,
      patients: s.patients.map((x) =>
        x.id === patient.id
          ? {
              ...x,
              visitReason: reason.trim() || x.visitType,
              visitDate: visitDate || x.visitDate,
              checkInAt: fromLocalInput(checkIn) || x.checkInAt,
              assignedVetId: vetId || undefined,
              profileEditedBy: staff.name,
              profileEditedAt: new Date().toISOString(),
            }
          : x,
      ),
    }))
    setEditing(false)
    showToast('Saved')
  }

  return (
    <>
      <section className="card visit-card" data-testid="visit-info">
        <div className="row space">
          <h3 className="section-title" style={{ margin: 0 }}>
            Visit information
          </h3>
          {perms.editVisit && !editing && (
            <button className="btn btn-ghost btn-sm" data-testid="edit-visit" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
        </div>
        {editing ? (
          <div className="form-grid">
            <label className="field">
              <span>Reason for visit</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <label className="field">
              <span>Visit date</span>
              <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
            </label>
            <label className="field">
              <span>Check-in time</span>
              <input type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </label>
            <label className="field">
              <span>Assigned veterinarian</span>
              <select value={vetId} onChange={(e) => setVetId(e.target.value)}>
                <option value="">Unassigned</option>
                {vets.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="btn-row">
              <button className="btn btn-primary btn-sm" data-testid="save-visit" onClick={saveVisit}>
                Save
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <dl className="facts">
            <Fact label="Reason for visit" value={patient.visitReason || patient.visitType} />
            <Fact
              label="Visit date"
              value={patient.visitDate ? formatPrettyDate(patient.visitDate) : '—'}
            />
            <Fact label="Check-in" value={patient.checkInAt ? formatDateTime(patient.checkInAt) : '—'} />
            <Fact label="Assigned veterinarian" value={vet?.name || 'Unassigned'} />
            <Fact
              label="Current status"
              value={<StatusPill status={patient.currentStatus} />}
            />
            <Fact
              label="Last update sent"
              value={
                latest
                  ? `${formatTime(latest.createdAt)} by ${latest.senderName} — “${snippet(latest.message)}”`
                  : 'None yet'
              }
            />
            <Fact
              label="Pickup status"
              value={pickup ? <StatusPill status={pickup.status} /> : 'No pickup scheduled'}
            />
          </dl>
        )}
      </section>

      {pickup && (
        <div className="card pickup-card">
          <div className="row space">
            <strong>Pickup</strong>
            <StatusPill status={pickup.status} />
          </div>
          <div className="pickup-time">{pickup.proposedTime}</div>
          <div className="meta">
            {pickup.proposedDate} {pickup.proposedTime}
          </div>
          {(pickup.status === 'Needs a Call' || pickup.status === 'Declined') && (
            <div className="alert-banner" style={{ marginTop: 10 }}>
              {pickup.status === 'Declined' ? `${patient.ownerName} declined this time.` : `${patient.ownerName} hasn't confirmed.`} Call to arrange a new time — don't assign a replacement automatically.
            </div>
          )}
          {(pickup.status === 'Needs a Call' || pickup.status === 'Declined') && owner && (
            <div className="btn-row" style={{ marginTop: 8 }}>
              <a className="btn btn-primary btn-sm" href={telHref(owner.phone)}>
                Call owner
              </a>
              {staff.permissions.schedulePickup && (
                <button className="btn btn-ghost btn-sm" onClick={onPickup}>
                  Schedule a new time
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {latest?.photoUrl && (
        <button className="card" style={{ padding: 0, overflow: 'hidden' }} onClick={() => onPhoto(latest.photoUrl!)}>
          <img className="update-photo" src={latest.photoUrl} alt={`${patient.name} latest photo`} style={{ margin: 0, borderRadius: 20 }} />
        </button>
      )}

      <div className="btn-row" style={{ marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={onSend}>
          + Send Update
        </button>
        {staff.permissions.schedulePickup ? (
          <button className="btn btn-ghost" onClick={onPickup}>
            Schedule Pickup
          </button>
        ) : (
          <button className="btn btn-ghost" disabled title="Only authorized clinical staff can schedule pickup">
            Schedule Pickup
          </button>
        )}
      </div>
      <h3 className="h1">Visit Timeline</h3>
      <Timeline updates={updates} onPhoto={onPhoto} />
    </>
  )
}

function PetSection({
  patient,
  staff,
  perms,
  apply,
  showToast,
  onPhoto,
}: {
  patient: Patient
  staff: Staff
  perms: ReturnType<typeof profilePerms>
  apply: (fn: (s: AppState) => AppState) => void
  showToast: (m: string) => void
  onPhoto: (src: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => petForm(patient))
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!editing) setForm(petForm(patient))
  }, [patient, editing])

  const startEdit = () => {
    setForm(petForm(patient))
    setErrors({})
    setEditing(true)
  }

  const save = () => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Pet name is required.'
    if (!form.species.trim()) next.species = 'Species is required.'
    if (form.weight && Number.isNaN(Number(form.weight))) next.weight = 'Enter a valid weight.'
    setErrors(next)
    if (Object.keys(next).length) return
    const weight = form.weight.trim() ? Number(form.weight) : undefined
    apply((s) => ({
      ...s,
      patients: s.patients.map((x) =>
        x.id === patient.id
          ? {
              ...x,
              name: form.name.trim(),
              photoUrl: form.photoUrl || undefined,
              nickname: form.nickname.trim() || undefined,
              species: form.species,
              breed: form.breed.trim(),
              sex: form.sex,
              neuterStatus: form.neuterStatus,
              coatColor: form.coatColor.trim() || undefined,
              markings: form.markings.trim() || undefined,
              characteristics: form.characteristics.trim() || undefined,
              weight,
              weightUnit: form.weightUnit,
              microchip: form.microchip.trim() || undefined,
              behavioralNotes: form.behavioralNotes.trim() || undefined,
              ageMode: form.ageMode,
              dateOfBirth: form.ageMode === 'dob' ? form.dateOfBirth || undefined : undefined,
              estimatedAge: form.ageMode === 'estimated' ? form.estimatedAge.trim() || undefined : undefined,
              pronouns: pronounsFromSex(form.sex),
              profileEditedBy: staff.name,
              profileEditedAt: new Date().toISOString(),
            }
          : x,
      ),
    }))
    setEditing(false)
    showToast('Saved')
  }

  return (
    <section className="card" data-testid="pet-section">
      <div className="row space">
        <h3 className="section-title" style={{ margin: 0 }}>
          Pet profile
        </h3>
        {perms.editPet && !editing && (
          <button className="btn btn-ghost btn-sm" data-testid="edit-pet" onClick={startEdit}>
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="form-grid">
          <PhotoPicker
            photoUrl={form.photoUrl}
            avatarKey={patient.avatarKey}
            name={form.name || patient.name}
            onChange={(url) => setForm((f) => ({ ...f, photoUrl: url }))}
          />
          <Field label="Pet name" error={errors.name}>
            <input data-testid="field-pet-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <label className="field">
            <span>Patient ID</span>
            <input value={patient.patientId} readOnly />
          </label>
          <Field label="Preferred nickname">
            <input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
          </Field>
          <Field label="Species" error={errors.species}>
            <select data-testid="field-species" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value as Species })}>
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Breed">
            <input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
          </Field>
          <fieldset className="field">
            <legend>Age</legend>
            <div className="row" style={{ gap: 12 }}>
              <label className="check">
                <input
                  type="radio"
                  name="age-mode"
                  checked={form.ageMode === 'dob'}
                  onChange={() => setForm({ ...form, ageMode: 'dob' })}
                />
                Date of birth
              </label>
              <label className="check">
                <input
                  type="radio"
                  name="age-mode"
                  checked={form.ageMode === 'estimated'}
                  onChange={() => setForm({ ...form, ageMode: 'estimated' })}
                />
                Estimated age
              </label>
            </div>
            {form.ageMode === 'dob' ? (
              <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            ) : (
              <input
                placeholder="e.g. About 4 years"
                value={form.estimatedAge}
                onChange={(e) => setForm({ ...form, estimatedAge: e.target.value })}
              />
            )}
          </fieldset>
          <Field label="Sex">
            <select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value as Sex })}>
              <option>Male</option>
              <option>Female</option>
              <option>Unknown</option>
            </select>
          </Field>
          <Field label="Spay / neuter status">
            <select value={form.neuterStatus} onChange={(e) => setForm({ ...form, neuterStatus: e.target.value as NeuterStatus })}>
              <option>Neutered</option>
              <option>Spayed</option>
              <option>Intact</option>
              <option>Unknown</option>
            </select>
          </Field>
          <Field label="Coat color">
            <input value={form.coatColor} onChange={(e) => setForm({ ...form, coatColor: e.target.value })} />
          </Field>
          <Field label="Markings">
            <input value={form.markings} onChange={(e) => setForm({ ...form, markings: e.target.value })} />
          </Field>
          <Field label="Distinguishing physical characteristics">
            <textarea rows={2} value={form.characteristics} onChange={(e) => setForm({ ...form, characteristics: e.target.value })} />
          </Field>
          {perms.editPetClinical && (
            <>
              <div className="field-row">
                <Field label="Weight" error={errors.weight}>
                  <input
                    data-testid="field-weight"
                    inputMode="decimal"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  />
                </Field>
                <Field label="Unit">
                  <select value={form.weightUnit} onChange={(e) => setForm({ ...form, weightUnit: e.target.value as WeightUnit })}>
                    <option value="lb">lb</option>
                    <option value="kg">kg</option>
                  </select>
                </Field>
              </div>
              <Field label="Microchip number (optional)">
                <input data-testid="field-microchip" value={form.microchip} onChange={(e) => setForm({ ...form, microchip: e.target.value })} />
              </Field>
              <Field label="Behavioral notes (staff only)">
                <textarea
                  data-testid="field-behavioral"
                  rows={3}
                  value={form.behavioralNotes}
                  onChange={(e) => setForm({ ...form, behavioralNotes: e.target.value })}
                />
              </Field>
            </>
          )}
          <div className="btn-row">
            <button className="btn btn-primary" data-testid="save-profile" onClick={save}>
              Save
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {patient.photoUrl && (
            <button className="t-thumb" style={{ marginBottom: 12 }} onClick={() => onPhoto(patient.photoUrl!)}>
              <img src={patient.photoUrl} alt="" style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover' }} />
            </button>
          )}
          <dl className="facts">
            <Fact label="Pet name" value={patient.name} />
            <Fact label="Preferred nickname" value={patient.nickname || '—'} />
            <Fact label="Patient ID" value={patient.patientId} />
            <Fact label="Species" value={capitalize(patient.species)} />
            <Fact label="Breed" value={patient.breed || '—'} />
            <Fact label="Age" value={formatAge(patient)} />
            {patient.ageMode === 'dob' && patient.dateOfBirth && (
              <Fact label="Date of birth" value={formatPrettyDate(patient.dateOfBirth)} />
            )}
            <Fact label="Sex" value={patient.sex || '—'} />
            <Fact label="Spay / neuter" value={patient.neuterStatus || '—'} />
            <Fact label="Coat color" value={patient.coatColor || '—'} />
            <Fact label="Markings" value={patient.markings || '—'} />
            <Fact label="Distinguishing characteristics" value={patient.characteristics || '—'} />
            <Fact
              label="Weight"
              value={patient.weight != null ? `${trimNum(patient.weight)} ${patient.weightUnit || 'lb'}` : '—'}
            />
            <Fact label="Microchip" value={patient.microchip || '—'} />
            <Fact label="Behavioral notes (staff only)" value={patient.behavioralNotes || '—'} testId="behavioral-notes" />
          </dl>
        </>
      )}
      <LastEdited by={patient.profileEditedBy} at={patient.profileEditedAt} />
    </section>
  )
}

function OwnerSection({
  owner,
  staff,
  perms,
  apply,
  showToast,
  patient,
}: {
  owner?: Owner
  staff: Staff
  perms: ReturnType<typeof profilePerms>
  apply: (fn: (s: AppState) => AppState) => void
  showToast: (m: string) => void
  patient: Patient
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => ownerForm(owner))
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!editing) setForm(ownerForm(owner))
  }, [owner, editing])

  if (!owner) return <div className="card meta">No owner record on file.</div>

  const copy = async (value: string) => {
    const ok = await copyText(value)
    showToast(ok ? 'Copied' : "Couldn't copy")
  }

  const startEdit = () => {
    setForm(ownerForm(owner))
    setErrors({})
    setEditing(true)
  }

  const save = () => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Owner name is required.'
    if (!form.phone.trim()) next.phone = 'Primary phone is required.'
    else if (!isValidPhone(form.phone)) next.phone = 'Enter a valid phone number.'
    if (form.phoneSecondary && !isValidPhone(form.phoneSecondary)) next.phoneSecondary = 'Enter a valid phone number.'
    if (form.email && !isValidEmail(form.email)) next.email = 'Enter a valid email address.'
    if (form.emergencyPhone && !isValidPhone(form.emergencyPhone)) next.emergencyPhone = 'Enter a valid phone number.'
    form.authorizedPickups.forEach((c, i) => {
      if (c.name && c.phone && !isValidPhone(c.phone)) next[`ap-${i}`] = 'Enter a valid phone number.'
    })
    setErrors(next)
    if (Object.keys(next).length) return
    apply((s) => ({
      ...s,
      owners: s.owners.map((o) =>
        o.id === owner.id
          ? {
              ...o,
              name: form.name.trim(),
              phone: form.phone.trim(),
              phoneSecondary: form.phoneSecondary.trim() || undefined,
              email: form.email.trim() || undefined,
              address: {
                street: form.street.trim(),
                city: form.city.trim(),
                state: form.state.trim(),
                zip: form.zip.trim(),
              },
              preferredContact: form.preferredContact,
              emergencyName: form.emergencyName.trim() || undefined,
              emergencyPhone: form.emergencyPhone.trim() || undefined,
              authorizedPickups: form.authorizedPickups
                .filter((c) => c.name.trim())
                .map((c) => ({ ...c, name: c.name.trim(), phone: c.phone.trim(), relationship: c.relationship.trim() })),
            }
          : o,
      ),
      patients: s.patients.map((x) =>
        x.ownerId === owner.id
          ? { ...x, ownerName: form.name.trim(), profileEditedBy: staff.name, profileEditedAt: new Date().toISOString() }
          : x,
      ),
    }))
    setEditing(false)
    showToast('Saved')
  }

  return (
    <section className="card" data-testid="owner-section">
      <div className="row space">
        <h3 className="section-title" style={{ margin: 0 }}>
          Owner profile
        </h3>
        {perms.editOwner && !editing && (
          <button className="btn btn-ghost btn-sm" data-testid="edit-owner" onClick={startEdit}>
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="form-grid">
          <Field label="Full name" error={errors.name}>
            <input data-testid="field-owner-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Primary phone" error={errors.phone}>
            <input data-testid="field-owner-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Secondary phone (optional)" error={errors.phoneSecondary}>
            <input value={form.phoneSecondary} onChange={(e) => setForm({ ...form, phoneSecondary: e.target.value })} />
          </Field>
          <Field label="Email" error={errors.email}>
            <input data-testid="field-owner-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Street">
            <input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
          </Field>
          <div className="field-row three">
            <Field label="City">
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="State">
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </Field>
            <Field label="ZIP">
              <input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
            </Field>
          </div>
          <Field label="Preferred contact method">
            <select
              value={form.preferredContact}
              onChange={(e) => setForm({ ...form, preferredContact: e.target.value as ContactMethod })}
            >
              <option value="phone">Phone</option>
              <option value="text">Text</option>
              <option value="email">Email</option>
              <option value="app">App</option>
            </select>
          </Field>
          <Field label="Emergency contact name">
            <input value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
          </Field>
          <Field label="Emergency contact phone" error={errors.emergencyPhone}>
            <input value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
          </Field>
          <div className="field">
            <span>Authorized pickup contacts</span>
            {form.authorizedPickups.map((c, i) => (
              <div className="pickup-contact-form" key={c.id}>
                <input
                  placeholder="Name"
                  value={c.name}
                  onChange={(e) => setForm({ ...form, authorizedPickups: form.authorizedPickups.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                />
                <input
                  placeholder="Phone"
                  value={c.phone}
                  onChange={(e) => setForm({ ...form, authorizedPickups: form.authorizedPickups.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)) })}
                />
                <input
                  placeholder="Relationship"
                  value={c.relationship}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      authorizedPickups: form.authorizedPickups.map((x, j) => (j === i ? { ...x, relationship: e.target.value } : x)),
                    })
                  }
                />
                {errors[`ap-${i}`] && <div className="field-error">{errors[`ap-${i}`]}</div>}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setForm({ ...form, authorizedPickups: form.authorizedPickups.filter((_, j) => j !== i) })}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              data-testid="add-pickup-contact"
              onClick={() =>
                setForm({
                  ...form,
                  authorizedPickups: [
                    ...form.authorizedPickups,
                    { id: uid('ap'), name: '', phone: '', relationship: '' },
                  ],
                })
              }
            >
              + Add contact
            </button>
          </div>
          <div className="btn-row">
            <button className="btn btn-primary" data-testid="save-owner" onClick={save}>
              Save
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <dl className="facts">
          <Fact label="Full name" value={owner.name} />
          <ContactFact label="Primary phone" value={owner.phone} kind="phone" onCopy={copy} />
          <ContactFact label="Secondary phone" value={owner.phoneSecondary} kind="phone" onCopy={copy} />
          <ContactFact label="Email" value={owner.email} kind="email" onCopy={copy} />
          <Fact label="Mailing address" value={formatAddress(owner.address) || '—'} />
          <Fact label="Preferred contact" value={contactLabel(owner.preferredContact)} />
          <Fact label="Emergency contact" value={owner.emergencyName || '—'} />
          <ContactFact label="Emergency phone" value={owner.emergencyPhone} kind="phone" onCopy={copy} />
        </dl>
      )}
      {!editing && (owner.authorizedPickups?.length ?? 0) > 0 && (
        <div className="authorized-list">
          <h4 className="section-title">Authorized pickup contacts</h4>
          {owner.authorizedPickups!.map((c) => (
            <div className="authorized-row" key={c.id}>
              <div>
                <strong>{c.name}</strong>
                <div className="meta">
                  {c.relationship}
                  {c.phone ? ` · ${c.phone}` : ''}
                </div>
              </div>
              {c.phone && <ContactActions value={c.phone} kind="phone" onCopy={copy} />}
            </div>
          ))}
        </div>
      )}
      <LastEdited by={patient.profileEditedBy} at={patient.profileEditedAt} />
    </section>
  )
}

function NotesSection({
  state,
  staff,
  patient,
  apply,
  showToast,
}: {
  state: AppState
  staff: Staff
  patient: Patient
  apply: (fn: (s: AppState) => AppState) => void
  showToast: (m: string) => void
}) {
  const notes = state.staffNotes
    .filter((n) => n.patientId === patient.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const canMutate = (n: StaffNote) => n.authorId === staff.id || staff.role === 'clinic_admin'

  const add = () => {
    const text = body.trim()
    if (!text) return
    const now = new Date().toISOString()
    apply((s) => ({
      ...s,
      staffNotes: [
        ...s.staffNotes,
        {
          id: uid('sn'),
          patientId: patient.id,
          body: text,
          authorId: staff.id,
          authorName: staff.name,
          createdAt: now,
        },
      ],
    }))
    setBody('')
    showToast('Note added')
  }

  const saveEdit = (id: string) => {
    const text = editBody.trim()
    if (!text) return
    apply((s) => ({
      ...s,
      staffNotes: s.staffNotes.map((n) =>
        n.id === id ? { ...n, body: text, updatedAt: new Date().toISOString() } : n,
      ),
    }))
    setEditingId(null)
    showToast('Saved')
  }

  const remove = (id: string) => {
    apply((s) => ({ ...s, staffNotes: s.staffNotes.filter((n) => n.id !== id) }))
    showToast('Note deleted')
  }

  return (
    <section className="card staff-notes-card" data-testid="staff-notes-section">
      <div className="staff-only-banner">
        {Ico.lock}
        <div>
          <h3 className="section-title" style={{ margin: 0 }}>
            Private staff notes
          </h3>
          <div className="meta">Staff only — not visible to owners</div>
        </div>
      </div>
      {notes.length === 0 && <p className="meta">No private notes yet.</p>}
      {notes.map((n) => (
        <article className="staff-note" key={n.id} data-testid="staff-note">
          <div className="meta">
            {n.authorName} · {formatDateTime(n.createdAt)}
            {n.updatedAt ? ' · edited' : ''}
          </div>
          {editingId === n.id ? (
            <>
              <textarea rows={3} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
              <div className="btn-row">
                <button className="btn btn-primary btn-sm" onClick={() => saveEdit(n.id)}>
                  Save
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <p style={{ margin: '6px 0 0' }}>{n.body}</p>
          )}
          {canMutate(n) && editingId !== n.id && (
            <div className="btn-row" style={{ marginTop: 8 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setEditingId(n.id)
                  setEditBody(n.body)
                }}
              >
                Edit
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => remove(n.id)}>
                Delete
              </button>
            </div>
          )}
        </article>
      ))}
      <div className="field" style={{ marginTop: 12 }}>
        <span>Add a private note</span>
        <textarea
          data-testid="new-staff-note"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Visible only to staff"
        />
        <button className="btn btn-primary btn-sm" data-testid="add-staff-note" style={{ marginTop: 8 }} onClick={add}>
          Add note
        </button>
      </div>
    </section>
  )
}

export function AddPatientForm({
  staff,
  apply,
  showToast,
  onCreated,
  onCancel,
}: {
  staff: Staff
  apply: (fn: (s: AppState) => AppState) => void
  showToast: (m: string) => void
  onCreated: (id: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState<Species>('dog')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = () => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Pet name is required.'
    if (!species.trim()) next.species = 'Species is required.'
    if (!ownerName.trim()) next.ownerName = 'Owner name is required.'
    if (!phone.trim()) next.phone = 'Primary phone is required.'
    else if (!isValidPhone(phone)) next.phone = 'Enter a valid phone number.'
    setErrors(next)
    if (Object.keys(next).length) return
    const now = new Date().toISOString()
    const ownerId = uid('own')
    const patientInternalId = uid('p')
    const visitId = uid('visit')
    let createdId = patientInternalId
    apply((s) => {
      const seq = nextPatientSeq(s)
      const d = new Date()
      const visitDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return {
        ...s,
        owners: [
          ...s.owners,
          {
            id: ownerId,
            name: ownerName.trim(),
            petIds: [patientInternalId],
            phone: phone.trim(),
            preferredContact: 'phone' as const,
          },
        ],
        patients: [
          ...s.patients,
          {
            id: patientInternalId,
            name: name.trim(),
            species,
            breed: '',
            pronouns: pronounsFromSex(),
            visitType: 'Exam',
            visitReason: 'Exam',
            visitId,
            ownerId,
            ownerName: ownerName.trim(),
            currentStatus: 'Checked In',
            lastUpdateAt: now,
            lastUpdateBy: staff.name,
            lastUpdateById: staff.id,
            avatarKey: species === 'cat' ? 'luna' : 'max',
            today: true,
            patientId: generatePatientId(seq),
            ageMode: 'estimated' as const,
            weightUnit: 'lb' as const,
            visitDate,
            checkInAt: now,
            profileEditedBy: staff.name,
            profileEditedAt: now,
          },
        ],
        nextPatientSeq: seq + 1,
      }
    })
    showToast('Patient added')
    onCreated(createdId)
  }

  return (
    <div className="card add-patient-card" data-testid="add-patient-form">
      <h3 className="section-title">Add patient</h3>
      <div className="form-grid">
        <Field label="Pet name" error={errors.name}>
          <input data-testid="add-pet-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Species" error={errors.species}>
          <select data-testid="add-species" value={species} onChange={(e) => setSpecies(e.target.value as Species)}>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Owner name" error={errors.ownerName}>
          <input data-testid="add-owner-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        </Field>
        <Field label="Primary phone" error={errors.phone}>
          <input data-testid="add-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <div className="btn-row">
          <button className="btn btn-primary" data-testid="add-patient-save" onClick={submit}>
            Add patient
          </button>
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function OwnerPetProfile({
  patient,
  onBack,
  assignedVet,
}: {
  patient: Patient
  onBack: () => void
  assignedVet?: string
}) {
  return (
    <div className="scroll" data-testid="owner-pet-profile">
      <div className="back-row">
        <button className="plain" onClick={onBack} aria-label="Back">
          {Ico.back}
        </button>
        <h2 className="h1" style={{ margin: 0 }}>
          Pet profile
        </h2>
      </div>
      <div className="card patient-main">
        <ProfilePhoto patient={patient} size={64} />
        <div>
          <h3 style={{ margin: 0 }}>
            {patient.name}
            {patient.nickname ? <span className="nickname"> “{patient.nickname}”</span> : null}
          </h3>
          <div className="meta">Patient ID {patient.patientId}</div>
          <StatusPill status={patient.currentStatus} />
        </div>
      </div>
      <section className="card">
        <dl className="facts">
          <Fact label="Preferred nickname" value={patient.nickname || '—'} />
          <Fact label="Species" value={capitalize(patient.species)} />
          <Fact label="Breed" value={patient.breed || '—'} />
          <Fact label="Age" value={formatAge(patient)} />
          {patient.ageMode === 'dob' && patient.dateOfBirth && (
            <Fact label="Date of birth" value={formatPrettyDate(patient.dateOfBirth)} />
          )}
          <Fact label="Sex" value={patient.sex || '—'} />
          <Fact label="Spay / neuter" value={patient.neuterStatus || '—'} />
          <Fact label="Coat color" value={patient.coatColor || '—'} />
          <Fact label="Markings" value={patient.markings || '—'} />
          <Fact
            label="Weight"
            value={patient.weight != null ? `${trimNum(patient.weight)} ${patient.weightUnit || 'lb'}` : '—'}
          />
          {patient.microchip ? <Fact label="Microchip" value={patient.microchip} /> : null}
          <Fact label="Assigned veterinarian" value={assignedVet || '—'} />
          <Fact label="Reason for visit" value={patient.visitReason || patient.visitType} />
        </dl>
      </section>
    </div>
  )
}

function PhotoPicker({
  photoUrl,
  avatarKey,
  name,
  onChange,
}: {
  photoUrl?: string
  avatarKey: string
  name: string
  onChange: (url: string) => void
}) {
  const takeRef = useRef<HTMLInputElement>(null)
  const chooseRef = useRef<HTMLInputElement>(null)
  const onFile = async (file?: File | null) => {
    if (!file) return
    const data = await compressImage(file)
    onChange(data)
  }
  return (
    <div className="photo-picker">
      {photoUrl ? <img className="profile-photo lg" src={photoUrl} alt={name} /> : <PetAvatar name={avatarKey} size={72} />}
      <div className="btn-row">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => takeRef.current?.click()}>
          Take photo
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => chooseRef.current?.click()}>
          Choose photo
        </button>
      </div>
      <div className="sample-row">
        {SAMPLE_PHOTOS.map((s) => (
          <button type="button" key={s.src} className="sample-thumb" onClick={() => onChange(s.src)}>
            <img src={s.src} alt={s.label} />
          </button>
        ))}
      </div>
      <input ref={takeRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={chooseRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && (
        <div className="field-error" data-testid="field-error">
          {error}
        </div>
      )}
    </label>
  )
}

function Fact({ label, value, testId }: { label: string; value: React.ReactNode; testId?: string }) {
  return (
    <div className="fact" data-testid={testId}>
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}

function ContactFact({
  label,
  value,
  kind,
  onCopy,
}: {
  label: string
  value?: string
  kind: 'phone' | 'email'
  onCopy: (v: string) => void
}) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd className="contact-dd">
        <span>{value || '—'}</span>
        {value ? <ContactActions value={value} kind={kind} onCopy={onCopy} /> : null}
      </dd>
    </div>
  )
}

function ContactActions({
  value,
  kind,
  onCopy,
}: {
  value: string
  kind: 'phone' | 'email'
  onCopy: (v: string) => void
}) {
  return (
    <span className="contact-actions">
      {kind === 'phone' && (
        <a className="link-action" data-testid="contact-call" href={telHref(value)}>
          Call
        </a>
      )}
      {kind === 'email' && (
        <a className="link-action" data-testid="contact-email" href={`mailto:${value}`}>
          Email
        </a>
      )}
      <button type="button" className="link-action" data-testid="contact-copy" onClick={() => onCopy(value)}>
        Copy
      </button>
    </span>
  )
}

function LastEdited({ by, at }: { by?: string; at?: string }) {
  if (!by || !at) return null
  return (
    <p className="meta last-edited" data-testid="last-edited">
      Last edited by {by} at {formatDateTime(at)}
    </p>
  )
}

type Species = Patient['species']

function petForm(p: Patient) {
  return {
    name: p.name || '',
    photoUrl: p.photoUrl || '',
    nickname: p.nickname || '',
    species: (p.species || 'dog') as Species,
    breed: p.breed || '',
    sex: (p.sex || 'Unknown') as Sex,
    neuterStatus: (p.neuterStatus || 'Unknown') as NeuterStatus,
    coatColor: p.coatColor || '',
    markings: p.markings || '',
    characteristics: p.characteristics || '',
    weight: p.weight != null ? String(p.weight) : '',
    weightUnit: (p.weightUnit || 'lb') as WeightUnit,
    microchip: p.microchip || '',
    behavioralNotes: p.behavioralNotes || '',
    ageMode: (p.ageMode || 'estimated') as AgeMode,
    dateOfBirth: p.dateOfBirth || '',
    estimatedAge: p.estimatedAge || '',
  }
}

function ownerForm(o?: Owner) {
  return {
    name: o?.name || '',
    phone: o?.phone || '',
    phoneSecondary: o?.phoneSecondary || '',
    email: o?.email || '',
    street: o?.address?.street || '',
    city: o?.address?.city || '',
    state: o?.address?.state || '',
    zip: o?.address?.zip || '',
    preferredContact: (o?.preferredContact || 'phone') as ContactMethod,
    emergencyName: o?.emergencyName || '',
    emergencyPhone: o?.emergencyPhone || '',
    authorizedPickups: (o?.authorizedPickups || []).map((c) => ({ ...c })) as AuthorizedPickup[],
  }
}

function contactLabel(method?: ContactMethod): string {
  if (method === 'phone') return 'Phone'
  if (method === 'text') return 'Text'
  if (method === 'email') return 'Email'
  if (method === 'app') return 'App'
  return '—'
}

function snippet(text: string, n = 72): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function trimNum(n: number): string {
  return String(Math.round(n * 10) / 10)
}

function toLocalInput(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

export function filterPatients(patients: Patient[], query: string): Patient[] {
  const q = query.trim().toLowerCase()
  if (!q) return patients
  return patients.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.ownerName.toLowerCase().includes(q) ||
      (p.patientId || '').toLowerCase().includes(q) ||
      (p.nickname || '').toLowerCase().includes(q),
  )
}
