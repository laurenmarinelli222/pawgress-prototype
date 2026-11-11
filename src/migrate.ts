import { SCHEMA_VERSION, type AppState, type Owner, type Patient } from './types'
import { createSeed } from './seed'
import { generatePatientId, nextPatientSeq } from './logic'

function fillMissing<T extends object>(current: T, defaults: T): T {
  const out = { ...current }
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    if (out[key] === undefined || out[key] === null) {
      out[key] = defaults[key]
    }
  }
  return out
}

export function migrateState(state: AppState): AppState {
  const seed = createSeed()
  const seedPatients = new Map(seed.patients.map((p) => [p.id, p]))
  const seedOwners = new Map(seed.owners.map((o) => [o.id, o]))

  const patients: Patient[] = (state.patients ?? []).map((p, i) => {
    const defaults = seedPatients.get(p.id)
    const merged = defaults ? fillMissing(p, defaults) : p
    return {
      ...merged,
      patientId: merged.patientId || generatePatientId(i + 1),
      weightUnit: merged.weightUnit || 'lb',
      ageMode: merged.ageMode || (merged.dateOfBirth ? 'dob' : 'estimated'),
    }
  })

  const owners: Owner[] = (state.owners ?? []).map((o) => {
    const defaults = seedOwners.get(o.id)
    return defaults ? fillMissing(o, defaults) : o
  })

  const knownStaff = new Set((state.staff ?? []).map((s) => s.id))
  const staff = [...(state.staff ?? [])]
  for (const s of seed.staff) {
    if (!knownStaff.has(s.id)) staff.push(s)
  }

  const staffNotes = state.staffNotes ?? seed.staffNotes

  return {
    ...state,
    clinicName: state.clinicName || seed.clinicName,
    settings: state.settings || seed.settings,
    staff,
    owners,
    patients,
    updates: state.updates ?? [],
    pickups: state.pickups ?? [],
    notifications: state.notifications ?? [],
    staffNotes,
    nextPatientSeq: nextPatientSeq({ ...state, patients, nextPatientSeq: state.nextPatientSeq ?? seed.nextPatientSeq }),
    schemaVersion: SCHEMA_VERSION,
  }
}
