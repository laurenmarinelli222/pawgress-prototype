import type { ReactNode } from 'react'

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill="#5B2A9E" />
      <ellipse cx="18" cy="22" rx="7" ry="9" fill="#F4E9FF" />
      <ellipse cx="46" cy="22" rx="7" ry="9" fill="#F4E9FF" />
      <ellipse cx="25" cy="14" rx="5.5" ry="7" fill="#E8D4FF" />
      <ellipse cx="39" cy="14" rx="5.5" ry="7" fill="#E8D4FF" />
      <ellipse cx="32" cy="38" rx="14" ry="13" fill="#F4E9FF" />
      <path
        d="M32 33c-3.2 0-5.6 2.2-5.6 5 0 3.4 3.2 5.8 5.6 7.6 2.4-1.8 5.6-4.2 5.6-7.6 0-2.8-2.4-5-5.6-5z"
        fill="#E45A7C"
      />
    </svg>
  )
}

export function Wordmark({ subtitle }: { subtitle?: string }) {
  return (
    <div className="wordmark">
      <Logo size={34} />
      <div>
        <div className="wordmark-title">Pawgress{subtitle ? ` ${subtitle}` : ''}</div>
      </div>
    </div>
  )
}

type AvatarProps = { name: string; size?: number }

export function PetAvatar({ name, size = 56 }: AvatarProps) {
  const key = name.toLowerCase()
  const map: Record<string, (s: number) => ReactNode> = {
    buddy: Buddy,
    luna: Luna,
    max: Max,
    bella: Bella,
    charlie: Charlie,
    daisy: Daisy,
  }
  const C = map[key] ?? Buddy
  return C(size)
}

function Face({ size, bg, children }: { size: number; bg: string; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className="pet-avatar" aria-hidden="true">
      <circle cx="40" cy="40" r="40" fill={bg} />
      {children}
    </svg>
  )
}

function Buddy(size: number) {
  return (
    <Face size={size} bg="#F3C56B">
      <ellipse cx="18" cy="28" rx="10" ry="14" fill="#E0A84A" />
      <ellipse cx="62" cy="28" rx="10" ry="14" fill="#E0A84A" />
      <circle cx="40" cy="46" r="24" fill="#F7D68A" />
      <circle cx="31" cy="42" r="3.2" fill="#3D2A5C" />
      <circle cx="49" cy="42" r="3.2" fill="#3D2A5C" />
      <ellipse cx="40" cy="50" rx="5" ry="3.4" fill="#6B3A22" />
      <path d="M35 56c3 3.4 7 3.4 10 0" stroke="#6B3A22" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </Face>
  )
}

function Luna(size: number) {
  return (
    <Face size={size} bg="#D9D3E3">
      <path d="M16 36L22 10l16 20" fill="#C9C2D4" />
      <path d="M64 36L58 10L42 30" fill="#C9C2D4" />
      <path d="M22 10l8 18-12 4z" fill="#E8B4C8" />
      <path d="M58 10l-8 18 12 4z" fill="#E8B4C8" />
      <circle cx="40" cy="48" r="22" fill="#E8E4EF" />
      <ellipse cx="31" cy="46" rx="4" ry="5" fill="#3D2A5C" />
      <ellipse cx="49" cy="46" rx="4" ry="5" fill="#3D2A5C" />
      <path d="M40 52l-3 4h6z" fill="#C07A9A" />
      <path d="M40 56v6" stroke="#9A7A8C" strokeWidth="1.4" />
    </Face>
  )
}

function Max(size: number) {
  return (
    <Face size={size} bg="#8B5A3C">
      <ellipse cx="16" cy="32" rx="9" ry="13" fill="#6F432C" />
      <ellipse cx="64" cy="32" rx="9" ry="13" fill="#6F432C" />
      <circle cx="40" cy="48" r="23" fill="#A46A48" />
      <circle cx="31" cy="44" r="3.2" fill="#2B1A12" />
      <circle cx="49" cy="44" r="3.2" fill="#2B1A12" />
      <ellipse cx="40" cy="52" rx="5" ry="3.5" fill="#2B1A12" />
      <path d="M35 58c3 3 7 3 10 0" stroke="#2B1A12" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </Face>
  )
}

