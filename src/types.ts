export type StaffRole = 'vet_tech' | 'receptionist' | 'veterinarian' | 'clinic_admin'

export type Permissions = {
  sendUpdates: boolean
  schedulePickup: boolean
  manageConfirmations: boolean
  manageStaff: boolean
  manageSettings: boolean
}

export type Staff = {
  id: string
  name: string
  title: string
  role: StaffRole
  permissions: Permissions
  pending?: boolean
}

export type ContactMethod = 'phone' | 'text' | 'email' | 'app'
export type Sex = 'Male' | 'Female' | 'Unknown'
export type NeuterStatus = 'Spayed' | 'Neutered' | 'Intact' | 'Unknown'
export type WeightUnit = 'lb' | 'kg'
export type AgeMode = 'dob' | 'estimated'

export type AuthorizedPickup = {
  id: string
  name: string
  phone: string
  relationship: string
}

export type StaffNote = {
  id: string
  patientId: string
  body: string
  authorId: string
  authorName: string
  createdAt: string
  updatedAt?: string
}

export type Address = {
  street: string
  city: string
  state: string
  zip: string
}

export type Owner = {
  id: string
  name: string
  petIds: string[]
  phone: string
  phoneSecondary?: string
  email?: string
  address?: Address
  preferredContact?: ContactMethod
  emergencyName?: string
  emergencyPhone?: string
  authorizedPickups?: AuthorizedPickup[]
}

export type Patient = {
  id: string
  name: string
  species: 'dog' | 'cat' | 'other'
  breed: string
  pronouns: { subject: string; object: string; possessive: string }
  visitType: string
  visitId: string
  ownerId: string
  ownerName: string
  currentStatus: string
  lastUpdateAt: string
  lastUpdateBy: string
  lastUpdateById: string
  avatarKey: string
  today: boolean
  patientId: string
  photoUrl?: string
  nickname?: string
  sex?: Sex
  neuterStatus?: NeuterStatus
  coatColor?: string
  markings?: string
  characteristics?: string
  weight?: number
  weightUnit?: WeightUnit
  microchip?: string
  behavioralNotes?: string
  ageMode?: AgeMode
  dateOfBirth?: string
  estimatedAge?: string
  visitReason?: string
  visitDate?: string
  checkInAt?: string
  assignedVetId?: string
  profileEditedBy?: string
  profileEditedAt?: string
}

export type VisitUpdate = {
  id: string
  idempotencyKey: string
  patientId: string
  visitId: string
  templateId: string
  status: string
  message: string
  photoUrl?: string
  senderId: string
  senderName: string
  createdAt: string
}

export type PickupStatus =
  | 'Awaiting Confirmation'
  | 'Confirmed'
  | 'Declined'
  | 'Needs a Call'
  | 'Completed'
  | 'Canceled'

export type Pickup = {
  id: string
  patientId: string
  visitId: string
  proposedDate: string
  proposedTime: string
  proposedAt: string
  instructions: string
  message: string
  status: PickupStatus
  requestedAt: string
  requestedBy: string
  requestedByName: string
  confirmedAt?: string
  declinedAt?: string
  reminderSentAt?: string
  needsCallAt?: string
  completedAt?: string
  canceledAt?: string
  ownerNotifiedReminder?: boolean
  staffAlerted?: boolean
}

export type Notice = {
  id: string
  audience: 'owner' | 'staff'
  ownerId?: string
  title: string
  body: string
  createdAt: string
  readBy: string[]
  kind: 'update' | 'pickup' | 'reminder' | 'alert'
  patientId?: string
}

export type ClinicSettings = {
  reminderMinutes: number
  escalateMinutes: number
  demoSpeed: 'real' | 'fast'
  phone: string
  phoneTel: string
}

export const SCHEMA_VERSION = 2

export type AppState = {
  workspaceId: string
  version: number
  schemaVersion: number
  clinicName: string
  settings: ClinicSettings
  staff: Staff[]
  owners: Owner[]
  patients: Patient[]
  updates: VisitUpdate[]
  pickups: Pickup[]
  notifications: Notice[]
  staffNotes: StaffNote[]
  nextPatientSeq: number
}

export type Session =
  | { kind: 'staff'; staffId: string }
  | { kind: 'owner'; ownerId: string }

export const TEMPLATES: { id: string; label: string; message: (p: Patient) => string }[] = [
  {
    id: 'checked_in',
    label: 'Checked In',
    message: (p) =>
      `${p.name} has been checked in and is settling in with our team. We'll share the next update soon.`,
  },
  {
    id: 'preparing',
    label: 'Preparing for Surgery',
    message: (p) =>
      `${p.name} is being prepared for surgery. ${p.pronouns.subject[0].toUpperCase()}${p.pronouns.subject.slice(1)} is comfortable and our team is with ${p.pronouns.object}.`,
  },
  {
    id: 'procedure_started',
    label: 'Procedure Started',
    message: (p) =>
      `${p.name}'s procedure is underway. Our team will update you as soon as it is complete.`,
  },
  {
    id: 'procedure_completed',
    label: 'Procedure Completed',
    message: (p) =>
      `${p.name}'s procedure is complete. ${p.pronouns.subject[0].toUpperCase()}${p.pronouns.subject.slice(1)} is doing well and heading into recovery.`,
  },
  {
    id: 'in_recovery',
    label: 'In Recovery',
    message: (p) =>
      `${p.name} is in recovery and resting comfortably. We'll continue to monitor ${p.pronouns.object} closely.`,
  },
  {
    id: 'resting',
    label: 'Resting Comfortably',
    message: (p) =>
      `${p.name} is resting comfortably and is stable. Our team is keeping a close eye on ${p.pronouns.object}.`,
  },
  {
    id: 'monitored',
    label: 'Being Monitored',
    message: (p) =>
      `${p.name} is being closely monitored. ${p.pronouns.subject[0].toUpperCase()}${p.pronouns.subject.slice(1)} is stable, and we'll share another update soon.`,
  },
  {
    id: 'eating',
    label: 'Eating / Drinking',
    message: (p) =>
      `Good news — ${p.name} is eating and drinking well. This is a positive sign in ${p.pronouns.possessive} recovery.`,
  },
  {
    id: 'ready',
    label: 'Ready for Pickup',
    message: (p) =>
      `${p.name} is ready to come home! Please watch for a pickup request so you can confirm a time that works for you.`,
  },
]
