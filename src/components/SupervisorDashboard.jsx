import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/AuthContext'
import {
  fetchEmployees, fetchTasks, fetchEmployeeTaskProgress,
  fetchPendingApprovals, approveTask, saveSupNote, clearSupNote,
  createEmployee, updateEmployee,
  createTask, updateTask, deleteTask as deleteTaskApi,
  fetchSupervisors, createSupervisor, updateSupervisor, deleteSupervisor,
  fetchModules, createModule, deleteModule,
  fetchNotifications, createNotification, createNotifications,
  markNotificationRead, markAllNotificationsRead,
  fetchTaskNotificationSettings, upsertTaskNotificationSetting, sendEmailNotification,
} from '../lib/api'
import { supabase } from '../lib/supabase'
import { getDayNumber, getDaysLeft, formatDate, CHECKINS, COMPETENCY_OPTIONS, ADMIN_ROLES } from '../data/constants'
import { Avatar, Badge, ProgressBar, Card, Btn, AdminBadge, Spinner, RALogoSmall, ErrorMsg, SuccessMsg, NotificationBell } from './UI'

export default function SupervisorDashboard() {
  const { session, signOut } = useAuth()
  const sup = session.user
  const isAdmin = ADMIN_ROLES.includes(sup.role)

  const [tab, setTab] = useState('employees')
  const [employees, setEmployees] = useState([])
  const [tasks, setTasks] = useState([])
  const [pending, setPending] = useState([])
  const [supervisors, setSupervisors] = useState([])
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [emps, tsks, pend, sups, notifs] = await Promise.all([
        fetchEmployees(), fetchTasks(), fetchPendingApprovals(), fetchSupervisors(),
        fetchNotifications('supervisor', sup.id),
      ])
      setEmployees(emps)
      setTasks(tsks)
      setPending(pend)
      setSupervisors(sups)
      setNotifications(notifs)
    } finally {
      setLoading(false)
    }
  }, [sup.id])

  async function handleMarkRead(id) {
    await markNotificationRead(id)
    setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x))
  }
  async function handleMarkAllRead() {
    await markAllNotificationsRead('supervisor', sup.id)
    setNotifications(n => n.map(x => ({ ...x, read: true })))
  }

  const checkOverdue = useCallback(async (emps, tsks, sups) => {
    if (!isAdmin) return
    try {
      const [notifSettings, allProgressRes] = await Promise.all([
        fetchTaskNotificationSettings(),
        supabase.from('employee_tasks').select('employee_id,task_id,done,approved'),
      ])
      const allProgress = allProgressRes.data || []
      const settingsMap = Object.fromEntries(notifSettings.map(s => [s.task_id, s]))
      const progressSet = new Set(allProgress.filter(p => p.done || p.approved).map(p => `${p.employee_id}-${p.task_id}`))
      const todayStr = new Date().toISOString().split('T')[0]
      const { data: todayNotifs } = await supabase.from('notifications')
        .select('employee_id,task_id').eq('type', 'task_overdue').gte('created_at', todayStr)
      const notifiedToday = new Set((todayNotifs || []).map(n => `${n.employee_id}-${n.task_id}`))
      const newNotifs = []
      const emailPromises = []
      for (const emp of emps) {
        const dayNum = getDayNumber(emp.start_date)
        for (const task of tsks) {
          if (progressSet.has(`${emp.id}-${task.id}`)) continue
          const daysOverdue = dayNum - task.due_day
          if (daysOverdue <= 0) continue
          const s = settingsMap[task.id]
          if (!s || !s.enabled) continue
          if (!s.notify_at_days.includes(daysOverdue)) continue
          if (notifiedToday.has(`${emp.id}-${task.id}`)) continue
          const title = `Overdue: ${task.name}`
          const msg = `${emp.name} is ${daysOverdue} day(s) past due on "${task.name}"`
          sups.forEach(s2 => {
            newNotifs.push({ recipient_type: 'supervisor', recipient_id: s2.id, type: 'task_overdue', title, message: msg, employee_id: emp.id, task_id: task.id })
            if (s2.email) emailPromises.push(sendEmailNotification({ to: s2.email, subject: `Overdue Task — ${emp.name}`, html: `<p>${msg}</p><p>Please log in to the <strong>Ritsema Training Tracker</strong> to review.</p>` }))
          })
        }
      }
      if (newNotifs.length) {
        await createNotifications(newNotifs)
        await Promise.all(emailPromises)
        const mine = newNotifs.filter(n => n.recipient_id === sup.id)
        if (mine.length) setNotifications(prev => [...mine.map(n => ({ ...n, id: crypto.randomUUID(), read: false, created_at: new Date().toISOString() })), ...prev])
      }
    } catch (err) { console.error('Overdue check failed:', err) }
  }, [isAdmin, sup.id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!loading && employees.length && tasks.length && supervisors.length) {
      checkOverdue(employees, tasks, supervisors)
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const pendingCount = pending.length
  const tabs = ['employees', 'pending', 'schedule', ...(isAdmin ? ['admin'] : [])]
  const labels = ['Employees', `Pending${pendingCount ? ` (${pendingCount})` : ''}`, 'Schedule', ...(isAdmin ? ['⚙ Admin'] : [])]

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RALogoSmall size={34} />
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 500 }}>Welcome, {sup.name.split(' ')[0]}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <p style={{ fontSize: 13, color: '#666', margin: 0 }}>#{sup.emp_number} · {sup.role}</p>
              {isAdmin && <AdminBadge />}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <NotificationBell notifications={notifications} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead} />
          <Btn size="sm" onClick={signOut}>Sign out</Btn>
        </div>
      </div>

      <TabBar tabs={tabs} labels={labels} active={tab} onChange={setTab} />

      {loading ? <Spinner /> : (
        <>
          {tab === 'employees' && <EmployeesTab employees={employees} tasks={tasks} sup={sup} onRefresh={load} />}
          {tab === 'pending' && <PendingTab pending={pending} sup={sup} onRefresh={load} />}
          {tab === 'schedule' && <ScheduleTab />}
          {tab === 'admin' && isAdmin && <AdminTab tasks={tasks} supervisors={supervisors} employees={employees} sup={sup} onRefresh={load} />}
        </>
      )}
    </div>
  )
}

