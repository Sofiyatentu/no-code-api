import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function AdminProtectedRoute({ component: Component }) {
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  // 1️⃣ Block everything while auth is loading
  if (loading) {
    return <div>Loading...</div>; // or spinner
  }

  // 2️⃣ If not authenticated → go to login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // 3️⃣ If user is not fully loaded yet → don't redirect early
  if (!user) {
    return <div>Loading user...</div>;
  }

  // 4️⃣ Now check admin role
  const isAdmin = user.role === "admin" || user.role === "super_admin";

  if (!isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return <Component />;
}
