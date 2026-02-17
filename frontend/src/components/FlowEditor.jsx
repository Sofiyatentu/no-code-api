"use client"

import { useCallback, useState, useEffect, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"
import ReactFlow, { Controls, Background, useNodesState, useEdgesState, addEdge, Handle, useReactFlow } from "reactflow"
import "reactflow/dist/style.css"
import { updateFlow } from "../store/slices/flowsSlice.js"
import {
  pushHistory,
  undo,
  redo,
  selectCanUndo,
  selectCanRedo,
  saveSnapshot,
  loadSnapshot,
  selectSnapshot,
  selectCurrentHistory,
} from "../store/slices/editorSlice.js"
import NodeSearch from "./NodeSearch.jsx"
import { UndoIcon, RedoIcon, SearchIcon, SaveIcon, PlayIcon, ChevronLeftIcon, ChevronRightIcon } from "./Icons.jsx"

const NODE_TYPES = {
  httpMethod: { label: "HTTP Method", color: "bg-blue-900" },
  dbNode: { label: "Database", color: "bg-green-900" },
  condition: { label: "Condition", color: "bg-yellow-900" },
  tryCatch: { label: "Try/Catch", color: "bg-red-900" },
  response: { label: "Response", color: "bg-emerald-900" },
  transform: { label: "Transform", color: "bg-purple-900" },
  logging: { label: "Logging", color: "bg-gray-900" },
  assign: { label: "Assign", color: "bg-indigo-900" },
  delay: { label: "Delay", color: "bg-orange-900" },
}

const CustomNode = ({ data, isConnecting, id }) => {
  const { nodeType, onNodeClick, isExecuting, isCompleted, executionOrder } = data

  return (
    <div
      className={`px-4 py-2 rounded border-2 transition-all duration-300 relative min-w-[120px] cursor-pointer ${isExecuting
        ? 'border-yellow-400 bg-yellow-900 shadow-lg shadow-yellow-400/50 animate-pulse'
        : isCompleted
          ? 'border-green-400 bg-green-900 shadow-lg shadow-green-400/30'
          : `border-cyan-500 ${data.color} hover:border-cyan-300`
        } text-white text-sm font-semibold`}
      onClick={(e) => {
        e.stopPropagation()
        if (onNodeClick) onNodeClick(id)
      }}
    >
      <Handle type="target" position="left" className="w-3 h-3 bg-cyan-500 border-2 border-white" />
      {nodeType === 'tryCatch' && (
        <>
          <Handle type="source" position="right" id="try" className="w-3 h-3 bg-cyan-500 border-2 border-white" style={{ top: '30%' }} />
          <Handle type="source" position="right" id="catch" className="w-3 h-3 bg-cyan-500 border-2 border-white" style={{ top: '70%' }} />
          <div className="absolute right-[-60px] top-[20%] text-xs text-cyan-300">Try</div>
          <div className="absolute right-[-60px] bottom-[20%] text-xs text-cyan-300">Catch</div>
        </>
      )}
      {nodeType === 'condition' && (
        <>
          <Handle type="source" position="right" id="if" className="w-3 h-3 bg-cyan-500 border-2 border-white" style={{ top: '30%' }} />
          <Handle type="source" position="right" id="else" className="w-3 h-3 bg-cyan-500 border-2 border-white" style={{ top: '70%' }} />
          <div className="absolute right-[-40px] top-[20%] text-xs text-cyan-300">If</div>
          <div className="absolute right-[-50px] bottom-[20%] text-xs text-cyan-300">Else</div>
        </>
      )}
      {(!nodeType || (nodeType !== 'tryCatch' && nodeType !== 'condition')) && (
        <Handle type="source" position="right" className="w-3 h-3 bg-cyan-500 border-2 border-white" />
      )}

      <div className="flex items-center justify-between">
        <span>{data.label}</span>
        {executionOrder && (
          <div className="ml-2 w-5 h-5 bg-cyan-600 rounded-full flex items-center justify-center text-xs font-bold">
            {executionOrder}
          </div>
        )}
      </div>

      {isExecuting && (
        <div className="absolute inset-0 rounded border-2 border-yellow-400 animate-ping opacity-75"></div>
      )}

      <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${isExecuting ? 'bg-yellow-400 animate-pulse' :
        isCompleted ? 'bg-green-400' :
          'bg-cyan-400 opacity-50'
        }`}></div>
    </div>
  )
}

const nodeTypes = {
  custom: CustomNode,
}

export default function FlowEditor({ flow }) {
  const dispatch = useDispatch()
  const { screenToFlowPosition } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState(flow.nodes || [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(flow.edges || [])
  const [showNodeSearch, setShowNodeSearch] = useState(false)
  const [configPanel, setConfigPanel] = useState(null)
  const [nodeConfigs, setNodeConfigs] = useState({})
  const [lastSaveTime, setLastSaveTime] = useState(null)
  const [saveStatus, setSaveStatus] = useState("idle") // idle, saving, saved
  const [executionState, setExecutionState] = useState(null) // { currentNodeId, path: [], isRunning: boolean }
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  const canUndo = useSelector(selectCanUndo)
  const canRedo = useSelector(selectCanRedo)
  const snapshot = useSelector((state) => selectSnapshot(state, flow.id))
  const currentHistory = useSelector(selectCurrentHistory)
  const prevFlowIdRef = useRef(flow.id)

  useEffect(() => {
    // Save current state to previous flow's snapshot before switching
    if (prevFlowIdRef.current !== flow.id && prevFlowIdRef.current) {
      dispatch(saveSnapshot({ flowId: prevFlowIdRef.current, nodes, edges }))
    }
    prevFlowIdRef.current = flow.id

    // Load snapshot for new flow
    dispatch(loadSnapshot({ flowId: flow.id }))
  }, [flow.id, dispatch])

  useEffect(() => {
    if (snapshot && snapshot.nodes && snapshot.edges) {
      setNodes(snapshot.nodes)
      setEdges(snapshot.edges)
      dispatch(pushHistory({ flowId: flow.id, nodes: snapshot.nodes, edges: snapshot.edges }))
    } else if (flow.nodes || flow.edges) {
      // If no snapshot, use flow data from backend
      setNodes(flow.nodes || [])
      setEdges(flow.edges || [])
      dispatch(pushHistory({ flowId: flow.id, nodes: flow.nodes || [], edges: flow.edges || [] }))
    }
  }, [snapshot, flow.nodes, flow.edges, flow.id, dispatch, setNodes, setEdges])

  useEffect(() => {
    if (currentHistory && currentHistory.flowId === flow.id) {
      setNodes(currentHistory.nodes)
      setEdges(currentHistory.edges)
    }
  }, [currentHistory, flow.id])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (nodes.length > 0 || edges.length > 0) {
        dispatch(saveSnapshot({ flowId: flow.id, nodes, edges }))
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [nodes, edges, flow.id, dispatch])

  const onConnect = useCallback(
    (connection) => {
      const newEdges = addEdge(connection, edges)
      setEdges(newEdges)

      dispatch(pushHistory({ flowId: flow.id, nodes, edges: newEdges }))
    },
    [dispatch, edges, nodes, flow.id, setEdges],
  )

  const onNodesDelete = useCallback(
    (deletedNodes) => {
      const newNodes = nodes.filter(n => !deletedNodes.some(dn => dn.id === n.id))
      const newEdges = edges.filter(e => !deletedNodes.some(dn => dn.id === e.source || dn.id === e.target))
      setNodes(newNodes)
      setEdges(newEdges)
      dispatch(pushHistory({ flowId: flow.id, nodes: newNodes, edges: newEdges }))
    },
    [nodes, edges, dispatch, flow.id, setNodes, setEdges],
  )

  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()

      const type = event.dataTransfer.getData("application/reactflow")

      if (typeof type === "undefined" || !type) {
        return
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode = {
        id: `${type}-${Date.now()}`,
        data: {
          label: NODE_TYPES[type]?.label,
          color: NODE_TYPES[type]?.color,
          nodeType: type,
        },
        position,
        type: "custom",
      }

      const newNodes = [...nodes, newNode]
      setNodes(newNodes)

      dispatch(pushHistory({ flowId: flow.id, nodes: newNodes, edges }))
    },
    [dispatch, nodes, edges, flow.id, setNodes, screenToFlowPosition],
  )

  const handleAddNode = useCallback(
    (nodeType) => {
      if (!nodeType) return

      const position = { x: Math.random() * 400, y: Math.random() * 400 }

      const newNode = {
        id: `${nodeType}-${Date.now()}`,
        data: {
          label: NODE_TYPES[nodeType]?.label,
          color: NODE_TYPES[nodeType]?.color,
          nodeType,
        },
        position,
        type: "custom",
      }

      const newNodes = [...nodes, newNode]
      setNodes(newNodes)

      dispatch(pushHistory({ flowId: flow.id, nodes: newNodes, edges }))

      setShowNodeSearch(false)
    },
    [nodes, edges, dispatch, flow.id, setNodes],
  )

  const handleUndo = useCallback(() => {
    dispatch(undo())
  }, [dispatch])

  const handleRedo = useCallback(() => {
    dispatch(redo())
  }, [dispatch])

  const handleSaveFlow = useCallback(() => {
    setSaveStatus("saving")
    console.log("API Logic JSON:", JSON.stringify({ nodes, edges }, null, 2))
    dispatch(updateFlow({ flowId: flow.id, data: { nodes, edges } }))
      .then(() => {
        setSaveStatus("saved")
        setLastSaveTime(new Date().toLocaleTimeString())
        setTimeout(() => setSaveStatus("idle"), 2000)
      })
      .catch(() => {
        setSaveStatus("idle")
      })
  }, [dispatch, flow.id, nodes, edges])

  const handleDeleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected)
    if (selectedNodes.length > 0) {
      onNodesDelete(selectedNodes)
    }
  }, [nodes, onNodesDelete])

  const handleNodeClick = useCallback((nodeId) => {
    setConfigPanel(nodeId)
  }, [])

  const addChildNode = useCallback((parentNodeId, branchType) => {
    const parentNode = nodes.find(n => n.id === parentNodeId)
    if (!parentNode) return

    const offsetY = branchType === 'try' || branchType === 'if' ? -100 : 100
    const color = branchType === 'try' ? 'bg-blue-700' :
      branchType === 'catch' ? 'bg-red-700' :
        branchType === 'if' ? 'bg-green-700' : 'bg-orange-700'

    const childNode = {
      id: `${branchType}-${Date.now()}`,
      data: {
        label: `${branchType.charAt(0).toUpperCase() + branchType.slice(1)} Block`,
        color,
        nodeType: 'block',
        parentNodeId,
        branchType,
      },
      position: {
        x: parentNode.position.x + 250,
        y: parentNode.position.y + offsetY
      },
      type: "custom",
    }

    const newNodes = [...nodes, childNode]
    const newEdges = [...edges, {
      id: `edge-${branchType}-${Date.now()}`,
      source: parentNodeId,
      target: childNode.id,
      sourceHandle: branchType
    }]

    setNodes(newNodes)
    setEdges(newEdges)
    dispatch(pushHistory({ flowId: flow.id, nodes: newNodes, edges: newEdges }))
  }, [nodes, edges, dispatch, flow.id, setNodes, setEdges])

  const simulateFlowExecution = useCallback(async () => {
    if (!nodes.length) return

    // Find the HTTP Method node (entry point)
    const entryNode = nodes.find(node => node.data.nodeType === 'httpMethod')
    if (!entryNode) return

    setExecutionState({ currentNodeId: entryNode.id, path: [entryNode.id], isRunning: true })

    const traverseFlow = async (currentNodeId, visited = new Set()) => {
      if (visited.has(currentNodeId)) return
      visited.add(currentNodeId)

      const currentNode = nodes.find(n => n.id === currentNodeId)
      if (!currentNode) return

      // Simulate processing time based on node type
      const processingTime = currentNode.data.nodeType === 'dbNode' ? 1500 :
        currentNode.data.nodeType === 'response' ? 800 :
          currentNode.data.nodeType === 'transform' ? 1000 : 500

      await new Promise(resolve => setTimeout(resolve, processingTime))

      // Find outgoing edges
      const outgoingEdges = edges.filter(edge => edge.source === currentNodeId)

      if (currentNode.data.nodeType === 'tryCatch') {
        // For try/catch, prefer try branch first
        const tryEdge = outgoingEdges.find(edge => edge.sourceHandle === 'try')
        if (tryEdge) {
          setExecutionState(prev => ({
            ...prev,
            currentNodeId: tryEdge.target,
            path: [...prev.path, tryEdge.target]
          }))
          await traverseFlow(tryEdge.target, visited)
        }
      } else if (currentNode.data.nodeType === 'condition') {
        // For condition, simulate random choice (in real execution this would be based on condition)
        const ifEdge = outgoingEdges.find(edge => edge.sourceHandle === 'if')
        const elseEdge = outgoingEdges.find(edge => edge.sourceHandle === 'else')

        // Simulate condition evaluation (random for demo)
        const conditionResult = Math.random() > 0.5
        const nextEdge = conditionResult ? ifEdge : elseEdge

        if (nextEdge) {
          setExecutionState(prev => ({
            ...prev,
            currentNodeId: nextEdge.target,
            path: [...prev.path, nextEdge.target]
          }))
          await traverseFlow(nextEdge.target, visited)
        }
      } else {
        // For other nodes, follow the first outgoing edge
        const nextEdge = outgoingEdges[0]
        if (nextEdge) {
          setExecutionState(prev => ({
            ...prev,
            currentNodeId: nextEdge.target,
            path: [...prev.path, nextEdge.target]
          }))
          await traverseFlow(nextEdge.target, visited)
        }
      }
    }

    await traverseFlow(entryNode.id)

    // Clear execution state after completion
    setTimeout(() => {
      setExecutionState(null)
    }, 1000)
  }, [nodes, edges])

  const createCompleteAPIScenario = useCallback(() => {
    const baseX = 100
    const baseY = 100
    const spacingX = 250
    const spacingY = 150

    const newNodes = []
    const newEdges = []

    // 1. HTTP Method Node (Entry Point)
    const httpNode = {
      id: `httpMethod-${Date.now()}`,
      data: {
        label: "HTTP Method",
        color: "bg-blue-900",
        nodeType: "httpMethod",
        config: {
          method: "GET",
          path: "/users/:id",
          description: "Get user by ID"
        }
      },
      position: { x: baseX, y: baseY },
      type: "custom",
    }
    newNodes.push(httpNode)

    // 2. Try-Catch Node (Hierarchy Parent)
    const tryCatchNode = {
      id: `tryCatch-${Date.now()}`,
      data: {
        label: "Try/Catch",
        color: "bg-red-900",
        nodeType: "tryCatch"
      },
      position: { x: baseX + spacingX, y: baseY },
      type: "custom",
    }
    newNodes.push(tryCatchNode)

    // 3. TRY Branch - Database Query
    const dbNode = {
      id: `dbNode-${Date.now()}`,
      data: {
        label: "Database",
        color: "bg-green-900",
        nodeType: "dbNode",
        config: {
          action: "findOne",
          collection: "users",
          query: "{ _id: params.id }",
          projection: ""
        }
      },
      position: { x: baseX + spacingX * 2, y: baseY - spacingY },
      type: "custom",
    }
    newNodes.push(dbNode)

    // 4. Condition Node (Check if user exists)
    const conditionNode = {
      id: `condition-${Date.now()}`,
      data: {
        label: "Condition",
        color: "bg-yellow-900",
        nodeType: "condition",
        config: { condition: "!user" }
      },
      position: { x: baseX + spacingX * 3, y: baseY - spacingY },
      type: "custom",
    }
    newNodes.push(conditionNode)

    // 5. IF Branch - Success Response
    const successResponseNode = {
      id: `successResponse-${Date.now()}`,
      data: {
        label: "Response",
        color: "bg-emerald-900",
        nodeType: "response",
        config: {
          statusCode: 200,
          body: "{ success: true, data: user }",
          headers: "{}"
        }
      },
      position: { x: baseX + spacingX * 4, y: baseY - spacingY * 2 },
      type: "custom",
    }
    newNodes.push(successResponseNode)

    // 6. ELSE Branch - Not Found Response
    const notFoundResponseNode = {
      id: `notFoundResponse-${Date.now()}`,
      data: {
        label: "Response",
        color: "bg-emerald-900",
        nodeType: "response",
        config: {
          statusCode: 404,
          body: "{ success: false, message: 'User not found' }",
          headers: "{}"
        }
      },
      position: { x: baseX + spacingX * 4, y: baseY },
      type: "custom",
    }
    newNodes.push(notFoundResponseNode)

    // 7. CATCH Branch - Error Response
    const errorResponseNode = {
      id: `errorResponse-${Date.now()}`,
      data: {
        label: "Response",
        color: "bg-red-700",
        nodeType: "response",
        config: {
          statusCode: 500,
          body: "{ success: false, error: 'Internal Server Error' }",
          headers: "{}"
        }
      },
      position: { x: baseX + spacingX * 2, y: baseY + spacingY },
      type: "custom",
    }
    newNodes.push(errorResponseNode)

    // Edges - Hierarchical connections
    newEdges.push(
      // Main flow: HTTP -> Try/Catch
      { id: `edge-1-${Date.now()}`, source: httpNode.id, target: tryCatchNode.id },

      // TRY branch: Try/Catch -> DB -> Condition
      { id: `edge-2-${Date.now()}`, source: tryCatchNode.id, target: dbNode.id, sourceHandle: 'try' },
      { id: `edge-3-${Date.now()}`, source: dbNode.id, target: conditionNode.id },

      // Condition branches: Condition -> Success Response (IF) and Not Found Response (ELSE)
      { id: `edge-4-${Date.now()}`, source: conditionNode.id, target: successResponseNode.id, sourceHandle: 'if' },
      { id: `edge-5-${Date.now()}`, source: conditionNode.id, target: notFoundResponseNode.id, sourceHandle: 'else' },

      // CATCH branch: Try/Catch -> Error Response
      { id: `edge-6-${Date.now()}`, source: tryCatchNode.id, target: errorResponseNode.id, sourceHandle: 'catch' }
    )

    setNodes(newNodes)
    setEdges(newEdges)
    dispatch(pushHistory({ flowId: flow.id, nodes: newNodes, edges: newEdges }))

    // Initialize configs
    const initialConfigs = {}
    newNodes.forEach(node => {
      if (node.data.config) {
        initialConfigs[node.id] = node.data.config
      }
    })
    setNodeConfigs(initialConfigs)
  }, [dispatch, flow.id, setNodes, setEdges])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault()
        handleRedo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        handleSaveFlow()
      } else if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setShowNodeSearch(true)
      } else if ((e.ctrlKey || e.metaKey) && e.key === "x") {
        e.preventDefault()
        handleDeleteSelected()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleUndo, handleRedo, handleSaveFlow, handleDeleteSelected])

  return (
    <div className="w-full h-full bg-slate-800 rounded-lg overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-slate-700 p-4 flex gap-2 items-center bg-slate-900">
        <button
          onClick={() => setShowNodeSearch(true)}
          className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-white text-sm hover:border-cyan-500 hover:bg-slate-700 transition flex items-center gap-2"
          title="Cmd+K / Ctrl+K"
        >
          <SearchIcon />
          Search Nodes
        </button>

        <div className="w-px h-6 bg-slate-700" />

        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm transition flex items-center gap-1"
          title="Cmd+Z / Ctrl+Z"
        >
          <UndoIcon />
          Undo
        </button>

        <button
          onClick={handleRedo}
          disabled={!canRedo}
          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm transition flex items-center gap-1"
          title="Cmd+Y / Ctrl+Y"
        >
          <RedoIcon />
          Redo
        </button>

        <div className="w-px h-6 bg-slate-700" />

        <button
          onClick={createCompleteAPIScenario}
          className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm transition"
          title="Create Complete API Scenario"
        >
          Create API Flow
        </button>

        <div className="w-px h-6 bg-slate-700" />

        <button
          onClick={simulateFlowExecution}
          disabled={!nodes.length || executionState?.isRunning}
          className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition flex items-center gap-2"
          title="Simulate Flow Execution"
        >
          <PlayIcon />
          {executionState?.isRunning ? "Running..." : "Run Flow"}
        </button>

        <button
          onClick={handleSaveFlow}
          disabled={saveStatus === "saving"}
          className={`ml-auto px-4 py-1.5 rounded text-white text-sm font-semibold flex items-center gap-2 transition ${saveStatus === "saved"
            ? "bg-emerald-600"
            : saveStatus === "saving"
              ? "bg-cyan-600"
              : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          title="Cmd+S / Ctrl+S"
        >
          <SaveIcon />
          {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save"}
        </button>

        {lastSaveTime && <span className="text-xs text-slate-400 ml-3">Last saved: {lastSaveTime}</span>}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes.map((n) => ({
            ...n,
            type: "custom",
            data: {
              ...n.data,
              onNodeClick: handleNodeClick,
              isExecuting: executionState?.currentNodeId === n.id && executionState?.isRunning,
              isCompleted: executionState?.path.includes(n.id) && !executionState?.isRunning,
              executionOrder: executionState?.path.indexOf(n.id) + 1 || null
            }
          }))}
          edges={edges.map((e) => ({
            ...e,
            style: {
              stroke: executionState?.path.includes(e.source) && executionState?.path.includes(e.target)
                ? '#10b981' // green for executed edges
                : executionState?.currentNodeId === e.source
                  ? '#f59e0b' // yellow for current edge
                  : '#94a3b8' // default gray
            },
            animated: executionState?.currentNodeId === e.source || (executionState?.path.includes(e.source) && executionState?.path.includes(e.target))
          }))}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodesDelete={onNodesDelete}
          nodeTypes={nodeTypes}
          deleteKeyCode="Delete"
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {showNodeSearch && <NodeSearch onSelect={handleAddNode} onClose={() => setShowNodeSearch(false)} />}

      {/* Config Panel */}
      {configPanel && (
        <div className={`absolute bottom-4 right-4 bg-slate-900 border border-slate-700 rounded-lg transition-all duration-300 ease-in-out ${sidebarExpanded ? 'w-96 p-4 max-h-96 overflow-y-auto' : 'w-12 p-2 max-h-12 overflow-hidden'
          }`}>
          {sidebarExpanded ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">Node Configuration</h3>
                <button
                  onClick={() => setSidebarExpanded(false)}
                  className="p-1 hover:bg-slate-800 rounded transition-colors"
                  title="Collapse Sidebar"
                >
                  <ChevronRightIcon />
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-4">Node ID: {configPanel}</p>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <button
                onClick={() => setSidebarExpanded(true)}
                className="p-1 hover:bg-slate-800 rounded transition-colors"
                title="Expand Sidebar"
              >
                <ChevronLeftIcon />
              </button>
            </div>
          )}

          {sidebarExpanded && (
            <>

              {(() => {
                const node = nodes.find(n => n.id === configPanel)
                const config = nodeConfigs[configPanel] || {}

                if (!node) return null

                switch (node.data.nodeType) {
                  case 'httpMethod':
                    return (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">HTTP Method</label>
                          <select
                            value={config.method || 'GET'}
                            onChange={(e) => setNodeConfigs(prev => ({ ...prev, [configPanel]: { ...config, method: e.target.value } }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Route Path</label>
                          <input
                            type="text"
                            value={config.path || ''}
                            onChange={(e) => setNodeConfigs(prev => ({ ...prev, [configPanel]: { ...config, path: e.target.value } }))}
                            placeholder="/users/:id"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                          <textarea
                            value={config.description || ''}
                            onChange={(e) => setNodeConfigs(prev => ({ ...prev, [configPanel]: { ...config, description: e.target.value } }))}
                            placeholder="Describe this endpoint"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm h-20"
                          />
                        </div>
                      </div>
                    )

                  case 'dbNode':
                    return (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Operation Type</label>
                          <select
                            value={config.action || 'findOne'}
                            onChange={(e) => setNodeConfigs(prev => ({ ...prev, [configPanel]: { ...config, action: e.target.value } }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                          >
                            <option value="findOne">findOne</option>
                            <option value="findMany">findMany</option>
                            <option value="insertOne">insertOne</option>
                            <option value="updateOne">updateOne</option>
                            <option value="deleteOne">deleteOne</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Collection Name</label>
                          <input
                            type="text"
                            value={config.collection || ''}
                            onChange={(e) => setNodeConfigs(prev => ({ ...prev, [configPanel]: { ...config, collection: e.target.value } }))}
                            placeholder="users"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Query (JSON)</label>
                          <textarea
                            value={config.query || ''}
                            onChange={(e) => setNodeConfigs(prev => ({ ...prev, [configPanel]: { ...config, query: e.target.value } }))}
                            placeholder='{ _id: params.id }'
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm h-20 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Projection/Update Fields (Optional)</label>
                          <textarea
                            value={config.projection || ''}
                            onChange={(e) => setNodeConfigs(prev => ({ ...prev, [configPanel]: { ...config, projection: e.target.value } }))}
                            placeholder='{ name: 1, email: 1 }'
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm h-16 font-mono"
                          />
                        </div>
                      </div>
                    )

                  case 'condition':
                    const ifChild = nodes.find(n => n.data.parentNodeId === configPanel && n.data.branchType === 'if')
                    const elseChild = nodes.find(n => n.data.parentNodeId === configPanel && n.data.branchType === 'else')

                    return (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Condition Expression</label>
                          <textarea
                            value={config.condition || ''}
                            onChange={(e) => setNodeConfigs(prev => ({ ...prev, [configPanel]: { ...config, condition: e.target.value } }))}
                            placeholder="!user"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm h-20 font-mono"
                          />
                          <p className="text-xs text-slate-500 mt-1">JavaScript expression that evaluates to true/false</p>
                        </div>
                        <div className="bg-slate-800 p-3 rounded border border-slate-600">
                          <p className="text-xs text-slate-400 mb-3">Child nodes:</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs text-slate-300">If Block</span>
                              </div>
                              {ifChild ? (
                                <button
                                  onClick={() => setConfigPanel(ifChild.id)}
                                  className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded"
                                >
                                  Configure
                                </button>
                              ) : (
                                <button
                                  onClick={() => addChildNode(configPanel, 'if')}
                                  className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-700 rounded"
                                >
                                  Add Node
                                </button>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <span className="text-xs text-slate-300">Else Block</span>
                              </div>
                              {elseChild ? (
                                <button
                                  onClick={() => setConfigPanel(elseChild.id)}
                                  className="px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 rounded"
                                >
                                  Configure
                                </button>
                              ) : (
                                <button
                                  onClick={() => addChildNode(configPanel, 'else')}
                                  className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-700 rounded"
                                >
                                  Add Node
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )

                  case 'tryCatch':
                    const tryChild = nodes.find(n => n.data.parentNodeId === configPanel && n.data.branchType === 'try')
                    const catchChild = nodes.find(n => n.data.parentNodeId === configPanel && n.data.branchType === 'catch')

                    return (
                      <div className="space-y-4">
                        <div className="bg-slate-800 p-3 rounded border border-slate-600">
                          <p className="text-xs text-slate-400 mb-3">Child nodes:</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-xs text-slate-300">Try Block</span>
                              </div>
                              {tryChild ? (
                                <button
                                  onClick={() => setConfigPanel(tryChild.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                                >
                                  Configure
                                </button>
                              ) : (
                                <button
                                  onClick={() => addChildNode(configPanel, 'try')}
                                  className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-700 rounded"
                                >
                                  Add Node
                                </button>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <span className="text-xs text-slate-300">Catch Block</span>
                              </div>
                              {catchChild ? (
                                <button
                                  onClick={() => setConfigPanel(catchChild.id)}
                                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                                >
                                  Configure
                                </button>
                              ) : (
                                <button
                                  onClick={() => addChildNode(configPanel, 'catch')}
                                  className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-700 rounded"
                                >
                                  Add Node
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )

                  case 'response':
                    return (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Status Code</label>
                          <input
                            type="number"
                            value={config.statusCode || 200}
                            onChange={(e) => setNodeConfigs(prev => ({ ...prev, [configPanel]: { ...config, statusCode: parseInt(e.target.value) } }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Response Body (JSON)</label>
                          <textarea
                            value={config.body || ''}
                            onChange={(e) => setNodeConfigs(prev => ({ ...prev, [configPanel]: { ...config, body: e.target.value } }))}
                            placeholder='{ success: true, data: user }'
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm h-24 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Headers (JSON)</label>
                          <textarea
                            value={config.headers || '{}'}
                            onChange={(e) => setNodeConfigs(prev => ({ ...prev, [configPanel]: { ...config, headers: e.target.value } }))}
                            placeholder='{ "Content-Type": "application/json" }'
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm h-16 font-mono"
                          />
                        </div>
                      </div>
                    )

                  case 'transform':
                    return (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Transformation Code</label>
                          <textarea
                            value={config.transformation || ''}
                            onChange={(e) => setNodeConfigs(prev => ({ ...prev, [configPanel]: { ...config, transformation: e.target.value } }))}
                            placeholder="return { ...data, modified: true }"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm h-32 font-mono"
                          />
                          <p className="text-xs text-slate-500 mt-1">JavaScript function body for data transformation</p>
                        </div>
                      </div>
                    )

                  case 'logging':
                    return (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Log Level</label>
                          <select
                            value={config.level || 'info'}
                            onChange={(e) => setNodeConfigs(prev => ({ ...prev, [configPanel]: { ...config, level: e.target.value } }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                          >
                            <option value="debug">Debug</option>
                            <option value="info">Info</option>
                            <option value="warn">Warning</option>
                            <option value="error">Error</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Log Message</label>
                          <textarea
                            value={config.message || ''}
                            onChange={(e) => setNodeConfigs(prev => ({ ...prev, [configPanel]: { ...config, message: e.target.value } }))}
                            placeholder="User data retrieved"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm h-20"
                          />
                        </div>
                      </div>
                    )

                  case 'assign':
                    return (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Variable Name</label>
                          <input
                            type="text"
                            value={config.variable || ''}
                            onChange={(e) => setNodeConfigs(prev => ({ ...prev, [configPanel]: { ...config, variable: e.target.value } }))}
                            placeholder="userData"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Value Expression</label>
                          <textarea
                            value={config.value || ''}
                            onChange={(e) => setNodeConfigs(prev => ({ ...prev, [configPanel]: { ...config, value: e.target.value } }))}
                            placeholder="response.data"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm h-20 font-mono"
                          />
                        </div>
                      </div>
                    )

                  case 'delay':
                    return (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Delay (milliseconds)</label>
                          <input
                            type="number"
                            value={config.delay || 1000}
                            onChange={(e) => setNodeConfigs(prev => ({ ...prev, [configPanel]: { ...config, delay: parseInt(e.target.value) } }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                          />
                        </div>
                      </div>
                    )

                  case 'block':
                    return (
                      <div className="space-y-4">
                        <div className="bg-slate-800 p-3 rounded border border-slate-600">
                          <p className="text-xs text-slate-400 mb-2">Block Configuration</p>
                          <p className="text-xs text-slate-300">
                            This is a {node.data.branchType} block. Add nodes after this block to define the execution flow.
                          </p>
                        </div>
                      </div>
                    )

                  default:
                    return <p className="text-slate-400">No configuration available for this node type.</p>
                }
              })()}

              <button
                onClick={() => setConfigPanel(null)}
                className="mt-6 w-full px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-white text-sm transition"
              >
                Close
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
