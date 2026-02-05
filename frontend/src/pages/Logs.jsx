"use client"

import { useParams, Link } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { useEffect } from "react"
import { fetchLogs } from "../store/slices/logsSlice.js"

export default function Logs() {
  const { projectId } = useParams()
  const dispatch = useDispatch()
  const { logs, loading } = useSelector((state) => state.logs)

  useEffect(() => {
    dispatch(fetchLogs(projectId))
  }, [dispatch, projectId])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-8 py-4">
        <Link to="/dashboard" className="text-emerald-400 hover:underline text-sm">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold mt-2">Request Logs</h1>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-12">
        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-slate-400">No logs yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-2">Time</th>
                  <th className="text-left px-4 py-2">Method</th>
                  <th className="text-left px-4 py-2">Path</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-800 hover:bg-slate-900">
                    <td className="px-4 py-2 text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm font-mono">{log.method}</td>
                    <td className="px-4 py-2 text-sm font-mono text-cyan-400">{log.path}</td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          log.status >= 200 && log.status < 300
                            ? "bg-emerald-900 text-emerald-200"
                            : log.status >= 400
                              ? "bg-red-900 text-red-200"
                              : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-400">{log.duration}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
