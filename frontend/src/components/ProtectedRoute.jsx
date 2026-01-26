import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

export default function ProtectedRoute({ component: Component }) {
  const { isAuthenticated } = useSelector((state) => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return <Component />
}
