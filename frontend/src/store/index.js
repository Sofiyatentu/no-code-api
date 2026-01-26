import { configureStore } from "@reduxjs/toolkit"
import authReducer from "./slices/authSlice.js"
import projectsReducer from "./slices/projectsSlice.js"
import flowsReducer from "./slices/flowsSlice.js"
import uiReducer from "./slices/uiSlice.js"
import logsReducer from "./slices/logsSlice.js"
import editorReducer from "./slices/editorSlice.js"
import adminReducer from "./slices/adminSlice.js"

export default configureStore({
  reducer: {
    auth: authReducer,
    projects: projectsReducer,
    flows: flowsReducer,
    ui: uiReducer,
    logs: logsReducer,
    editor: editorReducer,
    admin: adminReducer,
  },
})