function Bella(size: number) {
  return (
    <Face size={size} bg="#F0C48A">
      <path d="M16 38L24 12l16 22" fill="#E07A3D" />
      <path d="M64 38L56 12 42 34" fill="#3D2A5C" />
      <path d="M24 12l7 18-11 5z" fill="#F4A07A" />
      <path d="M56 12l-7 18 11 5z" fill="#5A3A6E" />
      <circle cx="40" cy="50" r="22" fill="#F6D7B0" />
      <path d="M22 42c8-10 16-4 18 0" fill="#3D2A5C" opacity="0.35" />
      <ellipse cx="31" cy="48" rx="3.5" ry="4.5" fill="#3D2A5C" />
      <ellipse cx="49" cy="48" rx="3.5" ry="4.5" fill="#3D2A5C" />
      <path d="M40 54l-2.6 3.4h5.2z" fill="#C45A6A" />
    </Face>
  )
}

function Charlie(size: number) {
  return (
    <Face size={size} bg="#4A4A52">
      <ellipse cx="18" cy="30" rx="10" ry="14" fill="#2F2F36" />
      <ellipse cx="62" cy="30" rx="10" ry="14" fill="#2F2F36" />
      <circle cx="40" cy="48" r="23" fill="#5A5A62" />
      <ellipse cx="40" cy="54" rx="10" ry="12" fill="#F4EFE6" />
      <circle cx="31" cy="44" r="3.2" fill="#1A1A1E" />
      <circle cx="49" cy="44" r="3.2" fill="#1A1A1E" />
      <ellipse cx="40" cy="51" rx="4.5" ry="3.2" fill="#1A1A1E" />
      <path d="M35 58c3 2.8 7 2.8 10 0" stroke="#1A1A1E" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </Face>
  )
}

function Daisy(size: number) {
  return (
    <Face size={size} bg="#F0C878">
      <ellipse cx="18" cy="26" rx="9" ry="13" fill="#F6E2A8" />
      <ellipse cx="62" cy="26" rx="9" ry="13" fill="#F6E2A8" />
      <circle cx="40" cy="46" r="24" fill="#F6D990" />
      <circle cx="31" cy="42" r="3.2" fill="#3D2A5C" />
      <circle cx="49" cy="42" r="3.2" fill="#3D2A5C" />
      <ellipse cx="40" cy="50" rx="4.6" ry="3.2" fill="#8A4E2A" />
      <path d="M34 56c4 4 8 4 12 0" stroke="#8A4E2A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="54" cy="50" r="3.2" fill="#E89AA8" opacity="0.85" />
    </Face>
  )
}

export function StatusPill({ status }: { status: string }) {
  const tone = toneFor(status)
  return <span className={`pill pill-${tone}`}>{status}</span>
}

export function toneFor(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('needs a call') || s.includes('declined')) return 'red'
  if (s.includes('awaiting')) return 'amber'
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

export const Ico = {
  patients: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.5" />
      <path d="M3 19c.5-3 2.5-5 5-5s4.5 2 5 5" />
      <path d="M13 19c.3-2.2 1.6-4 3.5-4 2 0 3.4 1.6 3.5 4" />
    </svg>
  ),
  schedule: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  updates: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5h16v12H7l-3 3V5z" />
    </svg>
  ),
  settings: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5" />
    </svg>
  ),
  pets: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="7" cy="7" r="2.2" />
      <circle cx="12" cy="5.5" r="2.2" />
      <circle cx="17" cy="7" r="2.2" />
      <circle cx="8.5" cy="11.5" r="2" />
      <ellipse cx="13" cy="16" rx="6" ry="5" />
    </svg>
  ),
  account: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19c1.2-3.3 3.6-5 7-5s5.8 1.7 7 5" />
    </svg>
  ),
  bell: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  ),
  heart: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#E45A7C" aria-hidden="true">
      <path d="M12 21s-7-4.6-9.5-9C.6 8.7 2.4 5 6 5c2 0 3.4 1 4 2 0.6-1 2-2 4-2 3.6 0 5.4 3.7 3.5 7-2.5 4.4-9.5 9-9.5 9z" />
    </svg>
  ),
  phone: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3h3l1.5 4-2 1.5a12 12 0 0 0 6 6L17 13l4 1.5V18c0 1-1 3-8 3S3 14 3 12s0-8 4-9z" />
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M5 12l5 5L20 7" />
    </svg>
  ),
  back: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  ),
  camera: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 8h3l2-3h6l2 3h3v11H4V8z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  ),
}
