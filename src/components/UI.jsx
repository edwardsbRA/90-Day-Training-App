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
  // Inline the actual Ritsema Associates logo as base64
  return (
    <img
      src="data:image/png;base64,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"
      alt="Ritsema Associates"
      style={{ width: size, height: 'auto', display: 'block', margin: '0 auto' }}
    />
  )
}

export function RALogoSmall({ size = 36 }) {
  return (
    <img
      src="data:image/png;base64,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"
      alt="Ritsema Associates"
      style={{ width: size, height: 'auto', display: 'block' }}
    />
  )
}
