"use client"

import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { fetchAuditLogs } from "../store/slices/adminSlice"
import AdminSidebar from "../components/AdminSidebar"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"

export default function AdminAuditLogs() {
  const dispatch = useDispatch()
  const { auditLogs, loading } = useSelector((state) => state.admin)
  const [action, setAction] = useState("")
  const [email, setEmail] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    dispatch(fetchAuditLogs({ page, action: action || undefined, targetEmail: email || undefined }))
  }, [dispatch, page, action, email])

  if (loading) return <div className="p-8 text-center">Loading audit logs...</div>

  const { logs = [], pagination = {} } = auditLogs || {}

  const actionColors = {
    user_created: "text-cyan-400",
    user_updated: "text-blue-400",
    user_banned: "text-red-400",
    user_deleted: "text-red-600",
    flow_reviewed: "text-yellow-400",
    flow_approved: "text-emerald-400",
    system_config_changed: "text-orange-400",
    rate_limit_set: "text-purple-400",
  }

  return (
    <div className="flex h-screen bg-slate-950">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <h1 className="text-4xl font-bold text-white mb-8">Audit Logs</h1>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Input
              placeholder="Filter by email..."
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setPage(1)
              }}
              className="bg-slate-900 border-cyan-500 text-white"
            />
            <Input
              placeholder="Filter by action..."
              value={action}
              onChange={(e) => {
                setAction(e.target.value)
                setPage(1)
              }}
              className="bg-slate-900 border-cyan-500 text-white"
            />
          </div>

          {/* Logs Table */}
          <Card className="bg-slate-900 border-cyan-500">
            <CardHeader>
              <CardTitle className="text-white">Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-cyan-400">Timestamp</th>
                      <th className="text-left py-3 px-4 text-cyan-400">Admin</th>
                      <th className="text-left py-3 px-4 text-cyan-400">Action</th>
                      <th className="text-left py-3 px-4 text-cyan-400">Target</th>
                      <th className="text-left py-3 px-4 text-cyan-400">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log._id} className="border-b border-slate-800 hover:bg-slate-800">
                        <td className="py-3 px-4 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="py-3 px-4 text-white">{log.adminId?.userId || "System"}</td>
                        <td className={`py-3 px-4 font-medium ${actionColors[log.action] || "text-white"}`}>
                          {log.action.replace(/_/g, " ").toUpperCase()}
                        </td>
                        <td className="py-3 px-4 text-slate-400">{log.targetEmail || log.targetType}</td>
                        <td className="py-3 px-4 text-slate-400 text-sm">{log.reason || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-6">
                <p className="text-slate-400">
                  Page {pagination.currentPage} of {pagination.pages} (Total: {pagination.total})
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white px-4 py-2 rounded"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                    disabled={page === pagination.pages}
                    className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white px-4 py-2 rounded"
                  >
                    Next
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
