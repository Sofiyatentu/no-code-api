import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  history: [],
  historyStep: -1,
  snapshots: {},
  autoSaveEnabled: true,
}

const editorSlice = createSlice({
  name: "editor",
  initialState,
  reducers: {
    pushHistory: (state, action) => {
      const { flowId, nodes, edges } = action.payload

      // Remove any future history if user makes a change after undo
      if (state.historyStep < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyStep + 1)
      }

      state.history.push({ flowId, nodes, edges, timestamp: Date.now() })
      state.historyStep = state.history.length - 1
    },

    undo: (state) => {
      if (state.historyStep > 0) {
        state.historyStep -= 1
      }
    },

    redo: (state) => {
      if (state.historyStep < state.history.length - 1) {
        state.historyStep += 1
      }
    },

    clearHistory: (state) => {
      state.history = []
      state.historyStep = -1
    },

    saveSnapshot: (state, action) => {
      const { flowId, nodes, edges } = action.payload
      state.snapshots[flowId] = {
        nodes,
        edges,
        timestamp: Date.now(),
      }
      // Persist to localStorage
      localStorage.setItem(`flow_snapshot_${flowId}`, JSON.stringify(state.snapshots[flowId]))
    },

    loadSnapshot: (state, action) => {
      const { flowId } = action.payload
      const snapshot = localStorage.getItem(`flow_snapshot_${flowId}`)
      if (snapshot) {
        state.snapshots[flowId] = JSON.parse(snapshot)
      }
    },

    deleteSnapshot: (state, action) => {
      const { flowId } = action.payload
      delete state.snapshots[flowId]
      localStorage.removeItem(`flow_snapshot_${flowId}`)
    },

    setAutoSave: (state, action) => {
      state.autoSaveEnabled = action.payload
    },
  },
})

export const { pushHistory, undo, redo, clearHistory, saveSnapshot, loadSnapshot, deleteSnapshot, setAutoSave } =
  editorSlice.actions

export const selectCurrentHistory = (state) => {
  const { history, historyStep } = state.editor
  if (historyStep >= 0 && historyStep < history.length) {
    return history[historyStep]
  }
  return null
}

export const selectCanUndo = (state) => state.editor.historyStep > 0
export const selectCanRedo = (state) => state.editor.historyStep < state.editor.history.length - 1
export const selectSnapshot = (state, flowId) => state.editor.snapshots[flowId]

export default editorSlice.reducer
