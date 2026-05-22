import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/AuthContext'
import {
  fetchTasks, fetchEmployeeTaskProgress,
  upsertTaskDone, upsertSelfCompetency,
  fetchSupervisors, fetchNotifications, createNotifications,
  markNotificationRead, markAllNotificationsRead, sendEmailNotification,
} from '../lib/api'
import {
  getDayNumber, getDaysLeft, formatDate,
  CHECKINS, COMPETENCY_OPTIONS,
} from '../data/constants'
import {
  Badge, ProgressBar, Card, Btn, AlertBanner, Spinner, RALogoSmall, NotificationBell,
} from './UI'

export default function EmployeeDashboard() {
  const { session, signOut } = useAuth()
  const emp = session.user

  const [tasks, setTasks] = useState([])
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [notifications, setNotifications] = useState([])

  const day = getDayNumber(emp.start_date)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, p, notifs] = await Promise.all([fetchTasks(), fetchEmployeeTaskProgress(emp.id), fetchNotifications('employee', emp.id)])
      setTasks(t)
      setProgress(p)
      setNotifications(notifs)
    } finally {
      setLoading(false)
    }
  }, [emp.id])

  useEffect(() => { load() }, [load])

  async function handleMarkRead(id) {
    await markNotificationRead(id)
    setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x))
  }
  async function handleMarkAllRead() {
    await markAllNotificationsRead('employee', emp.id)
    setNotifications(n => n.map(x => ({ ...x, read: true })))
  }

  async function toggleDone(taskId) {
    const current = progress[taskId]
    if (current?.approved) return
    const newDone = !(current?.done)
    setProgress(p => ({ ...p, [taskId]: { ...p[taskId], done: newDone } }))
    await upsertTaskDone(emp.id, taskId, newDone)
    if (newDone) {
      try {
        const sups = await fetchSupervisors()
        const task = tasks.find(t => t.id === taskId)
        const title = `Task completed: ${task?.name}`
        const msg = `${emp.name} marked "${task?.name}" as complete — pending approval`
        await createNotifications(sups.map(s => ({ recipient_type: 'supervisor', recipient_id: s.id, type: 'task_done', title, message: msg, employee_id: emp.id, task_id: taskId })))
        sups.forEach(s => { if (s.email) sendEmailNotification({ to: s.email, subject: `Task Complete — ${emp.name}`, html: `<p>${msg}</p><p>Log in to <strong>Ritsema Training Tracker</strong> to approve.</p>` }) })
      } catch (err) { console.error('Notification failed:', err) }
    }
  }

  async function setCompetency(taskId, val) {
    setProgress(p => ({ ...p, [taskId]: { ...p[taskId], self_competency: val } }))
    await upsertSelfCompetency(emp.id, taskId, val)
  }

  const m1 = tasks.filter(t => t.module === 1)
  const m2 = tasks.filter(t => t.module === 2)
  const allTasks = tasks
  const done = allTasks.filter(t => progress[t.id]?.done).length
  const approved = allTasks.filter(t => progress[t.id]?.approved).length
  const m1done = m1.filter(t => progress[t.id]?.done).length
  const m2done = m2.filter(t => progress[t.id]?.done).length

  const alerts = allTasks.flatMap(t => {
    const p = progress[t.id]
    if (p?.approved || p?.done) return []
    const left = getDaysLeft(emp.start_date, t.due_day)
    if (left < 0) return [{ type: 'overdue', task: t.name, days: Math.abs(left) }]
    if (left <= 5) return [{ type: 'upcoming', task: t.name, days: left }]
    return []
  })

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RALogoSmall size={34} />
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 500 }}>Welcome, {emp.name.split(' ')[0]}</h2>
            <p style={{ fontSize: 13, color: '#666', marginTop: 2 }}>#{emp.emp_number} · {emp.hire_type} · Day {day} of 90</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <NotificationBell notifications={notifications} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead} />
          <Btn size="sm" onClick={signOut}>Sign out</Btn>
        </div>
      </div>

      {/* Alerts */}
      {alerts.map((a, i) => (
        <AlertBanner key={i} type={a.type === 'overdue' ? 'overdue' : 'upcoming'}>
          {a.type === 'overdue'
            ? <><strong>Overdue {a.days}d:</strong> {a.task}</>
            : <><strong>Due in {a.days}d:</strong> {a.task}</>}
        </AlertBanner>
      ))}

      {/* Tabs */}
      <TabBar tabs={['overview','module1','module2','checkins']} labels={['Overview','Module 1','Module 2','Check-ins']} active={tab} onChange={setTab} />

      {loading ? <Spinner /> : (
        <>
          {tab === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.5rem' }}>
                <StatCard label="Current day" value={day} />
                <StatCard label="Tasks done" value={done} />
                <StatCard label="Approved" value={approved} />
              </div>
              <Card style={{ marginBottom: 12 }}>
                <ModuleHeader num={1} title="Module 1 – Critical Tasks" sub="Complete by end of Week 1" />
                <p style={{ fontSize: 13, color: '#666' }}>{m1done} of {m1.length} complete</p>
                <ProgressBar value={m1.length ? (m1done / m1.length) * 100 : 0} />
              </Card>
              <Card>
                <ModuleHeader num={2} title="Module 2 – Performance Tasks" sub="Complete by Day 90" />
                <p style={{ fontSize: 13, color: '#666' }}>{m2done} of {m2.length} complete</p>
                <ProgressBar value={m2.length ? (m2done / m2.length) * 100 : 0} />
              </Card>
            </div>
          )}

          {tab === 'module1' && (
            <div>
              <ModuleHeader num={1} title="Critical Tasks & Safety" sub="Complete by end of Week 1" />
              <Card>
                {m1.map(t => <TaskRow key={t.id} task={t} prog={progress[t.id]} emp={emp} onToggle={toggleDone} onCompetency={setCompetency} />)}
              </Card>
            </div>
          )}

          {tab === 'module2' && (
            <div>
              <ModuleHeader num={2} title="Performance Tasks & Skills" sub="Complete by Day 90" />
              <Card>
                {m2.map(t => <TaskRow key={t.id} task={t} prog={progress[t.id]} emp={emp} onToggle={toggleDone} onCompetency={setCompetency} />)}
              </Card>
            </div>
          )}

          {tab === 'checkins' && (
            <div>
              <p style={{ fontSize: 14, color: '#666', marginBottom: '1rem' }}>Formal review schedule with your supervisors.</p>
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
          )}
        </>
      )}
    </div>
  )
}

