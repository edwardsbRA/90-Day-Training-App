export const CHECKINS = [
  {
    timing: 'End of Week 1',
    by: 'Safety Director & HR/Training Manager',
    focus: 'Module 1 completion, competency ratings, initials, and dates',
  },
  {
    timing: 'End of Month 1',
    by: 'Safety Director & Superintendent',
    focus: 'Early Module 2 skills competency and safety reinforcement',
  },
  {
    timing: 'End of Month 2',
    by: 'Safety Director & Superintendent',
    focus: 'Mid-point performance competency review',
  },
  {
    timing: 'Day 75',
    by: 'Safety Director & Superintendent',
    focus: 'Final task competency verification prior to 90-day review',
  },
  {
    timing: 'Day 90 Review',
    by: 'Superintendent (others as needed)',
    focus: 'Overall competency determination and next-step development plan',
  },
]

export const ADMIN_ROLES = ['Safety Director', 'HR/Training Manager']

export const COMPETENCY_OPTIONS = [
  'Not Yet Competent',
  'Competent w/ Coaching',
  'Competent',
]

export const AVATAR_BG = ['#E1F5EE','#E6F1FB','#FAEEDA','#FAECE7','#EAF3DE','#EEEDFE']
export const AVATAR_TX = ['#0F6E56','#185FA5','#854F0B','#993C1D','#3B6D11','#3C3489']

export function getAvatarIndex(name) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_BG.length
  return h
}

export function getInitials(name) {
  return name.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2)
}

export function getDayNumber(startDate) {
  try {
    const diff = Math.floor((new Date() - new Date(startDate)) / 864e5) + 1
    return Math.max(1, Math.min(90, diff))
  } catch {
    return 1
  }
}

export function getDaysLeft(startDate, dueDay) {
  return dueDay - getDayNumber(startDate)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
