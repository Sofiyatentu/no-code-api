import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "axios"

const API_URL = "http://localhost:5000/api/admin"

const getAuthHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
})

export const fetchDashboardAnalytics = createAsyncThunk(
  "admin/fetchDashboardAnalytics",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/analytics`, {
        headers: getAuthHeader(),
      })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || "Failed to fetch analytics")
    }
  },
)

export const fetchUsers = createAsyncThunk("admin/fetchUsers", async (params, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${API_URL}/users`, {
      headers: getAuthHeader(),
      params,
    })
    return response.data
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || "Failed to fetch users")
  }
})

export const banUser = createAsyncThunk("admin/banUser", async ({ userId, reason, duration }, { rejectWithValue }) => {
  try {
    const response = await axios.post(
      `${API_URL}/users/${userId}/ban`,
      { reason, duration },
      { headers: getAuthHeader() },
    )
    return response.data
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || "Failed to ban user")
  }
})

export const unbanUser = createAsyncThunk("admin/unbanUser", async (userId, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API_URL}/users/${userId}/unban`, {}, { headers: getAuthHeader() })
    return response.data
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || "Failed to unban user")
  }
})

export const fetchAuditLogs = createAsyncThunk("admin/fetchAuditLogs", async (params, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${API_URL}/audit-logs`, {
      headers: getAuthHeader(),
      params,
    })
    return response.data
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || "Failed to fetch audit logs")
  }
})

export const setRateLimits = createAsyncThunk("admin/setRateLimits", async (config, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API_URL}/rate-limits`, config, {
      headers: getAuthHeader(),
    })
    return response.data
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || "Failed to set rate limits")
  }
})

export const fetchUsageAnalytics = createAsyncThunk(
  "admin/fetchUsageAnalytics",
  async (params, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/analytics/usage`, {
        headers: getAuthHeader(),
        params,
      })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || "Failed to fetch usage analytics")
    }
  },
)

const initialState = {
  dashboard: null,
  users: null,
  auditLogs: null,
  usageAnalytics: null,
  loading: false,
  error: null,
}

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Dashboard Analytics
      .addCase(fetchDashboardAnalytics.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchDashboardAnalytics.fulfilled, (state, action) => {
        state.loading = false
        state.dashboard = action.payload
      })
      .addCase(fetchDashboardAnalytics.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      // Users
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false
        state.users = action.payload
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      // Audit Logs
      .addCase(fetchAuditLogs.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.loading = false
        state.auditLogs = action.payload
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      // Usage Analytics
      .addCase(fetchUsageAnalytics.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUsageAnalytics.fulfilled, (state, action) => {
        state.loading = false
        state.usageAnalytics = action.payload
      })
      .addCase(fetchUsageAnalytics.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      // Ban/Unban
      .addCase(banUser.fulfilled, (state) => {
        state.error = null
      })
      .addCase(banUser.rejected, (state, action) => {
        state.error = action.payload
      })
      .addCase(unbanUser.fulfilled, (state) => {
        state.error = null
      })
      .addCase(unbanUser.rejected, (state, action) => {
        state.error = action.payload
      })

      // Rate Limits
      .addCase(setRateLimits.fulfilled, (state) => {
        state.error = null
      })
      .addCase(setRateLimits.rejected, (state, action) => {
        state.error = action.payload
      })
  },
})

export const { clearError } = adminSlice.actions
export default adminSlice.reducer
