import { supabase } from './supabase'

// ─── Supervisors ───────────────────────────────────────────────────────────

export async function fetchSupervisors() {
  const { data, error } = await supabase
    .from('supervisors')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function fetchSupervisorByCredentials(name, empNumber) {
  const { data, error } = await supabase
    .from('supervisors')
    .select('*')
    .ilike('name', name.trim())
    .eq('emp_number', empNumber.trim())
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createSupervisor({ name, empNumber, role, email }) {
  const { data, error } = await supabase
    .from('supervisors')
    .insert({ name, emp_number: empNumber, role, email: email || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSupervisor(id, { name, empNumber, role, email }) {
  const { data, error } = await supabase
    .from('supervisors')
    .update({ name, emp_number: empNumber, role, email: email || null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSupervisor(id) {
  const { error } = await supabase.from('supervisors').delete().eq('id', id)
  if (error) throw error
}

// ─── Employees ────────────────────────────────────────────────────────────

export async function fetchEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function fetchEmployeeByCredentials(name, empNumber) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .ilike('name', name.trim())
    .eq('emp_number', empNumber.trim())
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createEmployee({ name, empNumber, hireType, startDate, createdBy, email }) {
  const { data, error } = await supabase
    .from('employees')
    .insert({
      name,
      emp_number: empNumber,
      hire_type: hireType,
      start_date: startDate || new Date().toISOString().split('T')[0],
      created_by: createdBy || null,
      email: email || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEmployee(id, { name, empNumber, hireType, startDate, email }) {
  const { data, error } = await supabase
    .from('employees')
    .update({ name, emp_number: empNumber, hire_type: hireType, start_date: startDate, email: email || null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Tasks ────────────────────────────────────────────────────────────────

export async function fetchTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('module')
    .order('sort_order')
  if (error) throw error
  return data
}

export async function createTask({ module, name, conductedBy, dueDay, dueLabel, involves }) {
  const { data: existing } = await supabase
    .from('tasks')
    .select('sort_order')
    .eq('module', module)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sortOrder = existing ? existing.sort_order + 1 : 1

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      module,
      name,
      conducted_by: conductedBy,
      due_day: dueDay,
      due_label: dueLabel,
      involves,
      sort_order: sortOrder,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTask(id, { name, conductedBy, dueDay, dueLabel, involves }) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ name, conducted_by: conductedBy, due_day: dueDay, due_label: dueLabel, involves })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

// ─── Employee Task Progress ───────────────────────────────────────────────

export async function fetchEmployeeTaskProgress(employeeId) {
  const { data, error } = await supabase
    .from('employee_tasks')
    .select(`
      *,
      approved_supervisor:approved_by(name, emp_number),
      note_supervisor:sup_note_by(name)
    `)
    .eq('employee_id', employeeId)
  if (error) throw error
  // return as a map keyed by task_id
  return Object.fromEntries((data || []).map(r => [r.task_id, r]))
}

export async function upsertTaskDone(employeeId, taskId, done) {
  const { error } = await supabase.from('employee_tasks').upsert(
    {
      employee_id: employeeId,
      task_id: taskId,
      done,
      done_at: done ? new Date().toISOString() : null,
    },
    { onConflict: 'employee_id,task_id' }
  )
  if (error) throw error
}

export async function upsertSelfCompetency(employeeId, taskId, competency) {
  const { error } = await supabase.from('employee_tasks').upsert(
    { employee_id: employeeId, task_id: taskId, self_competency: competency },
    { onConflict: 'employee_id,task_id' }
  )
  if (error) throw error
}

export async function approveTask(employeeId, taskId, supervisorId, supCompetency) {
  const { error } = await supabase.from('employee_tasks').upsert(
    {
      employee_id: employeeId,
      task_id: taskId,
      approved: true,
      approved_by: supervisorId,
      approved_at: new Date().toISOString(),
      sup_competency: supCompetency || null,
    },
    { onConflict: 'employee_id,task_id' }
  )
  if (error) throw error
}

export async function saveSupNote(employeeId, taskId, supervisorId, note) {
  const { error } = await supabase.from('employee_tasks').upsert(
    {
      employee_id: employeeId,
      task_id: taskId,
      sup_note: note,
      sup_note_by: supervisorId,
      sup_note_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id,task_id' }
  )
  if (error) throw error
}

export async function clearSupNote(employeeId, taskId) {
  const { error } = await supabase.from('employee_tasks').upsert(
    { employee_id: employeeId, task_id: taskId, sup_note: null, sup_note_by: null, sup_note_at: null },
    { onConflict: 'employee_id,task_id' }
  )
  if (error) throw error
}

// ─── Modules ──────────────────────────────────────────────────────────────

export async function fetchModules() {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .order('number')
  if (error) throw error
  return data
}

export async function createModule(number, name) {
  const { data, error } = await supabase
    .from('modules')
    .insert({ number, name })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteModule(number) {
  await supabase.from('tasks').delete().eq('module', number)
  const { error } = await supabase.from('modules').delete().eq('number', number)
  if (error) throw error
}

// ─── Pending approvals across all employees ───────────────────────────────

export async function fetchPendingApprovals() {
  const { data, error } = await supabase
    .from('employee_tasks')
    .select(`
      *,
      employee:employee_id(id, name, emp_number, hire_type, start_date),
      task:task_id(id, module, name, conducted_by, due_day, due_label)
    `)
    .eq('done', true)
    .eq('approved', false)
    .order('done_at')
  if (error) throw error
  return data || []
}

// ─── Notifications ──────────────────────────────────────────────────────────

export async function fetchNotifications(recipientType, recipientId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_type', recipientType)
    .eq('recipient_id', recipientId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}

export async function createNotification({ recipientType, recipientId, type, title, message, employeeId, taskId }) {
  const { error } = await supabase.from('notifications').insert({
    recipient_type: recipientType,
    recipient_id: recipientId,
    type, title, message,
    employee_id: employeeId || null,
    task_id: taskId || null,
  })
  if (error) throw error
}

export async function createNotifications(rows) {
  if (!rows.length) return
  const { error } = await supabase.from('notifications').insert(rows)
  if (error) throw error
}

export async function markNotificationRead(id) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead(recipientType, recipientId) {
  const { error } = await supabase.from('notifications').update({ read: true })
    .eq('recipient_type', recipientType).eq('recipient_id', recipientId).eq('read', false)
  if (error) throw error
}

export async function fetchTaskNotificationSettings() {
  const { data, error } = await supabase.from('task_notification_settings').select('*')
  if (error) throw error
  return data || []
}

export async function upsertTaskNotificationSetting(taskId, notifyAtDays, enabled) {
  const { error } = await supabase.from('task_notification_settings')
    .upsert({ task_id: taskId, notify_at_days: notifyAtDays, enabled }, { onConflict: 'task_id' })
  if (error) throw error
}

export async function sendEmailNotification({ to, subject, html }) {
  if (!to) return
  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    })
  } catch (err) {
    console.error('Email send failed:', err)
  }
}
