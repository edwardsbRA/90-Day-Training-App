-- ============================================================
-- Ritsema Associates 90-Day Training Checklist — Supabase Schema
-- Paste this entire file into the Supabase SQL Editor and run it.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────
-- SUPERVISORS
-- ─────────────────────────────────────────
create table if not exists supervisors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  emp_number  text not null unique,
  role        text not null check (role in ('Safety Director','HR/Training Manager','Foreman','Superintendent')),
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- EMPLOYEES
-- ─────────────────────────────────────────
create table if not exists employees (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  emp_number  text not null unique,
  hire_type   text not null check (hire_type in ('New Hire','Apprentice')),
  start_date  date not null default current_date,
  created_by  uuid references supervisors(id),
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- TASKS  (the master task list, editable by admins)
-- ─────────────────────────────────────────
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  module      int not null check (module in (1, 2)),
  name        text not null,
  conducted_by text not null,
  due_day     int not null,
  due_label   text not null,
  involves    text not null,
  sort_order  int not null default 0,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- EMPLOYEE TASK PROGRESS
-- ─────────────────────────────────────────
create table if not exists employee_tasks (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references employees(id) on delete cascade,
  task_id         uuid not null references tasks(id) on delete cascade,
  done            boolean not null default false,
  done_at         timestamptz,
  self_competency text check (self_competency in ('Not Yet Competent','Competent w/ Coaching','Competent') or self_competency is null),
  approved        boolean not null default false,
  approved_by     uuid references supervisors(id),
  approved_at     timestamptz,
  sup_competency  text check (sup_competency in ('Not Yet Competent','Competent w/ Coaching','Competent') or sup_competency is null),
  sup_note        text,
  sup_note_by     uuid references supervisors(id),
  sup_note_at     timestamptz,
  unique (employee_id, task_id)
);

-- ─────────────────────────────────────────
-- SEED: Default supervisors
-- ─────────────────────────────────────────
insert into supervisors (name, emp_number, role) values
  ('Ray Kowalski',  'SUP-0021', 'Safety Director'),
  ('Mia Chen',      'SUP-0047', 'HR/Training Manager'),
  ('Dana Torres',   'SUP-0088', 'Foreman')
on conflict (emp_number) do nothing;

-- ─────────────────────────────────────────
-- SEED: Default tasks — Module 1
-- ─────────────────────────────────────────
insert into tasks (module, name, conducted_by, due_day, due_label, involves, sort_order) values
  (1, 'Injury Reporting Process',               'Safety Director',          7, 'Week 1', 'Policies, legal requirements, reporting workflow, documentation.', 1),
  (1, 'PPE Use',                                'Safety Director',          7, 'Week 1', 'PPE requirements, inspection, use, maintenance.', 2),
  (1, 'Fall Protection',                        'Safety Director',          7, 'Week 1', 'Equipment selection, inspection, installation, demonstrations.', 3),
  (1, 'Scaffold Safety',                        'Safety Director',          7, 'Week 1', 'Scaffold types, inspection, access, documentation.', 4),
  (1, 'Aerial Work Platforms (Safety Orientation)', 'Safety Director',      7, 'Week 1', 'Hazards, limitations, inspection requirements (no hands-on).', 5),
  (1, 'New Hire Safety Orientation',            'Safety Director & HR',     7, 'Week 1', 'Safety culture, stop-work authority, expectations.', 6)
on conflict do nothing;

-- ─────────────────────────────────────────
-- SEED: Default tasks — Module 2
-- ─────────────────────────────────────────
insert into tasks (module, name, conducted_by, due_day, due_label, involves, sort_order) values
  (2, 'General Tool Knowledge',                 'Foreman',                  30, 'Day 30',        'Tool identification, safe use, maintenance.', 1),
  (2, 'Basic Framing Knowledge',                'Foreman',                  45, 'Day 45',        'Framing materials, layout, installation, and drywall grid.', 2),
  (2, 'General ACT Knowledge',                  'Foreman',                  60, 'Day 60',        'ACT systems, installation. TEG/Lay-in/Layout/Grid install.', 3),
  (2, 'Basic Drywall Assembly',                 'Foreman',                  75, 'Day 75',        'Drywall installation, measurements, cutting, screw placement.', 4),
  (2, 'PPE Use (Field)',                        'Foreman',                   7, 'Week 1',        'PPE requirements, inspection, use, maintenance.', 5),
  (2, 'Fall Protection (Field)',                'Foreman',                   7, 'Week 1',        'Equipment selection, inspection, installation, use/wear.', 6),
  (2, 'Scaffold Safety (Field)',                'Foreman',                   7, 'Week 1',        'Scaffold types, inspection, access, documentation.', 7),
  (2, 'Aerial Work Platforms (Operation)',       'Foreman',                  75, 'Day 75',        'Hands-on operation and proficiency verification.', 8),
  (2, 'First Aid / CPR',                        'HR/Training Manager or Vendor', 89, 'Before Day 90', 'Certification training.', 9)
on conflict do nothing;

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS and allow anon reads/writes via service_role key.
-- For production, restrict these further with auth policies.
-- ─────────────────────────────────────────
alter table supervisors   enable row level security;
alter table employees     enable row level security;
alter table tasks         enable row level security;
alter table employee_tasks enable row level security;

-- Allow full access via the service_role key (your backend/server-side key)
create policy "service role full access supervisors"   on supervisors   for all using (true) with check (true);
create policy "service role full access employees"     on employees     for all using (true) with check (true);
create policy "service role full access tasks"         on tasks         for all using (true) with check (true);
create policy "service role full access employee_tasks" on employee_tasks for all using (true) with check (true);