function TaskRow({ task, prog, emp, onToggle, onCompetency }) {
  const isDone = !!prog?.done
  const isApproved = !!prog?.approved
  const left = getDaysLeft(emp.start_date, task.due_day)

  let urgency = null
  if (!isDone && left < 0) urgency = <Badge variant="red" style={{ marginLeft: 6 }}>Overdue {Math.abs(left)}d</Badge>
  else if (!isDone && left <= 5) urgency = <Badge variant="amber" style={{ marginLeft: 6 }}>Due in {left}d</Badge>

  return (
    <div style={{ padding: '11px 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div
          onClick={() => onToggle(task.id)}
          style={{
            width: 21, height: 21, borderRadius: 5, flexShrink: 0, marginTop: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: isApproved ? 'default' : 'pointer',
            background: isApproved ? '#7A1020' : isDone ? '#BA7517' : 'transparent',
            border: `1.5px solid ${isApproved ? '#7A1020' : isDone ? '#BA7517' : 'rgba(0,0,0,0.25)'}`,
            transition: 'all .15s',
          }}
        >
          {(isApproved || isDone) && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            {task.name}{urgency}
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>By: {task.conducted_by} · Due: {task.due_label}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 1 }}>{task.involves}</div>

          {isApproved && prog?.approved_supervisor && (
            <div style={{ background: '#F5E6E8', borderRadius: 8, padding: '7px 11px', fontSize: 12, color: '#7A1020', marginTop: 5 }}>
              ✓ Approved by <strong>{prog.approved_supervisor.name}</strong> (#{prog.approved_supervisor.emp_number}) on {formatDate(prog.approved_at)}
            </div>
          )}
          {isDone && !isApproved && (
            <Badge variant="amber" style={{ marginTop: 5, display: 'inline-block' }}>Pending supervisor approval</Badge>
          )}
          {isDone && !isApproved && (
            <div style={{ marginTop: 7 }}>
              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Self-rate competency:</label>
              <select
                value={prog?.self_competency || ''}
                onChange={e => onCompetency(task.id, e.target.value)}
                style={{ fontSize: 12, padding: '3px 6px', borderRadius: 6, border: '0.5px solid rgba(0,0,0,0.2)', fontFamily: 'inherit' }}
              >
                <option value="">Select…</option>
                {COMPETENCY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}
          {prog?.sup_note && (
            <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '8px 11px', fontSize: 13, marginTop: 6, color: '#555' }}>
              <strong>Note from {prog.note_supervisor?.name || 'supervisor'}</strong> ({formatDate(prog.sup_note_at)}): {prog.sup_note}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TabBar({ tabs, labels, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 3, background: '#f3f4f6', borderRadius: 8, padding: 3, marginBottom: '1.5rem' }}>
      {tabs.map((t, i) => (
        <button key={t} onClick={() => onChange(t)} style={{
          flex: 1, padding: '7px 6px', fontSize: 12, fontWeight: 500,
          border: active === t ? '0.5px solid rgba(0,0,0,0.12)' : 'none',
          background: active === t ? '#fff' : 'transparent',
          color: active === t ? '#111' : '#666',
          borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {labels[i]}
        </button>
      ))}
    </div>
  )
}

function ModuleHeader({ num, title, sub }) {
  const colors = { 1: { bg: '#FAECE7', color: '#993C1D' }, 2: { bg: '#E6F1FB', color: '#185FA5' } }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', ...colors[num], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500 }}>
        {num}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#666' }}>{sub}</div>
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: '#f3f4f6', borderRadius: 8, padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 500 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{label}</div>
    </div>
  )
}
