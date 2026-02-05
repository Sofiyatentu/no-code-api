"use client"

import { useParams, Link } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { useEffect } from "react"
import { fetchFlows } from "../store/slices/flowsSlice.js"

export default function ApiDocs() {
  const { projectId } = useParams()
  const dispatch = useDispatch()
  const { flows } = useSelector((state) => state.flows)

  useEffect(() => {
    dispatch(fetchFlows(projectId))
  }, [dispatch, projectId])

  const deployedFlows = flows.filter((f) => f.deployed)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-8 py-4">
        <Link to="/dashboard" className="text-emerald-400 hover:underline text-sm">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold mt-2">API Documentation</h1>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-12">
        {deployedFlows.length === 0 ? (
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
            <h2 className="text-xl font-bold mb-4">Endpoints</h2>
            <p className="text-slate-400">
              No deployed endpoints yet. Deploy a flow from the builder to see documentation here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {deployedFlows.map((flow) => (
              <div key={flow.id} className="bg-slate-900 rounded-lg border border-slate-800 p-6">
                <h3 className="text-lg font-bold mb-2">{flow.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{flow.description || "No description"}</p>
                <div className="bg-slate-800 rounded p-3 font-mono text-sm mb-4">
                  <div className="text-cyan-400">GET /api/{"<username>/<projectSlug>"}</div>
                  <div className="text-slate-400 text-xs mt-2">
                    Deployed at: {new Date(flow.deployedAt).toLocaleString()}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Example Request</h4>
                    <div className="bg-slate-800 rounded p-2 font-mono text-xs text-slate-300 overflow-x-auto">
                      curl -X GET "http://localhost:5000/api/user/project"
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Example Response</h4>
                    <div className="bg-slate-800 rounded p-2 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre">
                      {JSON.stringify({ data: [] }, null, 2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
