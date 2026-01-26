"use client"

import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { fetchDashboardAnalytics } from "../store/slices/adminSlice"
import AdminSidebar from "../components/AdminSidebar"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export default function AdminDashboard() {
  const dispatch = useDispatch()
  const { dashboard, loading } = useSelector((state) => state.admin)

  useEffect(() => {
    dispatch(fetchDashboardAnalytics())
  }, [dispatch])

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>

  const { summary, dailyStats } = dashboard || {}

  return (
    <div className="flex h-screen bg-slate-950">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <h1 className="text-4xl font-bold text-white mb-8">Dashboard</h1>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-slate-900 border-cyan-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-cyan-400 text-sm font-medium">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{summary?.totalUsers || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-emerald-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-emerald-400 text-sm font-medium">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{summary?.activeUsers || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-orange-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-orange-400 text-sm font-medium">Suspended</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{summary?.suspendedUsers || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-red-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-red-400 text-sm font-medium">Banned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{summary?.bannedUsers || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card className="bg-slate-900 border-cyan-500">
              <CardHeader>
                <CardTitle className="text-white">Daily API Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyStats || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="_id" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #0891b2" }} />
                    <Legend />
                    <Line type="monotone" dataKey="totalRequests" stroke="#0891b2" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-emerald-500">
              <CardHeader>
                <CardTitle className="text-white">Avg Response Time (ms)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyStats || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="_id" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #059669" }} />
                    <Legend />
                    <Line type="monotone" dataKey="avgResponseTime" stroke="#059669" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Project & Flow Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900 border-cyan-500">
              <CardHeader>
                <CardTitle className="text-cyan-400 text-sm">Total Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{summary?.totalProjects || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-emerald-500">
              <CardHeader>
                <CardTitle className="text-emerald-400 text-sm">Total Flows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{summary?.totalFlows || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-purple-500">
              <CardHeader>
                <CardTitle className="text-purple-400 text-sm">Total Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{summary?.totalRequests || 0}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
