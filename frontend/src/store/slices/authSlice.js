import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "axios"

const API_URL = "http://localhost:5000/api/auth"

export const signup = createAsyncThunk("auth/signup", async (credentials, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API_URL}/signup`, credentials)
    localStorage.setItem("token", response.data.token)
    return response.data
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || "Signup failed")
  }
})

export const login = createAsyncThunk("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API_URL}/login`, credentials)
    localStorage.setItem("token", response.data.token)
    return response.data
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || "Login failed")
  }
})

export const fetchCurrentUser = createAsyncThunk("auth/fetchCurrentUser", async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem("token")
    if (!token) return null

    const response = await axios.get(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    console.log("Fetched current user:", response.data)
    return response.data
  } catch (error) {
    localStorage.removeItem("token")
    return rejectWithValue(error.response?.data?.error || "Failed to fetch user")
  }
})

const initialState = {
  user: null,
  token: localStorage.getItem("token") || null,
  loading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem("token"),
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      localStorage.removeItem("token")
    },
  },
  extraReducers: (builder) => {
    builder
      // Signup
      .addCase(signup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.loading = false;
        state.user = {
          ...action.payload.user,
          role: "user",
        };
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = {
          ...action.payload.user,
          role: action.payload.user.role || "user",
        };
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch current user
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        if (!action.payload) {
          state.user = null;
          state.isAuthenticated = false;
        } else {
          state.user = {
            id: action.payload.id,
            email: action.payload.email,
            username: action.payload.username,
            firstName: action.payload.firstName,
            lastName: action.payload.lastName,
            role: action.payload.role || "user",
          };
          state.isAuthenticated = true;
        }
      });
  }
})

export const { logout } = authSlice.actions
export default authSlice.reducer
