import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../services/api'

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', credentials)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    return data.user
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'We couldn’t sign in.')
  }
})

export const register = createAsyncThunk('auth/register', async (details, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', details)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    return data.user
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'We couldn’t create your account.')
  }
})

export const refreshUser = createAsyncThunk('auth/refreshUser', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me')
    localStorage.setItem('user', JSON.stringify(data.user))
    return data.user
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'We couldn’t refresh your account.')
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: readStoredUser(), status: 'idle', error: '' },
  reducers: {
    logout(state) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      state.user = null
      state.status = 'idle'
      state.error = ''
    },
  },
  extraReducers: (builder) => {
    // Async thunks generate pending/fulfilled/rejected actions for request lifecycle state.
    builder
      .addCase(login.pending, (state) => { state.status = 'loading'; state.error = '' })
      .addCase(login.fulfilled, (state, action) => { state.status = 'success'; state.user = action.payload })
      .addCase(login.rejected, (state, action) => { state.status = 'error'; state.error = action.payload || action.error.message })
      .addCase(register.pending, (state) => { state.status = 'loading'; state.error = '' })
      .addCase(register.fulfilled, (state, action) => { state.status = 'success'; state.user = action.payload })
      .addCase(register.rejected, (state, action) => { state.status = 'error'; state.error = action.payload || action.error.message })
      .addCase(refreshUser.fulfilled, (state, action) => { state.user = action.payload })
  },
})

export const { logout } = authSlice.actions
export default authSlice.reducer
