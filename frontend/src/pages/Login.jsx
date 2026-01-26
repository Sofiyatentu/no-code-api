"use client"

import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, Link } from "react-router-dom"
import { login } from "../store/slices/authSlice.js"

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" })
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error } = useSelector((state) => state.auth)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await dispatch(login(formData))
    if (result.payload && !result.error) {
      navigate("/dashboard")
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-full max-w-md p-8 rounded-lg border border-slate-800 bg-slate-900">
        <h2 className="text-2xl font-bold text-white mb-6">Login to NoCodeAPI</h2>

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
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-4">
          Don't have an account?{" "}
          <Link to="/signup" className="text-emerald-400 hover:underline">
            Signup
          </Link>
        </p>
      </div>
    </div>
  )
}
