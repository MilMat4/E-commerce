import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import cartReducer from './cartSlice'
import wishlistReducer from './wishlistSlice'
import adminReducer from './adminSlice'

export const store = configureStore({
  // Each key becomes a shared state branch available to every React component.
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    admin: adminReducer,
  },
})
