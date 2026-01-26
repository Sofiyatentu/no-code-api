import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  sidebarOpen: true,
  selectedNode: null,
  notification: null,
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    selectNode: (state, action) => {
      state.selectedNode = action.payload
    },
    showNotification: (state, action) => {
      state.notification = action.payload
    },
    clearNotification: (state) => {
      state.notification = null
    },
  },
})

export const { toggleSidebar, selectNode, showNotification, clearNotification } = uiSlice.actions
export default uiSlice.reducer
