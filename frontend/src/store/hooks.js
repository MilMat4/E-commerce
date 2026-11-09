import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { login, logout, refreshUser, register } from './authSlice'
import { addCartItem, fetchCart, removeCartItem, updateCartItem } from './cartSlice'
import { fetchWishlist, toggleWishlistItem } from './wishlistSlice'

export function useAuth() {
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)

  return {
    user,
    // unwrap() gives components normal promise behavior: user on success, thrown error on failure.
    login: useCallback((credentials) => dispatch(login(credentials)).unwrap(), [dispatch]),
    register: useCallback((details) => dispatch(register(details)).unwrap(), [dispatch]),
    refreshUser: useCallback(() => dispatch(refreshUser()).unwrap(), [dispatch]),
    logout: useCallback(() => dispatch(logout()), [dispatch]),
  }
}

export function useCart() {
  const dispatch = useDispatch()
  const { items: cart, status, error } = useSelector((state) => state.cart)

  return {
    cart,
    loading: status === 'loading',
    error,
    count: cart.reduce((total, item) => total + item.quantity, 0),
    refreshCart: useCallback(() => dispatch(fetchCart()).unwrap(), [dispatch]),
    add: useCallback((productId, quantity = 1) => (
      dispatch(addCartItem({ productId, quantity })).unwrap()
    ), [dispatch]),
    update: useCallback((productId, quantity) => (
      dispatch(updateCartItem({ productId, quantity })).unwrap()
    ), [dispatch]),
    remove: useCallback((productId) => dispatch(removeCartItem({ productId })).unwrap(), [dispatch]),
  }
}

export function useWishlist() {
  const dispatch = useDispatch()
  const productIds = useSelector((state) => state.wishlist.productIds)

  return {
    productIds,
    isSaved: (productId) => productIds.includes(productId),
    refreshWishlist: useCallback(() => dispatch(fetchWishlist()).unwrap(), [dispatch]),
    toggle: useCallback((productId) => (
      dispatch(toggleWishlistItem(productId)).unwrap().then((result) => result.saved)
    ), [dispatch]),
  }
}
