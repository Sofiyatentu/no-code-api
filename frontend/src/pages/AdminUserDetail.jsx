"use client"

import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import axios from "axios"
import AdminSidebar from "../components/AdminSidebar"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"

export default function AdminUserDetail() {
  const { userId } = useParams()
  const [profile, setProfile] = useState(null)
  const [activity, setActivity] = useState([])
  const [projects, setProjects] = useState([])
  const [flows, setFlows] = useState([])
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  const token = localStorage.getItem("token")

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const [profileRes, activityRes, projectsRes, flowsRes, usageRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/admin/users/${userId}/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`http://localhost:5000/api/admin/users/${userId}/activity?limit=20`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`http://localhost:5000/api/admin/users/${userId}/projects-stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`http://localhost:5000/api/admin/users/${userId}/flows-stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`http://localhost:5000/api/admin/users/${userId}/usage`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        setProfile(profileRes.data)
        setActivity(activityRes.data)
        setProjects(projectsRes.data)
        setFlows(flowsRes.data)
        setUsage(usageRes.data)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching user details:", error)
        setLoading(false)
      }
    }

    fetchUserDetails()
  }, [userId, token])

  if (loading) return <div className="p-8 text-center">Loading user details...</div>

  return (
    <div className="flex h-screen bg-slate-950">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{profile?.user?.email}</h1>
                <p className="text-slate-400">Username: {profile?.user?.username}</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 font-bold text-xl">{profile?.status.toUpperCase()}</p>
                <p className="text-cyan-400">{profile?.tier.toUpperCase()} Tier</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-slate-900 border-cyan-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-cyan-400 text-sm">Account Age</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{profile?.stats?.accountAge}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-emerald-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-emerald-400 text-sm">Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{profile?.stats?.totalProjects}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-400 text-sm">Flows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{profile?.stats?.totalFlows}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-purple-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-purple-400 text-sm">API Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{profile?.stats?.totalRequests}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-slate-700">
            {["overview", "projects", "flows", "activity"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === tab ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-slate-900 border-cyan-500">
                <CardHeader>
                  <CardTitle className="text-white">Usage Summary (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Requests</span>
                      <span className="text-white font-bold">{usage?.totalRequests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Successful</span>
                      <span className="text-emerald-400 font-bold">{usage?.successfulRequests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Failed</span>
                      <span className="text-red-400 font-bold">{usage?.failedRequests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Success Rate</span>
                      <span className="text-cyan-400 font-bold">{usage?.successRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Avg Response Time</span>
                      <span className="text-blue-400 font-bold">{usage?.avgResponseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Data Processed</span>
                      <span className="text-purple-400 font-bold">{usage?.totalDataProcessed}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-emerald-500">
                <CardHeader>
                  <CardTitle className="text-white">Rate Limits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Per Minute</span>
                      <span className="text-white font-bold">{profile?.rateLimits?.requestsPerMinute}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Per Hour</span>
                      <span className="text-white font-bold">{profile?.rateLimits?.requestsPerHour}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Per Day</span>
                      <span className="text-white font-bold">{profile?.rateLimits?.requestsPerDay}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-slate-700">
                      <span className="text-slate-400">Current Tier</span>
                      <span className="text-cyan-400 font-bold">{profile?.tier}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === "projects" && (
            <Card className="bg-slate-900 border-emerald-500">
              <CardHeader>
                <CardTitle className="text-white">User Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-emerald-400">Project Name</th>
                        <th className="text-left py-3 px-4 text-emerald-400">Flows</th>
                        <th className="text-left py-3 px-4 text-emerald-400">Deployed</th>
                        <th className="text-left py-3 px-4 text-emerald-400">Requests</th>
                        <th className="text-left py-3 px-4 text-emerald-400">Last Request</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((project) => (
                        <tr key={project._id} className="border-b border-slate-800 hover:bg-slate-800">
                          <td className="py-3 px-4 text-white">{project.name}</td>
                          <td className="py-3 px-4 text-slate-400">{project.flowCount}</td>
                          <td className="py-3 px-4 text-emerald-400">{project.deployedFlows}</td>
                          <td className="py-3 px-4 text-white">{project.totalRequests}</td>
                          <td className="py-3 px-4 text-slate-400">
                            {project.lastRequest ? new Date(project.lastRequest).toLocaleDateString() : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flows Tab */}
          {activeTab === "flows" && (
            <Card className="bg-slate-900 border-blue-500">
              <CardHeader>
                <CardTitle className="text-white">User Flows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-blue-400">Flow Name</th>
                        <th className="text-left py-3 px-4 text-blue-400">Deployed</th>
                        <th className="text-left py-3 px-4 text-blue-400">Runs</th>
                        <th className="text-left py-3 px-4 text-blue-400">Success</th>
                        <th className="text-left py-3 px-4 text-blue-400">Avg Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flows.map((flow) => (
                        <tr key={flow._id} className="border-b border-slate-800 hover:bg-slate-800">
                          <td className="py-3 px-4 text-white">{flow.name}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-sm ${flow.deployed ? "bg-emerald-900 text-emerald-300" : "bg-slate-800 text-slate-400"}`}
                            >
                              {flow.deployed ? "Yes" : "No"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-white">{flow.totalRuns}</td>
                          <td className="py-3 px-4 text-emerald-400">{flow.successfulRuns}</td>
                          <td className="py-3 px-4 text-white">{flow.avgResponseTime}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <Card className="bg-slate-900 border-purple-500">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {activity.map((log, idx) => (
                    <div key={idx} className="border-l-2 border-purple-500 pl-4 py-2">
                      <div className="flex justify-between">
                        <span className="text-white font-medium">
                          {log.method} {log.path}
                        </span>
                        <span className={`text-sm ${log.status === 200 ? "text-emerald-400" : "text-red-400"}`}>
                          {log.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
