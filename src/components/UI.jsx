import { useState } from 'react'
import { AVATAR_BG, AVATAR_TX, getAvatarIndex, getInitials } from '../data/constants'

export function Avatar({ name, size = 38 }) {
  const idx = getAvatarIndex(name)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: AVATAR_BG[idx], color: AVATAR_TX[idx],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 500, fontSize: size * 0.37, flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  )
}

export function Badge({ children, variant = 'teal' }) {
  const styles = {
    teal:   { background: '#E1F5EE', color: '#0F6E56' },
    amber:  { background: '#FAEEDA', color: '#854F0B' },
    green:  { background: '#EAF3DE', color: '#27500A' },
    blue:   { background: '#E6F1FB', color: '#0C447C' },
    red:    { background: '#FCEBEB', color: '#791F1F' },
    purple: { background: '#EEEDFE', color: '#3C3489' },
    coral:  { background: '#FAECE7', color: '#712B13' },
    navy:   { background: '#F5E6E8', color: '#7A1020' },
  }
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 500,
      padding: '3px 9px', borderRadius: 20, ...styles[variant],
    }}>
      {children}
    </span>
  )
}

export function AdminBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: '#EEEDFE', color: '#3C3489', fontSize: 12,
      fontWeight: 500, padding: '3px 9px', borderRadius: 20,
    }}>
      ✦ Admin
    </span>
  )
}

export function ProgressBar({ value }) {
  return (
    <div style={{ background: 'var(--color-bg-secondary,#f3f4f6)', borderRadius: 4, height: 7, overflow: 'hidden', margin: '6px 0' }}>
      <div style={{ height: '100%', background: '#7A1020', borderRadius: 4, width: `${Math.min(100, value)}%`, transition: 'width .4s' }} />
    </div>
  )
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)',
      borderRadius: 12, padding: '1.25rem', ...style,
    }}>
      {children}
    </div>
  )
}

export function Btn({ children, variant = 'default', size = 'md', onClick, disabled, style, type = 'button' }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
    border: '0.5px solid', borderRadius: 8, transition: 'opacity .15s',
    opacity: disabled ? 0.55 : 1, fontFamily: 'inherit',
  }
  const sizes = {
    md: { padding: '8px 16px', fontSize: 14 },
    sm: { padding: '5px 12px', fontSize: 12 },
    xs: { padding: '3px 8px',  fontSize: 12 },
  }
  const variants = {
    default: { background: '#fff', color: '#111', borderColor: 'rgba(0,0,0,0.2)' },
    primary: { background: '#7A1020', color: '#fff', borderColor: '#7A1020' },
    teal:    { background: '#0F6E56', color: '#fff', borderColor: '#0F6E56' },
    purple:  { background: '#534AB7', color: '#fff', borderColor: '#534AB7' },
    danger:  { background: '#A32D2D', color: '#fff', borderColor: '#A32D2D' },
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
    >
      {children}
    </button>
  )
}

export function AlertBanner({ type, children }) {
  const styles = {
    overdue:  { background: '#FCEBEB', color: '#791F1F' },
    upcoming: { background: '#FAEEDA', color: '#633806' },
  }
  return (
    <div style={{
      ...styles[type], borderRadius: 8, padding: '9px 13px',
      fontSize: 13, fontWeight: 500, marginBottom: 7,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {children}
    </div>
  )
}

export function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: '2rem', color: '#888', fontSize: 14 }}>
      Loading…
    </div>
  )
}

export function ErrorMsg({ children }) {
  return <p style={{ color: '#A32D2D', fontSize: 12, marginTop: 4 }}>{children}</p>
}

export function SuccessMsg({ children }) {
  return <p style={{ color: '#0F6E56', fontSize: 12, marginTop: 4 }}>{children}</p>
}

export function RALogo({ size = 120 }) {
  return (
    <div style={{ background: '#7A1020', borderRadius: 10, padding: '12px 24px', display: 'inline-block', margin: '0 auto' }}>
      <img
        src="/logo-ritsema.png"
        alt="Ritsema Associates"
        style={{ height: size * 0.38, width: 'auto', display: 'block' }}
      />
    </div>
  )
}

export function RALogoSmall({ size = 36 }) {
  return (
    <div style={{ background: '#7A1020', borderRadius: 6, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
      <img
        src="/logo-ritsema.png"
        alt="Ritsema Associates"
        style={{ height: size * 0.7, width: 'auto', display: 'block' }}
      />
    </div>
  )
}

export function NotificationBell({ notifications = [], onMarkRead, onMarkAllRead }) {
  const [open, setOpen] = useState(false)
  const unread = notifications.filter(n => !n.read).length
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        position: 'relative', background: 'none', border: '0.5px solid rgba(0,0,0,0.2)',
        borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 15, lineHeight: 1,
      }}>
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6, background: '#7A1020', color: '#fff',
            fontSize: 10, fontWeight: 700, borderRadius: '50%', width: 17, height: 17,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 200,
          background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)', width: 320, maxHeight: 420, overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', position: 'sticky', top: 0, background: '#fff' }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>Notifications</span>
            {unread > 0 && (
              <button onClick={() => { onMarkAllRead(); setOpen(false) }} style={{ fontSize: 11, color: '#7A1020', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 && <p style={{ fontSize: 13, color: '#888', padding: 16, textAlign: 'center' }}>No notifications yet</p>}
          {notifications.map(n => (
            <div key={n.id} onClick={() => !n.read && onMarkRead(n.id)} style={{
              padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)',
              background: n.read ? '#fff' : '#FEF8F8', cursor: n.read ? 'default' : 'pointer',
            }}>
              <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{n.message}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
