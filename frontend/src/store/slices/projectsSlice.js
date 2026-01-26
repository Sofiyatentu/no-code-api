import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "axios"

const API_URL = "http://localhost:5000/api/projects"

export const fetchProjects = createAsyncThunk("projects/fetchProjects", async (_, { getState, rejectWithValue }) => {
  try {
    const token = getState().auth.token
    const response = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || "Failed to fetch projects")
  }
})

export const createProject = createAsyncThunk(
  "projects/createProject",
  async (projectData, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const response = await axios.post(API_URL, projectData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || "Failed to create project")
    }
  },
)

export const updateProject = createAsyncThunk(
  "projects/updateProject",
  async ({ projectId, data }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      const response = await axios.patch(`${API_URL}/${projectId}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || "Failed to update project")
    }
  },
)

export const deleteProject = createAsyncThunk(
  "projects/deleteProject",
  async (projectId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token
      await axios.delete(`${API_URL}/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return projectId
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || "Failed to delete project")
    }
  },
)

const initialState = {
  projects: [],
  loading: false,
  error: null,
}

const projectsSlice = createSlice({
  name: "projects",
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false
        state.projects = action.payload
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.projects.push(action.payload)
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        const index = state.projects.findIndex((p) => p._id === action.payload._id)
        if (index !== -1) {
          state.projects[index] = action.payload
        }
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.projects = state.projects.filter((p) => p._id !== action.payload)
      })
  },
})

export default projectsSlice.reducer
