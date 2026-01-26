"use client"

import { useState, useMemo } from "react"
import { SearchIcon, XIcon } from "./Icons.jsx"

const NODE_TYPES = {
  httpMethod: {
    label: "HTTP Method",
    icon: "🌐",
    description: "Define API endpoint",
  },
  dbNode: {
    label: "Database",
    icon: "🗄️",
    description: "MongoDB operations",
  },
  condition: {
    label: "Condition",
    icon: "❓",
    description: "If/Else branching",
  },
  tryCatch: {
    label: "Try/Catch",
    icon: "🛡️",
    description: "Error handling",
  },
  response: {
    label: "Response",
    icon: "📤",
    description: "HTTP response",
  },
  transform: {
    label: "Transform",
    icon: "🔄",
    description: "Data transformation",
  },
  logging: {
    label: "Logging",
    icon: "📝",
    description: "Log messages",
  },
  assign: {
    label: "Assign",
    icon: "📌",
    description: "Set variables",
  },
  delay: {
    label: "Delay",
    icon: "⏱️",
    description: "Add delay",
  },
}

export default function NodeSearch({ onSelect, onClose }) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) {
      return Object.entries(NODE_TYPES)
    }

    const query = searchQuery.toLowerCase()
    return Object.entries(NODE_TYPES).filter(
      ([_, node]) => node.label.toLowerCase().includes(query) || node.description.toLowerCase().includes(query),
    )
  }, [searchQuery])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg border border-slate-700 w-full max-w-md p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Add Node</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1"
            aria-label="Close search"
          >
            <XIcon />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <div className="absolute left-3 top-3 text-slate-400">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Node List */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredNodes.length > 0 ? (
            filteredNodes.map(([key, node]) => (
              <button
                key={key}
                onClick={() => {
                  onSelect(key)
                  onClose()
                }}
                className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 hover:border-cyan-500 transition text-left"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{node.icon}</span>
                  <div>
                    <div className="font-semibold text-white text-sm">{node.label}</div>
                    <div className="text-xs text-slate-400">{node.description}</div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">No nodes found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            {filteredNodes.length} node{filteredNodes.length !== 1 ? "s" : ""} available
          </p>
        </div>
      </div>
    </div>
  )
}
