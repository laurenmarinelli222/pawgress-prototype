import type { AppState } from './types'

/** Owner-facing projection. Filters at the data layer so private staff notes
 * and other owners' records never reach owner UI or owner-facing selectors. */
export function selectOwnerView(state: AppState, ownerId: string): AppState {
  const owner = state.owners.find((o) => o.id === ownerId)
  const petIds = new Set(owner?.petIds ?? [])
  return {
    ...state,
    staffNotes: [],
    owners: owner ? [owner] : [],
    patients: state.patients
      .filter((p) => petIds.has(p.id))
      .map((p) => {
        const { behavioralNotes: _hidden, ...rest } = p
        return rest
      }),
    updates: state.updates.filter((u) => petIds.has(u.patientId)),
    pickups: state.pickups.filter((pk) => petIds.has(pk.patientId)),
    notifications: state.notifications.filter((n) => n.audience === 'owner' && n.ownerId === ownerId),
  }
}
