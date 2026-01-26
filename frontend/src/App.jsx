"use client"

import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Routes, Route, Navigate } from "react-router-dom"
import { fetchCurrentUser } from "./store/slices/authSlice.js"
import ProtectedRoute from "./components/ProtectedRoute.jsx"
import AdminProtectedRoute from "./components/AdminProtectedRoute.jsx"
import Landing from "./pages/Landing.jsx"
import Login from "./pages/Login.jsx"
import Signup from "./pages/Signup.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import Builder from "./pages/Builder.jsx"
import ApiDocs from "./pages/ApiDocs.jsx"
import Playground from "./pages/Playground.jsx"
import Logs from "./pages/Logs.jsx"
import AdminDashboard from "./pages/AdminDashboard.jsx"
import AdminUsers from "./pages/AdminUsers.jsx"
import AdminUserDetail from "./pages/AdminUserDetail.jsx"
import AdminAuditLogs from "./pages/AdminAuditLogs.jsx"

function App() {
  const dispatch = useDispatch()
  const { isAuthenticated } = useSelector((state) => state.auth)

  useEffect(() => {
    dispatch(fetchCurrentUser())
  }, [dispatch])

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Signup />} />
      <Route path="/dashboard" element={<ProtectedRoute component={Dashboard} />} />
      <Route path="/project/:projectId/builder" element={<ProtectedRoute component={Builder} />} />
      <Route path="/project/:projectId/docs" element={<ProtectedRoute component={ApiDocs} />} />
      <Route path="/project/:projectId/playground" element={<ProtectedRoute component={Playground} />} />
      <Route path="/project/:projectId/logs" element={<ProtectedRoute component={Logs} />} />
      <Route path="/admin" element={<AdminProtectedRoute component={AdminDashboard} />} />
      <Route path="/admin/users" element={<AdminProtectedRoute component={AdminUsers} />} />
      <Route path="/admin/users/:userId" element={<AdminProtectedRoute component={AdminUserDetail} />} />
      <Route path="/admin/audit-logs" element={<AdminProtectedRoute component={AdminAuditLogs} />} />
    </Routes>
  )
}

export default App
