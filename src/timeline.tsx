import type { AppState } from './types'
import { formatTime } from './logic'
import { Ico } from './avatars'

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
