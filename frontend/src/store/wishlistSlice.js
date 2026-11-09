import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../services/api'

export const fetchWishlist = createAsyncThunk('wishlist/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/wishlist')
    return data.wishlist.map((product) => product._id)
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'We couldn’t load your saved items.')
  }
})

export const toggleWishlistItem = createAsyncThunk(
  'wishlist/toggle',
  async (productId, { getState, rejectWithValue }) => {
    const wasSaved = getState().wishlist.productIds.includes(productId)
    try {
      if (wasSaved) await api.delete(`/wishlist/remove/${productId}`)
      else await api.post('/wishlist/add', { productId })
      return { productId, saved: !wasSaved }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'We couldn’t update your saved items.')
    }
  },
)

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { productIds: [], status: 'idle', error: '' },
  reducers: {
    clearWishlist(state) {
      state.productIds = []
      state.status = 'idle'
      state.error = ''
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => { state.status = 'loading'; state.error = '' })
      .addCase(fetchWishlist.fulfilled, (state, action) => { state.productIds = action.payload; state.status = 'success' })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.status = action.meta.aborted ? 'idle' : 'error'
        state.error = action.meta.aborted ? '' : action.payload || action.error.message
      })
      .addCase(toggleWishlistItem.fulfilled, (state, action) => {
        const { productId, saved } = action.payload
        state.productIds = saved
          ? [...new Set([...state.productIds, productId])]
          : state.productIds.filter((id) => id !== productId)
      })
  },
})

export const { clearWishlist } = wishlistSlice.actions
export default wishlistSlice.reducer
