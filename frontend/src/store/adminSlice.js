import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../services/api'

const createAdminRequest = (type, request) => createAsyncThunk(type, async (payload, { rejectWithValue }) => {
  try {
    const { data } = await request(payload)
    return data
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'The admin request failed.')
  }
})

export const fetchAdminOverview = createAdminRequest('admin/fetchOverview', () => api.get('/dashboard/admin'))
export const fetchAdminUsers = createAdminRequest('admin/fetchUsers', (filter) => (
  api.get('/users', { params: filter ? { status: filter } : {} })
))
export const updateSellerApplication = createAdminRequest('admin/updateSeller', ({ id, action }) => (
  api.put(`/users/${id}/${action}-seller`)
))
export const updateAdminUserStatus = createAdminRequest('admin/updateUserStatus', ({ id, status }) => (
  api.put(`/users/${id}/status`, { status })
))
export const fetchAdminCategories = createAdminRequest('admin/fetchCategories', () => api.get('/categories/all'))
export const saveAdminCategory = createAdminRequest('admin/saveCategory', ({ id, form }) => (
  id ? api.put(`/categories/${id}`, form) : api.post('/categories', form)
))
export const updateAdminCategory = createAdminRequest('admin/updateCategory', ({ id, changes }) => (
  api.put(`/categories/${id}`, changes)
))
export const deleteAdminCategory = createAdminRequest('admin/deleteCategory', ({ id }) => (
  api.delete(`/categories/${id}`)
))
export const fetchAdminProducts = createAdminRequest('admin/fetchProducts', () => api.get('/products/mine'))
export const deactivateAdminProduct = createAdminRequest('admin/deactivateProduct', ({ id }) => (
  api.delete(`/products/${id}`)
))
export const fetchAdminOrders = createAdminRequest('admin/fetchOrders', () => api.get('/orders'))
export const fetchAdminReviews = createAdminRequest('admin/fetchReviews', (status) => (
  api.get('/reviews', { params: status === 'all' ? {} : { status } })
))
export const moderateAdminReview = createAdminRequest('admin/moderateReview', ({ id, status, moderationNote }) => (
  api.put(`/reviews/${id}/moderation`, { status, moderationNote })
))

const initialSection = () => ({ data: null, status: 'idle', error: '' })
const initialState = {
  overview: initialSection(),
  users: initialSection(),
  categories: initialSection(),
  products: initialSection(),
  orders: initialSection(),
  reviews: initialSection(),
}

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Keep each admin screen's data and request status together in the Redux store.
    const addFetchCases = (thunk, key, readData) => {
      builder
        .addCase(thunk.pending, (state) => {
          state[key].status = 'loading'
          state[key].error = ''
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state[key].data = readData(action.payload)
          state[key].status = 'success'
        })
        .addCase(thunk.rejected, (state, action) => {
          state[key].status = 'error'
          state[key].error = action.payload || action.error.message
        })
    }

    addFetchCases(fetchAdminOverview, 'overview', (data) => data.dashboard)
    addFetchCases(fetchAdminUsers, 'users', (data) => data.users)
    addFetchCases(fetchAdminCategories, 'categories', (data) => data.categories)
    addFetchCases(fetchAdminProducts, 'products', (data) => data.products)
    addFetchCases(fetchAdminOrders, 'orders', (data) => data.orders)
    addFetchCases(fetchAdminReviews, 'reviews', (data) => data.reviews)
  },
})

export default adminSlice.reducer
