import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../services/api'

const requestError = (error) => error.response?.data?.message || 'We couldn’t update your cart.'

export const fetchCart = createAsyncThunk('cart/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/cart')
    return data.cart || []
  } catch (error) {
    return rejectWithValue(requestError(error))
  }
})

const createCartMutation = (type, request) => createAsyncThunk(type, async (payload, { dispatch, rejectWithValue }) => {
  try {
    await request(payload)
    return await dispatch(fetchCart()).unwrap()
  } catch (error) {
    return rejectWithValue(typeof error === 'string' ? error : requestError(error))
  }
})

export const addCartItem = createCartMutation('cart/add', ({ productId, quantity }) => (
  api.post('/cart/add', { productId, quantity })
))
export const updateCartItem = createCartMutation('cart/update', ({ productId, quantity }) => (
  api.put('/cart/update', { productId, quantity })
))
export const removeCartItem = createCartMutation('cart/remove', ({ productId }) => (
  api.delete(`/cart/remove/${productId}`)
))

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], status: 'idle', error: '' },
  reducers: {
    clearCart(state) {
      state.items = []
      state.status = 'idle'
      state.error = ''
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => { state.status = 'loading'; state.error = '' })
      .addCase(fetchCart.fulfilled, (state, action) => { state.items = action.payload; state.status = 'success' })
      .addCase(fetchCart.rejected, (state, action) => {
        state.status = action.meta.aborted ? 'idle' : 'error'
        state.error = action.meta.aborted ? '' : action.payload || action.error.message
      })
      .addCase(addCartItem.fulfilled, (state, action) => { state.items = action.payload })
      .addCase(updateCartItem.fulfilled, (state, action) => { state.items = action.payload })
      .addCase(removeCartItem.fulfilled, (state, action) => { state.items = action.payload })
  },
})

export const { clearCart } = cartSlice.actions
export default cartSlice.reducer
