import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { fetchEmployeeByCredentials, fetchSupervisorByCredentials, createSupervisor } from '../lib/api'
import { Btn, Card, ErrorMsg, RALogo } from './UI'

export default function LoginPage() {
  const { signInEmployee, signInSupervisor } = useAuth()
  const [tab, setTab] = useState('employee')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [eName, setEName] = useState('')
  const [eNum, setENum] = useState('')

  const [sName, setSName] = useState('')
  const [sNum, setSNum] = useState('')
  const [sRole, setSRole] = useState('Safety Director')

  async function handleEmpLogin(e) {
    e.preventDefault()
    setError('')
    if (!eName.trim() || !eNum.trim()) { setError('Please enter your name and employee number.'); return }
    setLoading(true)
    try {
      const emp = await fetchEmployeeByCredentials(eName, eNum)
      if (!emp) { setError('No account found. Contact your Safety Director or HR Manager.'); return }
      signInEmployee(emp)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSupLogin(e) {
    e.preventDefault()
    setError('')
    if (!sName.trim() || !sNum.trim()) { setError('Please enter your name and employee number.'); return }
    setLoading(true)
    try {
      let sup = await fetchSupervisorByCredentials(sName, sNum)
      if (!sup) {
        // Auto-create supervisor on first login
        sup = await createSupervisor({ name: sName.trim(), empNumber: sNum.trim(), role: sRole })
      }
      signInSupervisor(sup)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const tabStyle = (active) => ({
    flex: 1, padding: '10px', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', border: 'none', transition: 'all .15s',
    background: active ? '#fff' : '#f3f4f6',
    color: active ? '#111' : '#666',
    borderBottom: active ? '2px solid #7A1020' : '2px solid transparent',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: '#fafafa' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <RALogo size={110} />
          <h1 style={{ fontSize: 20, fontWeight: 500, marginTop: 14, lineHeight: 1.3 }}>
            90-Day Training Checklist
          </h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 6 }}>
            New hire onboarding progress &amp; approvals
          </p>
        </div>

        <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', marginBottom: '1.5rem', border: '0.5px solid rgba(0,0,0,0.1)' }}>
          <button style={tabStyle(tab === 'employee')} onClick={() => { setTab('employee'); setError('') }}>Employee</button>
          <button style={tabStyle(tab === 'supervisor')} onClick={() => { setTab('supervisor'); setError('') }}>Supervisor / Admin</button>
        </div>

        <Card>
          {tab === 'employee' ? (
            <form onSubmit={handleEmpLogin}>
              <label style={labelStyle}>Full name</label>
              <input style={inputStyle} placeholder="First Last" value={eName} onChange={e => setEName(e.target.value)} />
              <label style={labelStyle}>Employee number</label>
              <input style={inputStyle} placeholder="EMP-1042" value={eNum} onChange={e => setENum(e.target.value)} />
              {error && <ErrorMsg>{error}</ErrorMsg>}
              <Btn type="submit" variant="primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in as employee'}
              </Btn>
              <p style={{ fontSize: 12, color: '#888', marginTop: 10, textAlign: 'center' }}>
                Your account is created by a Safety Director or HR Manager.
              </p>
            </form>
          ) : (
            <form onSubmit={handleSupLogin}>
              <label style={labelStyle}>Full name</label>
              <input style={inputStyle} placeholder="First Last" value={sName} onChange={e => setSName(e.target.value)} />
              <label style={labelStyle}>Employee number</label>
              <input style={inputStyle} placeholder="SUP-0021" value={sNum} onChange={e => setSNum(e.target.value)} />
              <label style={labelStyle}>Role</label>
              <select style={inputStyle} value={sRole} onChange={e => setSRole(e.target.value)}>
                <option value="Safety Director">Safety Director (Admin)</option>
                <option value="HR/Training Manager">HR/Training Manager (Admin)</option>
                <option value="Foreman">Foreman</option>
                <option value="Superintendent">Superintendent</option>
              </select>
              {error && <ErrorMsg>{error}</ErrorMsg>}
              <Btn type="submit" variant="primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in as supervisor'}
              </Btn>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 13, color: '#555', marginBottom: 5, marginTop: 10 }
const inputStyle = {
  width: '100%', padding: '8px 10px', fontSize: 14, border: '0.5px solid rgba(0,0,0,0.2)',
  borderRadius: 8, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 2,
}
