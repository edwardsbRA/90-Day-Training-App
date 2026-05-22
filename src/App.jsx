import { AuthProvider, useAuth } from './lib/AuthContext'
import LoginPage from './components/LoginPage'
import EmployeeDashboard from './components/EmployeeDashboard'
import SupervisorDashboard from './components/SupervisorDashboard'

function AppContent() {
  const { session } = useAuth()
  if (!session) return <LoginPage />
  if (session.type === 'employee') return <EmployeeDashboard />
  if (session.type === 'supervisor') return <SupervisorDashboard />
  return <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
