"use client"

import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useParams, Link } from "react-router-dom"
import { ReactFlowProvider } from "reactflow"
import {
  fetchFlows,
  createFlow,
  deployFlow,
  setCurrentFlow,
  fetchFlow,
} from "../store/slices/flowsSlice.js"
import FlowEditor from "../components/FlowEditor.jsx"
import { ChevronLeft, ChevronRight, Menu, Palette, X } from "lucide-react"

export default function Builder() {
  const { projectId } = useParams()
  const dispatch = useDispatch()
  const { flows, currentFlow, loading } = useSelector((state) => state.flows)

  // State for open tabs and active tab
  const [openTabs, setOpenTabs] = useState([]) // [{ id, name }]
  const [activeTabId, setActiveTabId] = useState(null)

  // Sidebar states
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)

  // Load flows
  useEffect(() => {
    dispatch(fetchFlows(projectId))
  }, [dispatch, projectId])

  // Restore open tabs from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`flowTabs_${projectId}`)
    if (saved) {
      const parsed = JSON.parse(saved)
      setOpenTabs(parsed.tabs || [])
      setActiveTabId(parsed.activeTabId || null)
    }
  }, [projectId])

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    if (openTabs.length > 0) {
      localStorage.setItem(
        `flowTabs_${projectId}`,
        JSON.stringify({ tabs: openTabs, activeTabId })
      )
    }
  }, [openTabs, activeTabId, projectId])

  // Open a flow in a tab
  const openFlowTab = async (flow) => {
    // If already open, just activate
    if (openTabs.some((tab) => tab.id === flow.id)) {
      setActiveTabId(flow.id)
      dispatch(setCurrentFlow(flow))
      return
    }

    // Fetch full flow data if not already loaded
    if (!flow.nodes) {
      const result = await dispatch(fetchFlow(flow.id))
      if (fetchFlow.fulfilled.match(result)) {
        flow = result.payload
      }
    }

    // Add to tabs
    setOpenTabs((prev) => [...prev, { id: flow.id, name: flow.name }])
    setActiveTabId(flow.id)
    dispatch(setCurrentFlow(flow))
  }

  const closeTab = (tabId, e) => {
    e.stopPropagation()
    setOpenTabs((prev) => {
      const filtered = prev.filter((tab) => tab.id !== tabId)
      if (activeTabId === tabId && filtered.length > 0) {
        setActiveTabId(filtered[filtered.length - 1].id)
      } else if (filtered.length === 0) {
        setActiveTabId(null)
        dispatch(setCurrentFlow(null))
      }
      return filtered
    })
  }

  const handleCreateFlow = async () => {
    const name = prompt("Flow name:")
    if (!name) return

    const result = await dispatch(
      createFlow({ projectId, data: { name, description: "" } })
    )

    if (createFlow.fulfilled.match(result)) {
      const newFlow = result.payload
      openFlowTab(newFlow)
    }
  }

  const handleDeploy = () => {
    if (currentFlow) {
      dispatch(deployFlow(currentFlow.id))
    }
  }

  if (loading && flows.length === 0)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Loading...
      </div>
    )

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="text-emerald-400 hover:underline text-sm">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Flow Builder</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCreateFlow}
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700"
          >
            New Flow
          </button>
          <button
            onClick={handleDeploy}
            disabled={!currentFlow || currentFlow.deployed}
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
          >
            {currentFlow?.deployed ? "Deployed" : "Deploy"}
          </button>
        </div>
      </header>

      {/* Tabs Bar */}
      {openTabs.length > 0 && (
        <div className="border-b border-slate-800 bg-slate-900 flex items-center overflow-x-auto">
          {openTabs.map((tab) => {
            const flow = flows.find((f) => f.id === tab.id) || currentFlow
            const isActive = activeTabId === tab.id

            return (
              <div
                key={tab.id}
                onClick={() => {
                  setActiveTabId(tab.id)
                  dispatch(setCurrentFlow(flow))
                }}
                className={`flex items-center gap-2 px-4 py-3 border-r border-slate-800 cursor-pointer transition-all min-w-fit ${isActive
                    ? "bg-slate-950 text-white border-t-2 border-t-emerald-500"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
              >
                <span className="text-sm font-medium">{tab.name}</span>
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className="p-1 hover:bg-slate-700 rounded transition"
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex flex-1 relative overflow-hidden">
        {/* Left Sidebar - Flows List */}
        <aside
          className={`absolute md:relative z-20 h-full bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out ${leftSidebarOpen
              ? "w-64 translate-x-0"
              : "w-0 -translate-x-full md:w-12 md:translate-x-0"
            }`}
        >
          <div className={`h-full flex flex-col ${leftSidebarOpen ? "" : "hidden md:flex"}`}>
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className={`font-bold ${leftSidebarOpen ? "block" : "hidden"}`}>Flows</h2>
              <button
                onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                className="p-2 hover:bg-slate-800 rounded-lg transition"
              >
                {leftSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
              </button>
            </div>

            {leftSidebarOpen && (
              <div className="p-4 overflow-y-auto flex-1">
                <div className="space-y-2">
                  {flows.map((flow) => (
                    <button
                      key={flow.id}
                      onClick={() => openFlowTab(flow)}
                      className={`w-full text-left px-4 py-2 rounded transition text-sm ${openTabs.some((t) => t.id === flow.id)
                          ? "bg-emerald-900/50 border border-emerald-700"
                          : "bg-slate-800 hover:bg-slate-700"
                        }`}
                    >
                      <div className="font-medium">{flow.name}</div>
                      <div className="text-xs text-slate-400">
                        {flow.deployed ? "Deployed" : "Draft"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Editor Area - Renders Active Tab */}
        <main className="flex-1 bg-slate-950 relative">
          {activeTabId && currentFlow?.id === activeTabId ? (
            <ReactFlowProvider>
              <FlowEditor flow={currentFlow} />
            </ReactFlowProvider>
          ) : openTabs.length > 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <p>Select a tab above to edit</p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-slate-400 mb-4">Select or create a flow to start building</p>
                <button
                  onClick={handleCreateFlow}
                  className="px-6 py-2 rounded bg-emerald-600 hover:bg-emerald-700"
                >
                  Create First Flow
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Right Sidebar - Node Palette */}
        {currentFlow && (
          <aside
            className={`absolute md:relative right-0 z-20 h-full bg-slate-900 border-l border-slate-800 transition-all duration-300 ease-in-out ${rightSidebarOpen
                ? "w-80 translate-x-0"
                : "w-0 translate-x-full md:w-12 md:translate-x-0"
              }`}
          >
            <div className={`h-full flex flex-col ${rightSidebarOpen ? "" : "hidden md:flex"}`}>
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h2 className={`font-bold ${rightSidebarOpen ? "block" : "hidden"}`}>
                  Node Palette
                </h2>
                <button
                  onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition"
                >
                  {rightSidebarOpen ? <ChevronRight size={20} /> : <Palette size={20} />}
                </button>
              </div>

              {rightSidebarOpen && (
                <div className="p-4 overflow-y-auto flex-1">
                  <div className="space-y-2">
                    {[
                      { display: "HTTP Method", type: "httpMethod" },
                      { display: "MongoDB", type: "mongoFind" },
                      { display: "Condition", type: "condition" },
                      { display: "Try/Catch", type: "tryCatch" },
                      { display: "Response", type: "response" },
                    ].map(({ display, type }) => (
                      <button
                        key={type}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/reactflow", type)
                          e.dataTransfer.effectAllowed = "move"
                        }}
                        className="w-full px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-left transition"
                      >
                        + {display}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}