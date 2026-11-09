import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from './authSlice'
import { clearCart, fetchCart } from './cartSlice'
import { clearWishlist, fetchWishlist } from './wishlistSlice'

export default function SessionSync() {
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)

  useEffect(() => {
    const expireSession = () => dispatch(logout())
    window.addEventListener('session-expired', expireSession)
    return () => window.removeEventListener('session-expired', expireSession)
  }, [dispatch])

  useEffect(() => {
    // Customer-only data is loaded after login and cleared when the customer signs out.
    if (user?.role === 'customer') {
      const cartRequest = dispatch(fetchCart())
      const wishlistRequest = dispatch(fetchWishlist())
      return () => {
        cartRequest.abort()
        wishlistRequest.abort()
      }
    }

    dispatch(clearCart())
    dispatch(clearWishlist())
    return undefined
  }, [dispatch, user])

  return null
}
