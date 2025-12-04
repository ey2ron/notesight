import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export function ProtectedRoute({ redirectTo = "/login" }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}
