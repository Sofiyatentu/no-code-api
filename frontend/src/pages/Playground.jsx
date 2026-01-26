"use client"

import { useParams, Link } from "react-router-dom"
import { useState } from "react"
import axios from "axios"

export default function Playground() {
  const { projectId } = useParams()
  const [method, setMethod] = useState("GET")
  const [path, setPath] = useState("/")
  const [headers, setHeaders] = useState({})
  const [body, setBody] = useState("")
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      const config = {
        method,
        url: `http://localhost:5000/api/${user.username}/${projectId}${path}`,
        headers: { Authorization: `Bearer ${token}`, ...headers },
      }

      if (method !== "GET" && body) {
        config.data = JSON.parse(body)
      }

      const result = await axios(config)
      setResponse({
        status: result.status,
        headers: result.headers,
        data: result.data,
      })
    } catch (error) {
      setResponse({
        status: error.response?.status || 500,
        error: error.response?.data?.error || error.message,
      })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-8 py-4">
        <Link to="/dashboard" className="text-emerald-400 hover:underline text-sm">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold mt-2">API Playground</h1>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-12">
        <div className="grid grid-cols-2 gap-8">
          {/* Request */}
          <div>
            <h2 className="text-xl font-bold mb-4">Request</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-slate-800 text-white border border-slate-700"
                >
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>PATCH</option>
                  <option>DELETE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2">Path</label>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-slate-800 text-white border border-slate-700"
                  placeholder="/"
                />
              </div>
              {(method === "POST" || method === "PUT" || method === "PATCH") && (
                <div>
                  <label className="block text-sm mb-2">Body (JSON)</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full px-4 py-2 rounded bg-slate-800 text-white border border-slate-700 font-mono text-sm"
                    rows={6}
                    placeholder='{"key": "value"}'
                  />
                </div>
              )}
              <button
                onClick={handleSend}
                disabled={loading}
                className="w-full px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 font-semibold"
              >
                {loading ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>

          {/* Response */}
          <div>
            <h2 className="text-xl font-bold mb-4">Response</h2>
            <div className="p-4 rounded bg-slate-900 border border-slate-800 font-mono text-sm overflow-auto max-h-96">
              {response ? (
                <div>
                  <div className="text-cyan-400 mb-2">Status: {response.status}</div>
                  <div className="text-slate-400 whitespace-pre-wrap">
                    {JSON.stringify(response.data || response.error, null, 2)}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500">Response will appear here</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
