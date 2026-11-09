import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/hooks'

export default function RoleGuard({ roles, children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return <Navigate replace state={{ from: location.pathname }} to="/login" />
  if (!roles.includes(user.role)) return <Navigate replace to="/not-found" />
  return children
}
