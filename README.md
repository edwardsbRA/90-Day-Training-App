# Ritsema Associates — 90-Day Training Checklist

React + Supabase app for tracking new hire onboarding progress.

---

## Quick-start (local dev)

### 1. Prerequisites
- Node.js 18+ installed
- A free Supabase account at https://supabase.com

### 2. Set up Supabase
1. Create a new Supabase project (any region, any password)
2. Go to SQL Editor → New query
3. Paste the entire contents of supabase-schema.sql and click Run
4. Go to Project Settings → API and copy:
   - Project URL (looks like https://xxxx.supabase.co)
   - anon public key (long JWT string)

### 3. Configure environment variables
Copy .env.example to .env.local and fill in your values:

  VITE_SUPABASE_URL=https://your-project-id.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key-here

### 4. Install and run
  npm install
  npm run dev

App will be available at http://localhost:5173

---

## Deploy to Vercel

1. Push to GitHub:
     git init && git add . && git commit -m "Initial commit"
     git remote add origin https://github.com/YOUR_USERNAME/ritsema-training.git
     git push -u origin main

2. Go to vercel.com → Add New Project → Import your GitHub repo
3. Under Environment Variables, add:
     VITE_SUPABASE_URL      your Supabase project URL
     VITE_SUPABASE_ANON_KEY your Supabase anon key
4. Click Deploy — live in ~60 seconds.

---

## Default seeded accounts

Supervisors (name must match emp_number in DB):
  Ray Kowalski  SUP-0021  Safety Director (Admin)
  Mia Chen      SUP-0047  HR/Training Manager (Admin)
  Dana Torres   SUP-0088  Foreman

Employees are created by admins via the Admin panel.

---

## Project structure

  src/
  ├── components/
  │   ├── UI.jsx                  Shared UI components
  │   ├── LoginPage.jsx           Login screen
  │   ├── EmployeeDashboard.jsx   Employee view
  │   └── SupervisorDashboard.jsx Supervisor + Admin view
  ├── data/constants.js           Static data and helpers
  ├── lib/
  │   ├── supabase.js             Supabase client
  │   ├── api.js                  All DB calls
  │   └── AuthContext.jsx         Session management
  ├── App.jsx
  └── index.css
  supabase-schema.sql             Paste into Supabase SQL Editor
  .env.example                    Copy to .env.local
