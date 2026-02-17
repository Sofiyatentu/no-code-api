import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "axios"

const API_URL = "http://localhost:5000/api/flows"

export const fetchFlow = createAsyncThunk("flows/fetchFlow", async (flowId, { getState, rejectWithValue }) => {
  try {
    const token = getState().auth.token
    const response = await axios.get(`${API_URL}/${flowId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || "Failed to fetch flow")
  }
})

export const fetchFlows = createAsyncThunk("flows/fetchFlows", async (projectId, { getState, rejectWithValue }) => {
  try {
    const token = getState().auth.token
    const response = await axios.get(`${API_URL}/project/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || "Failed to fetch flows")
  }
})

export const createFlow = createAsyncThunk(
  "flows/createFlow",
  async ({ projectId, data }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const response = await axios.post(`${API_URL}/project/${projectId}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || "Failed to create flow")
    }
  },
)

export const updateFlow = createAsyncThunk(
  "flows/updateFlow",
  async ({ flowId, data }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const response = await axios.patch(`${API_URL}/${flowId}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || "Failed to update flow")
    }
  },
)

export const deployFlow = createAsyncThunk("flows/deployFlow", async (flowId, { getState, rejectWithValue }) => {
  try {
    const token = getState().auth.token
    const response = await axios.post(
      `${API_URL}/${flowId}/deploy`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    return response.data
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || "Failed to deploy flow")
  }
})

const initialState = {
  flows: [],
  currentFlow: null,
  loading: false,
  error: null,
}

const flowsSlice = createSlice({
  name: "flows",
  initialState,
  reducers: {
    setCurrentFlow: (state, action) => {
      state.currentFlow = action.payload
      localStorage.setItem('currentFlowId', action.payload.id)
    },
    updateFlowNodes: (state, action) => {
      if (state.currentFlow) {
        state.currentFlow.nodes = action.payload
      }
    },
    updateFlowEdges: (state, action) => {
      if (state.currentFlow) {
        state.currentFlow.edges = action.payload
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFlows.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchFlows.fulfilled, (state, action) => {
        state.loading = false
        state.flows = action.payload
      })
      .addCase(fetchFlow.fulfilled, (state, action) => {
        const flow = action.payload
        const index = state.flows.findIndex((f) => f.id === flow.id)
        if (index !== -1) {
          state.flows[index] = flow
        }
        state.currentFlow = flow
      })
      .addCase(fetchFlows.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(createFlow.fulfilled, (state, action) => {
        state.flows.push(action.payload)
      })
      .addCase(updateFlow.fulfilled, (state, action) => {
        const index = state.flows.findIndex((f) => f.id === action.payload.id)
        if (index !== -1) {
          state.flows[index] = action.payload
        }
        if (state.currentFlow?.id === action.payload.id) {
          state.currentFlow = action.payload
        }
      })
      .addCase(deployFlow.fulfilled, (state, action) => {
        const flow = action.payload.flow
        const index = state.flows.findIndex((f) => f.id === flow.id)
        if (index !== -1) {
          state.flows[index] = flow
        }
        if (state.currentFlow?.id === flow.id) {
          state.currentFlow = flow
        }
      })
  },
})

export const { setCurrentFlow, updateFlowNodes, updateFlowEdges } = flowsSlice.actions
export default flowsSlice.reducer
