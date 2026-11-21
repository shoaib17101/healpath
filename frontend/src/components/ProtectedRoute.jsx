import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  // Not logged in → send to sign in
  if (!token) {
    return <Navigate to="/" replace />
  }

  // Wrong role → send to their own dashboard
  if (allowedRole && role !== allowedRole) {
    if (role === 'doctor') return <Navigate to="/dashboard" replace />
    if (role === 'patient') return <Navigate to="/patient-dashboard" replace />
    return <Navigate to="/" replace />
  }

  return children
}
