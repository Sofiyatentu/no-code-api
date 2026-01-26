"use client"

import { Link, useLocation } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { logout } from "../store/slices/authSlice"

export default function AdminSidebar() {
  const location = useLocation()
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)

  const navItems = [
    { path: "/admin", label: "Dashboard", icon: "📊" },
    { path: "/admin/users", label: "Users", icon: "👥" },
    { path: "/admin/audit-logs", label: "Audit Logs", icon: "📋" },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="w-64 bg-slate-900 border-r border-cyan-500 flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold text-white">NoCodeAPI</h1>
        <p className="text-cyan-400 text-sm">Admin Panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded mb-2 transition-colors ${
              isActive(item.path) ? "bg-cyan-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-cyan-400"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User Section */}
      <div className="border-t border-slate-700 p-4">
        <div className="bg-slate-800 rounded p-3 mb-3">
          <p className="text-slate-400 text-xs">Logged in as</p>
          <p className="text-white font-medium">{user?.email}</p>
          <p className="text-cyan-400 text-xs">Super Admin</p>
        </div>
        <button
          onClick={() => dispatch(logout())}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