// ─── Employees Tab ─────────────────────────────────────────────────────────

function EmployeesTab({ employees, tasks, sup, onRefresh }) {
  const [expanded, setExpanded] = useState(null)
  const [progressMap, setProgressMap] = useState({})

  async function expand(empId) {
    if (expanded === empId) { setExpanded(null); return }
    setExpanded(empId)
    if (!progressMap[empId]) {
      const p = await fetchEmployeeTaskProgress(empId)
      setProgressMap(m => ({ ...m, [empId]: p }))
    }
  }

  async function handleApprove(empId, taskId, competency) {
    await approveTask(empId, taskId, sup.id, competency)
    const p = await fetchEmployeeTaskProgress(empId)
    setProgressMap(m => ({ ...m, [empId]: p }))
    // Notify employee
    const emp2 = employees.find(e => e.id === empId)
    const task2 = tasks.find(t => t.id === taskId)
    if (emp2 && task2) {
      const title = `Task approved: ${task2.name}`
      const msg = `${sup.name} approved your task "${task2.name}"`
      createNotification({ recipientType: 'employee', recipientId: empId, type: 'task_approved', title, message: msg, employeeId: empId, taskId }).catch(console.error)
      if (emp2.email) sendEmailNotification({ to: emp2.email, subject: `Task Approved — ${task2.name}`, html: `<p>Hi ${emp2.name.split(' ')[0]},</p><p>${msg}.</p><p>Log in to <strong>Ritsema Training Tracker</strong> to view your progress.</p>` })
    }
    onRefresh()
  }

  async function handleSaveNote(empId, taskId, note) {
    await saveSupNote(empId, taskId, sup.id, note)
    const p = await fetchEmployeeTaskProgress(empId)
    setProgressMap(m => ({ ...m, [empId]: p }))
    // Notify employee
    const emp2 = employees.find(e => e.id === empId)
    const task2 = tasks.find(t => t.id === taskId)
    if (emp2 && task2) {
      const title = `Note added: ${task2.name}`
      const msg = `${sup.name} left a note on "${task2.name}": "${note}"`
      createNotification({ recipientType: 'employee', recipientId: empId, type: 'note_added', title, message: msg, employeeId: empId, taskId }).catch(console.error)
      if (emp2.email) sendEmailNotification({ to: emp2.email, subject: `Supervisor Note — ${task2.name}`, html: `<p>Hi ${emp2.name.split(' ')[0]},</p><p>${sup.name} left a note on your task <strong>${task2.name}</strong>:</p><blockquote>${note}</blockquote><p>Log in to <strong>Ritsema Training Tracker</strong> to view it.</p>` })
    }
  }

  async function handleClearNote(empId, taskId) {
    await clearSupNote(empId, taskId)
    const p = await fetchEmployeeTaskProgress(empId)
    setProgressMap(m => ({ ...m, [empId]: p }))
  }

  if (!employees.length) return <p style={{ textAlign: 'center', padding: '2rem', color: '#888', fontSize: 14 }}>No employees registered yet.</p>

  return (
    <div>
      {employees.map(emp => {
        const prog = progressMap[emp.id] || {}
        const allT = tasks
        const done = allT.filter(t => prog[t.id]?.done).length
        const apprd = allT.filter(t => prog[t.id]?.approved).length
        const pendCnt = allT.filter(t => prog[t.id]?.done && !prog[t.id]?.approved).length
        const pct = allT.length ? Math.round(done / allT.length * 100) : 0
        const day = getDayNumber(emp.start_date)

        return (
          <Card key={emp.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => expand(emp.id)}>
              <Avatar name={emp.name} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{emp.name} <span style={{ fontSize: 12, fontWeight: 400, color: '#666' }}>#{emp.emp_number}</span></div>
                <div style={{ fontSize: 12, color: '#666' }}>{emp.hire_type} · Day {day} · Started {formatDate(emp.start_date)}</div>
                <ProgressBar value={pct} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 12 }}>
                  <span style={{ color: '#666' }}>{done} done · {apprd} approved</span>
                  {pendCnt > 0 && <Badge variant="amber">{pendCnt} pending</Badge>}
                </div>
              </div>
              <span style={{ color: '#888' }}>{expanded === emp.id ? '▲' : '▼'}</span>
            </div>
            {expanded === emp.id && (
              <div style={{ marginTop: 12, borderTop: '0.5px solid rgba(0,0,0,0.08)', paddingTop: 12 }}>
                <EmployeeTaskList
                  tasks={tasks} progress={prog} emp={emp} sup={sup}
                  onApprove={handleApprove} onSaveNote={handleSaveNote} onClearNote={handleClearNote}
                />
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function EmployeeTaskList({ tasks, progress, emp, sup, onApprove, onSaveNote, onClearNote }) {
  const done = tasks.filter(t => progress[t.id]?.done)
  if (!done.length) return <p style={{ fontSize: 13, color: '#888', padding: '8px 0' }}>No tasks marked done yet.</p>

  return done.map(t => {
    const prog = progress[t.id] || {}
    const isApproved = !!prog.approved
    return <SupTaskRow key={t.id} task={t} prog={prog} emp={emp} sup={sup} isApproved={isApproved} onApprove={onApprove} onSaveNote={onSaveNote} onClearNote={onClearNote} />
  })
}

function SupTaskRow({ task, prog, emp, sup, isApproved, onApprove, onSaveNote, onClearNote }) {
  const [comp, setComp] = useState(prog.sup_competency || prog.self_competency || '')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleApprove() {
    setSaving(true)
    try { await onApprove(emp.id, task.id, comp) } finally { setSaving(false) }
  }

  async function handleNote() {
    if (!note.trim()) return
    setSaving(true)
    try { await onSaveNote(emp.id, task.id, note); setNote('') } finally { setSaving(false) }
  }

  return (
    <div style={{ padding: '11px 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight: 500, fontSize: 14 }}>{task.name}</div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
        {task.conducted_by} · {task.due_label}{prog.self_competency ? ` · Employee: ${prog.self_competency}` : ''}
      </div>
      {isApproved && prog.approved_supervisor && (
        <div style={{ background: '#F5E6E8', borderRadius: 8, padding: '7px 11px', fontSize: 12, color: '#7A1020', marginTop: 5 }}>
          ✓ Approved by <strong>{prog.approved_supervisor.name}</strong> (#{prog.approved_supervisor.emp_number}) on {formatDate(prog.approved_at)}
        </div>
      )}
      {prog.sup_note && (
        <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '8px 11px', fontSize: 13, marginTop: 6, color: '#555' }}>
          <strong>Note</strong> ({formatDate(prog.sup_note_at)}): {prog.sup_note}{' '}
          <button onClick={() => onClearNote(emp.id, task.id)} style={{ fontSize: 11, marginLeft: 6, cursor: 'pointer', background: 'none', border: 'none', color: '#7A1020', textDecoration: 'underline' }}>Edit</button>
        </div>
      )}
      {!isApproved && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
          <select value={comp} onChange={e => setComp(e.target.value)}
            style={{ fontSize: 12, padding: '3px 6px', borderRadius: 6, border: '0.5px solid rgba(0,0,0,0.2)', fontFamily: 'inherit' }}>
            <option value="">Rate…</option>
            {COMPETENCY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <Btn size="xs" variant="teal" onClick={handleApprove} disabled={saving}>Approve</Btn>
        </div>
      )}
      {!prog.sup_note && (
        <div style={{ marginTop: 8 }}>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder={`Leave a note for ${emp.name.split(' ')[0]}…`}
            style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: '0.5px solid rgba(0,0,0,0.2)', fontFamily: 'inherit', resize: 'vertical', minHeight: 54, boxSizing: 'border-box', marginBottom: 5 }} />
          <Btn size="xs" onClick={handleNote} disabled={saving || !note.trim()}>Save note</Btn>
        </div>
      )}
    </div>
  )
}

// ─── Pending Tab ───────────────────────────────────────────────────────────

function PendingTab({ pending, sup, onRefresh }) {
  const [saving, setSaving] = useState({})

  async function handleApprove(item, comp) {
    setSaving(s => ({ ...s, [item.id]: true }))
    try {
      await approveTask(item.employee_id, item.task_id, sup.id, comp)
      // Notify employee
      const emp2 = item.employee
      const task2 = item.task
      if (emp2 && task2) {
        const title = `Task approved: ${task2.name}`
        const msg = `${sup.name} approved your task "${task2.name}"`
        createNotification({ recipientType: 'employee', recipientId: emp2.id, type: 'task_approved', title, message: msg, employeeId: emp2.id, taskId: task2.id }).catch(console.error)
        if (emp2.email) sendEmailNotification({ to: emp2.email, subject: `Task Approved — ${task2.name}`, html: `<p>Hi ${emp2.name.split(' ')[0]},</p><p>${msg}.</p><p>Log in to <strong>Ritsema Training Tracker</strong> to view your progress.</p>` })
      }
      onRefresh()
    } finally {
      setSaving(s => ({ ...s, [item.id]: false }))
    }
  }

  if (!pending.length) return <p style={{ textAlign: 'center', padding: '2rem', color: '#888', fontSize: 14 }}>No tasks pending approval.</p>

  // Group by employee
  const groups = pending.reduce((acc, item) => {
    const key = item.employee.id
    if (!acc[key]) acc[key] = { employee: item.employee, items: [] }
    acc[key].items.push(item)
    return acc
  }, {})

  return (
    <div>
      {Object.values(groups).map(({ employee: emp, items }) => (
        <div key={emp.id} style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Avatar name={emp.name} size={28} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>{emp.name} <span style={{ fontWeight: 400, color: '#666' }}>#{emp.emp_number}</span></span>
          </div>
          {items.map(item => (
            <PendingRow key={item.id} item={item} saving={!!saving[item.id]} onApprove={handleApprove} />
          ))}
        </div>
      ))}
    </div>
  )
}

function PendingRow({ item, saving, onApprove }) {
  const [comp, setComp] = useState(item.self_competency || '')
  const [note, setNote] = useState('')
  return (
    <div style={{ paddingLeft: 36, padding: '10px 0 10px 36px', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight: 500, fontSize: 14 }}>{item.task.name}</div>
      <div style={{ fontSize: 12, color: '#666' }}>{item.task.conducted_by} · {item.task.due_label}{item.self_competency ? ` · ${item.self_competency}` : ''}</div>
      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Leave a note…"
        style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: '0.5px solid rgba(0,0,0,0.2)', fontFamily: 'inherit', resize: 'vertical', minHeight: 48, boxSizing: 'border-box', marginTop: 6 }} />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 5 }}>
        <select value={comp} onChange={e => setComp(e.target.value)}
          style={{ fontSize: 12, padding: '3px 6px', borderRadius: 6, border: '0.5px solid rgba(0,0,0,0.2)', fontFamily: 'inherit' }}>
          <option value="">Rate…</option>
          {COMPETENCY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <Btn size="xs" variant="teal" onClick={() => onApprove(item, comp)} disabled={saving}>Approve</Btn>
      </div>
    </div>
  )
}

// ─── Schedule Tab ──────────────────────────────────────────────────────────

function ScheduleTab() {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#666', marginBottom: '1rem' }}>Formal check-in and review schedule.</p>
      {CHECKINS.map((c, i) => (
        <div key={i} style={{ background: '#f3f4f6', borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{c.timing}</div>
            <Badge variant="teal">Scheduled</Badge>
          </div>
          <p style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Led by: {c.by}</p>
          <p style={{ fontSize: 13, color: '#555' }}>Focus: {c.focus}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Admin Tab ─────────────────────────────────────────────────────────────

function AdminTab({ tasks, supervisors, employees, sup, onRefresh }) {
  const [adminTab, setAdminTab] = useState('employees')
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
        <AdminBadge />
        <span style={{ fontSize: 13, color: '#666' }}>Safety Director & HR/Training Manager only</span>
      </div>
      <TabBar
        tabs={['employees','tasks','supervisors']}
        labels={['Employee management','Task management','Supervisor management']}
        active={adminTab} onChange={setAdminTab}
      />
      {adminTab === 'employees' && <AdminEmployees employees={employees} sup={sup} onRefresh={onRefresh} />}
      {adminTab === 'tasks' && <AdminTasks tasks={tasks} onRefresh={onRefresh} />}
      {adminTab === 'supervisors' && <AdminSupervisors supervisors={supervisors} currentSup={sup} onRefresh={onRefresh} />}
    </div>
  )
}

// ─── Admin: Employees ──────────────────────────────────────────────────────

function AdminEmployees({ employees, sup, onRefresh }) {
  const [name, setName] = useState('')
  const [num, setNum] = useState('')
  const [type, setType] = useState('New Hire')
  const [start, setStart] = useState('')
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)

  async function handleAdd(e) {
    e.preventDefault()
    setErr(''); setOk('')
    if (!name.trim() || !num.trim()) { setErr('Name and employee number are required.'); return }
    setSaving(true)
    try {
      await createEmployee({ name: name.trim(), empNumber: num.trim(), hireType: type, startDate: start || undefined, createdBy: sup.id, email: email.trim() || undefined })
      setOk(`${name.trim()} (#${num.trim()}) added.`)
      setName(''); setNum(''); setStart(''); setEmail('')
      onRefresh()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <AdminPanel title="Add new employee" defaultOpen>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>Create an employee account. They log in with name + employee number.</p>
        <form onSubmit={handleAdd}>
          <div style={formRow}>
            <div><FieldLabel>Full name</FieldLabel><input style={input} placeholder="First Last" value={name} onChange={e => setName(e.target.value)} /></div>
            <div><FieldLabel>Employee number</FieldLabel><input style={input} placeholder="EMP-1099" value={num} onChange={e => setNum(e.target.value)} /></div>
          </div>
          <div><FieldLabel>Email (optional)</FieldLabel><input style={input} type="email" placeholder="employee@email.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div style={formRow}>
            <div><FieldLabel>Hire type</FieldLabel>
              <select style={input} value={type} onChange={e => setType(e.target.value)}>
                <option>New Hire</option><option>Apprentice</option><option>Installer</option><option>Asst. Foreman</option><option>Foreman</option>
              </select>
            </div>
            <div><FieldLabel>Start date (optional)</FieldLabel><input style={input} type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
          </div>
          {err && <ErrorMsg>{err}</ErrorMsg>}
          {ok && <SuccessMsg>{ok}</SuccessMsg>}
          <Btn type="submit" variant="primary" size="sm" disabled={saving} style={{ marginTop: 8 }}>+ Create account</Btn>
        </form>
      </AdminPanel>

      <AdminPanel title={`Registered employees (${employees.length})`} defaultOpen>
        {!employees.length && <p style={{ fontSize: 13, color: '#888' }}>No employees yet.</p>}
        {employees.map(emp => (
          <div key={emp.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
              <Avatar name={emp.name} size={32} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{emp.name} <span style={{ fontWeight: 400, color: '#666', fontSize: 12 }}>#{emp.emp_number}</span></div>
                <div style={{ fontSize: 12, color: '#666' }}>{emp.hire_type} · Day {getDayNumber(emp.start_date)} · Started {formatDate(emp.start_date)}</div>
              </div>
              <Btn size="xs" onClick={() => setEditId(editId === emp.id ? null : emp.id)}>Edit</Btn>
            </div>
            {editId === emp.id && <EditEmployeeForm emp={emp} onDone={() => { setEditId(null); onRefresh() }} />}
          </div>
        ))}
      </AdminPanel>
    </div>
  )
}

function EditEmployeeForm({ emp, onDone }) {
  const [name, setName] = useState(emp.name)
  const [num, setNum] = useState(emp.emp_number)
  const [type, setType] = useState(emp.hire_type)
  const [start, setStart] = useState(emp.start_date)
  const [email, setEmail] = useState(emp.email || '')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await updateEmployee(emp.id, { name, empNumber: num, hireType: type, startDate: start, email: email.trim() || undefined })
      setMsg('Saved.')
      setTimeout(onDone, 700)
    } catch (e) { setMsg(e.message) } finally { setSaving(false) }
  }

  return (
    <div style={{ background: '#f3f4f6', borderRadius: 8, padding: 12, margin: '6px 0 10px' }}>
      <div style={formRow}>
        <div><FieldLabel>Name</FieldLabel><input style={input} value={name} onChange={e => setName(e.target.value)} /></div>
        <div><FieldLabel>Emp number</FieldLabel><input style={input} value={num} onChange={e => setNum(e.target.value)} /></div>
      </div>
      <div><FieldLabel>Email (optional)</FieldLabel><input style={input} type="email" placeholder="employee@email.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div style={formRow}>
        <div><FieldLabel>Hire type</FieldLabel><select style={input} value={type} onChange={e => setType(e.target.value)}><option>New Hire</option><option>Apprentice</option><option>Installer</option><option>Asst. Foreman</option><option>Foreman</option></select></div>
        <div><FieldLabel>Start date</FieldLabel><input style={input} type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
      </div>
      {msg && <p style={{ fontSize: 12, color: '#0F6E56', marginTop: 4 }}>{msg}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Btn size="sm" variant="primary" onClick={save} disabled={saving}>Save</Btn>
        <Btn size="sm" onClick={onDone}>Cancel</Btn>
      </div>
    </div>
  )
}

// ─── Admin: Tasks ──────────────────────────────────────────────────────────

function AdminTasks({ tasks, onRefresh }) {
  const [tasksTab, setTasksTab] = useState('modules')
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadModules() {
    setLoading(true)
    try { setModules(await fetchModules()) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadModules() }, [])

  function handleRefresh() { onRefresh(); loadModules() }

  if (loading) return <Spinner />

  return (
    <div>
      <TabBar tabs={['modules', 'notifications']} labels={['Modules', 'Notification Settings']} active={tasksTab} onChange={setTasksTab} />
      {tasksTab === 'modules' && (
        <div>
          {modules.map(mod => (
            <TaskModulePanel key={mod.number} mod={mod} tasks={tasks.filter(t => t.module === mod.number)} onRefresh={handleRefresh} />
          ))}
          <AddModuleForm modules={modules} onDone={handleRefresh} />
        </div>
      )}
      {tasksTab === 'notifications' && <NotificationSettingsTab tasks={tasks} />}
    </div>
  )
}

const MODULE_COLORS = [
  { bg: '#FAECE7', color: '#993C1D', badge: 'coral' },
  { bg: '#E6F1FB', color: '#185FA5', badge: 'blue' },
  { bg: '#E1F5EE', color: '#0F6E56', badge: 'teal' },
  { bg: '#EEEDFE', color: '#3C3489', badge: 'purple' },
  { bg: '#FAEEDA', color: '#854F0B', badge: 'amber' },
  { bg: '#EAF3DE', color: '#3B6D11', badge: 'green' },
]

function TaskModulePanel({ mod, tasks, onRefresh }) {
  const [editId, setEditId] = useState(null)
  const [name, setName] = useState('')
  const [by, setBy] = useState('')
  const [day, setDay] = useState('')
  const [lbl, setLbl] = useState('')
  const [inv, setInv] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const c = MODULE_COLORS[(mod.number - 1) % MODULE_COLORS.length]

  async function handleAdd(e) {
    e.preventDefault()
    setErr('')
    if (!name.trim() || !by.trim()) { setErr('Name and "Conducted by" are required.'); return }
    setSaving(true)
    try {
      await createTask({ module: mod.number, name: name.trim(), conductedBy: by.trim(), dueDay: parseInt(day) || 90, dueLabel: lbl.trim() || `Day ${day}`, involves: inv.trim() || 'See supervisor for details.' })
      setName(''); setBy(''); setDay(''); setLbl(''); setInv('')
      onRefresh()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  async function handleDeleteTask(id) {
    if (!window.confirm('Remove this task?')) return
    await deleteTaskApi(id)
    onRefresh()
  }

  async function handleDeleteModule() {
    if (!window.confirm(`Delete "${mod.name}" and all ${tasks.length} task(s) inside it? This cannot be undone.`)) return
    await deleteModule(mod.number)
    onRefresh()
  }

  return (
    <AdminPanel title={
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: c.bg, color: c.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500 }}>{mod.number}</span>
        {mod.name} <Badge variant={c.badge}>{tasks.length}</Badge>
      </span>
    }>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: tasks.length ? 0 : 8 }}>
        <Btn size="xs" variant="danger" onClick={handleDeleteModule}>Delete module</Btn>
      </div>
      {tasks.map(t => (
        <div key={t.id}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{t.conducted_by} · {t.due_label} · {t.involves}</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <Btn size="xs" onClick={() => setEditId(editId === t.id ? null : t.id)}>Edit</Btn>
              <Btn size="xs" variant="danger" onClick={() => handleDeleteTask(t.id)}>Delete</Btn>
            </div>
          </div>
          {editId === t.id && <EditTaskForm task={t} onDone={() => { setEditId(null); onRefresh() }} />}
        </div>
      ))}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 10 }}>Add new {mod.name} task</p>
        <form onSubmit={handleAdd}>
          <div style={formRow}>
            <div><FieldLabel>Task name</FieldLabel><input style={input} placeholder="e.g. Ladder Safety" value={name} onChange={e => setName(e.target.value)} /></div>
            <div><FieldLabel>Conducted by</FieldLabel><input style={input} placeholder="e.g. Foreman" value={by} onChange={e => setBy(e.target.value)} /></div>
          </div>
          <div style={formRow}>
            <div><FieldLabel>Due day #</FieldLabel><input style={input} type="number" placeholder="30" value={day} onChange={e => setDay(e.target.value)} /></div>
            <div><FieldLabel>Due label</FieldLabel><input style={input} placeholder="Day 30" value={lbl} onChange={e => setLbl(e.target.value)} /></div>
          </div>
          <FieldLabel>Training involves</FieldLabel>
          <textarea style={{ ...input, resize: 'vertical', minHeight: 52 }} placeholder="Brief description…" value={inv} onChange={e => setInv(e.target.value)} />
          {err && <ErrorMsg>{err}</ErrorMsg>}
          <Btn type="submit" size="sm" variant="purple" disabled={saving} style={{ marginTop: 4 }}>+ Add task</Btn>
        </form>
      </div>
    </AdminPanel>
  )
}

function AddModuleForm({ modules, onDone }) {
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    setErr('')
    if (!name.trim()) { setErr('Module name is required.'); return }
    const nextNum = modules.length ? Math.max(...modules.map(m => m.number)) + 1 : 1
    setSaving(true)
    try {
      await createModule(nextNum, name.trim())
      setName('')
      onDone()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <AdminPanel title="+ Create new module">
      <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Create a new training module. Tasks can be added to it after creating it.</p>
      <form onSubmit={handleAdd}>
        <FieldLabel>Module name</FieldLabel>
        <input style={input} placeholder="e.g. Module 3: Advanced Operations" value={name} onChange={e => setName(e.target.value)} />
        {err && <ErrorMsg>{err}</ErrorMsg>}
        <Btn type="submit" size="sm" variant="primary" disabled={saving} style={{ marginTop: 4 }}>Create module</Btn>
      </form>
    </AdminPanel>
  )
}

function EditTaskForm({ task, onDone }) {
  const [name, setName] = useState(task.name)
  const [by, setBy] = useState(task.conducted_by)
  const [day, setDay] = useState(task.due_day)
  const [lbl, setLbl] = useState(task.due_label)
  const [inv, setInv] = useState(task.involves)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await updateTask(task.id, { name, conductedBy: by, dueDay: parseInt(day), dueLabel: lbl, involves: inv })
      setMsg('Saved.')
      setTimeout(onDone, 700)
    } catch (e) { setMsg(e.message) } finally { setSaving(false) }
  }

  return (
    <div style={{ background: '#f3f4f6', borderRadius: 8, padding: 12, margin: '6px 0 8px' }}>
      <div style={formRow}>
        <div><FieldLabel>Task name</FieldLabel><input style={input} value={name} onChange={e => setName(e.target.value)} /></div>
        <div><FieldLabel>Conducted by</FieldLabel><input style={input} value={by} onChange={e => setBy(e.target.value)} /></div>
      </div>
      <div style={formRow}>
        <div><FieldLabel>Due day #</FieldLabel><input style={input} type="number" value={day} onChange={e => setDay(e.target.value)} /></div>
        <div><FieldLabel>Due label</FieldLabel><input style={input} value={lbl} onChange={e => setLbl(e.target.value)} /></div>
      </div>
      <FieldLabel>Training involves</FieldLabel>
      <textarea style={{ ...input, resize: 'vertical', minHeight: 52 }} value={inv} onChange={e => setInv(e.target.value)} />
      {msg && <p style={{ fontSize: 12, color: '#0F6E56' }}>{msg}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Btn size="sm" variant="primary" onClick={save} disabled={saving}>Save</Btn>
        <Btn size="sm" onClick={onDone}>Cancel</Btn>
      </div>
    </div>
  )
}

// ─── Admin: Supervisors ────────────────────────────────────────────────────

function AdminSupervisors({ supervisors, currentSup, onRefresh }) {
  const [editId, setEditId] = useState(null)
  const [name, setName] = useState('')
  const [num, setNum] = useState('')
  const [role, setRole] = useState('Foreman')
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    setErr(''); setOk('')
    if (!name.trim() || !num.trim()) { setErr('Name and number required.'); return }
    setSaving(true)
    try {
      await createSupervisor({ name: name.trim(), empNumber: num.trim(), role, email: email.trim() || undefined })
      setOk(`${name.trim()} added.`)
      setName(''); setNum(''); setEmail('')
      onRefresh()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (id === currentSup.id) { alert("You can't remove your own account."); return }
    if (!window.confirm('Remove this supervisor?')) return
    await deleteSupervisor(id)
    onRefresh()
  }

  return (
    <div>
      <AdminPanel title={`Supervisor roster (${supervisors.length})`} defaultOpen>
        {supervisors.map(s => (
          <div key={s.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
              <Avatar name={s.name} size={32} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name} <span style={{ fontWeight: 400, color: '#666', fontSize: 12 }}>#{s.emp_number}</span></div>
                <div style={{ fontSize: 12, color: '#666' }}>{s.role}{ADMIN_ROLES.includes(s.role) ? ' · Admin' : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <Btn size="xs" onClick={() => setEditId(editId === s.id ? null : s.id)}>Edit</Btn>
                <Btn size="xs" variant="danger" onClick={() => handleDelete(s.id)}>Delete</Btn>
              </div>
            </div>
            {editId === s.id && <EditSupForm sup={s} onDone={() => { setEditId(null); onRefresh() }} />}
          </div>
        ))}
      </AdminPanel>
      <AdminPanel title="Add new supervisor">
        <form onSubmit={handleAdd}>
          <div style={formRow}>
            <div><FieldLabel>Full name</FieldLabel><input style={input} placeholder="First Last" value={name} onChange={e => setName(e.target.value)} /></div>
            <div><FieldLabel>Employee number</FieldLabel><input style={input} placeholder="SUP-0099" value={num} onChange={e => setNum(e.target.value)} /></div>
          </div>
          <div><FieldLabel>Email (optional)</FieldLabel><input style={input} type="email" placeholder="supervisor@email.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <FieldLabel>Role</FieldLabel>
          <select style={input} value={role} onChange={e => setRole(e.target.value)}>
            <option value="Safety Director">Safety Director (Admin)</option>
            <option value="HR/Training Manager">HR/Training Manager (Admin)</option>
            <option value="Foreman">Foreman</option>
            <option value="Superintendent">Superintendent</option>
          </select>
          {err && <ErrorMsg>{err}</ErrorMsg>}
          {ok && <SuccessMsg>{ok}</SuccessMsg>}
          <Btn type="submit" size="sm" variant="purple" disabled={saving} style={{ marginTop: 4 }}>+ Add supervisor</Btn>
        </form>
      </AdminPanel>
    </div>
  )
}

function EditSupForm({ sup, onDone }) {
  const [name, setName] = useState(sup.name)
  const [num, setNum] = useState(sup.emp_number)
  const [role, setRole] = useState(sup.role)
  const [email, setEmail] = useState(sup.email || '')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await updateSupervisor(sup.id, { name, empNumber: num, role, email: email.trim() || undefined })
      setMsg('Saved.')
      setTimeout(onDone, 700)
    } catch (e) { setMsg(e.message) } finally { setSaving(false) }
  }

  return (
    <div style={{ background: '#f3f4f6', borderRadius: 8, padding: 12, margin: '6px 0 8px' }}>
      <div style={formRow}>
        <div><FieldLabel>Name</FieldLabel><input style={input} value={name} onChange={e => setName(e.target.value)} /></div>
        <div><FieldLabel>Emp number</FieldLabel><input style={input} value={num} onChange={e => setNum(e.target.value)} /></div>
      </div>
      <div><FieldLabel>Email (optional)</FieldLabel><input style={input} type="email" placeholder="supervisor@email.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <FieldLabel>Role</FieldLabel>
      <select style={input} value={role} onChange={e => setRole(e.target.value)}>
        <option value="Safety Director">Safety Director (Admin)</option>
        <option value="HR/Training Manager">HR/Training Manager (Admin)</option>
        <option value="Foreman">Foreman</option>
        <option value="Superintendent">Superintendent</option>
      </select>
      {msg && <p style={{ fontSize: 12, color: '#0F6E56' }}>{msg}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Btn size="sm" variant="primary" onClick={save} disabled={saving}>Save</Btn>
        <Btn size="sm" onClick={onDone}>Cancel</Btn>
      </div>
    </div>
  )
}

// ─── Notification Settings Tab ────────────────────────────────────────────

function NotificationSettingsTab({ tasks }) {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})

  useEffect(() => {
    fetchTaskNotificationSettings().then(data => {
      const map = {}
      data.forEach(s => { map[s.task_id] = { enabled: s.enabled, days: s.notify_at_days.join(', ') } })
      setSettings(map)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function saveSetting(taskId) {
    setSaving(s => ({ ...s, [taskId]: true }))
    const s = settings[taskId] || { enabled: true, days: '1, 3, 7' }
    const days = (s.days || '').split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d > 0)
    await upsertTaskNotificationSetting(taskId, days.length ? days : [1, 3, 7], s.enabled !== false)
    setSaving(s2 => ({ ...s2, [taskId]: false }))
    setSaved(s2 => ({ ...s2, [taskId]: true }))
    setTimeout(() => setSaved(s2 => ({ ...s2, [taskId]: false })), 1500)
  }

  if (loading) return <Spinner />

  const modules = [...new Set(tasks.map(t => t.module))].sort((a, b) => a - b)

  return (
    <div>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
        Set how many days past the due date overdue notifications are sent. Enter day numbers separated by commas (e.g. <strong>1, 3, 7</strong>). Uncheck to disable notifications for a task.
      </p>
      {modules.map(mod => (
        <AdminPanel key={mod} title={`Module ${mod}`} defaultOpen>
          {tasks.filter(t => t.module === mod).map(task => {
            const s = settings[task.id] || { enabled: true, days: '1, 3, 7' }
            return (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)', flexWrap: 'wrap' }}>
                <input type="checkbox" checked={s.enabled !== false} onChange={e => setSettings(p => ({ ...p, [task.id]: { ...s, enabled: e.target.checked } }))} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{task.name}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>Due: {task.due_label}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#555' }}>Notify at days:</span>
                  <input
                    style={{ ...input, width: 110, marginBottom: 0 }}
                    value={s.days}
                    placeholder="1, 3, 7"
                    onChange={e => setSettings(p => ({ ...p, [task.id]: { ...s, days: e.target.value } }))}
                  />
                  <Btn size="xs" variant={saved[task.id] ? 'teal' : 'default'} onClick={() => saveSetting(task.id)} disabled={saving[task.id]}>
                    {saved[task.id] ? '✓ Saved' : 'Save'}
                  </Btn>
                </div>
              </div>
            )
          })}
        </AdminPanel>
      ))}
    </div>
  )
}

// ─── Shared helpers ────────────────────────────────────────────────────────

function AdminPanel({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f3f4f6', cursor: 'pointer' }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{title}</div>
        <span style={{ color: '#888' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && <div style={{ padding: 16 }}>{children}</div>}
    </div>
  )
}

function TabBar({ tabs, labels, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 3, background: '#f3f4f6', borderRadius: 8, padding: 3, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
      {tabs.map((t, i) => (
        <button key={t} onClick={() => onChange(t)} style={{
          flex: 1, padding: '7px 6px', fontSize: 12, fontWeight: 500,
          border: active === t ? '0.5px solid rgba(0,0,0,0.12)' : 'none',
          background: active === t ? '#fff' : 'transparent',
          color: active === t ? '#111' : '#666',
          borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>
          {labels[i]}
        </button>
      ))}
    </div>
  )
}

const formRow = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 0 }
const input = { width: '100%', padding: '7px 9px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8 }
const FieldLabel = ({ children }) => <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>{children}</label>
