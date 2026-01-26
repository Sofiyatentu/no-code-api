"use client"

import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, Link } from "react-router-dom"
import { signup } from "../store/slices/authSlice.js"

export default function Signup() {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    firstName: "",
    lastName: "",
  })
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error } = useSelector((state) => state.auth)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await dispatch(signup(formData))
    if (result.payload && !result.error) {
      navigate("/dashboard")
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-full max-w-md p-8 rounded-lg border border-slate-800 bg-slate-900">
        <h2 className="text-2xl font-bold text-white mb-6">Create NoCodeAPI Account</h2>

        {error && <div className="p-4 mb-4 rounded bg-red-900 text-red-100">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-2 rounded bg-slate-800 text-white border border-slate-700 placeholder-slate-500"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Username"
            className="w-full px-4 py-2 rounded bg-slate-800 text-white border border-slate-700 placeholder-slate-500"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="First Name"
              className="px-4 py-2 rounded bg-slate-800 text-white border border-slate-700 placeholder-slate-500"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <input
              type="text"
              placeholder="Last Name"
              className="px-4 py-2 rounded bg-slate-800 text-white border border-slate-700 placeholder-slate-500"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-2 rounded bg-slate-800 text-white border border-slate-700 placeholder-slate-500"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Signup"}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-emerald-400 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
