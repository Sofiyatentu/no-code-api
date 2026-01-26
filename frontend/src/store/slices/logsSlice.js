import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "axios"

const API_URL = "http://localhost:5000/api/logs"

export const fetchLogs = createAsyncThunk("logs/fetchLogs", async (projectId, { getState, rejectWithValue }) => {
  try {
    const token = getState().auth.token
    const response = await axios.get(`${API_URL}/project/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || "Failed to fetch logs")
  }
})

const initialState = {
  logs: [],
  loading: false,
  error: null,
}

const logsSlice = createSlice({
  name: "logs",
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(fetchLogs.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchLogs.fulfilled, (state, action) => {
        state.loading = false
        state.logs = action.payload.logs || action.payload
      })
      .addCase(fetchLogs.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export default logsSlice.reducer
