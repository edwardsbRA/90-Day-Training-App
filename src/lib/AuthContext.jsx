import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const SESSION_KEY = 'ra_training_session'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  function signInEmployee(employee) {
    const s = { type: 'employee', user: employee }
    localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    setSession(s)
  }

  function signInSupervisor(supervisor) {
    const s = { type: 'supervisor', user: supervisor }
    localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    setSession(s)
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, signInEmployee, signInSupervisor, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
