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

export async function createSupervisor({ name, empNumber, role }) {
  const { data, error } = await supabase
    .from('supervisors')
    .insert({ name, emp_number: empNumber, role })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSupervisor(id, { name, empNumber, role }) {
  const { data, error } = await supabase
    .from('supervisors')
    .update({ name, emp_number: empNumber, role })
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

export async function createEmployee({ name, empNumber, hireType, startDate, createdBy }) {
  const { data, error } = await supabase
    .from('employees')
    .insert({
      name,
      emp_number: empNumber,
      hire_type: hireType,
      start_date: startDate || new Date().toISOString().split('T')[0],
      created_by: createdBy || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEmployee(id, { name, empNumber, hireType, startDate }) {
  const { data, error } = await supabase
    .from('employees')
    .update({ name, emp_number: empNumber, hire_type: hireType, start_date: startDate })
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
