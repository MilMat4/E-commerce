import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { apiOrigin } from '../services/api'
import { useAuth, useCart } from '../store/hooks'
import { formatPrice, imageUrl, toPaise } from '../utils/format'

const loadRazorpayCheckout = () => new Promise((resolve) => {
  if (window.Razorpay) {
    resolve(true)
    return
  }
  const script = document.createElement('script')
  script.src = 'https://checkout.razorpay.com/v1/checkout.js'
  script.onload = () => resolve(true)
  script.onerror = () => resolve(false)
  document.body.appendChild(script)
})

export default function CartPage() {
  const { cart, loading, error: cartError, update, remove, refreshCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [address, setAddress] = useState(user?.address || {})
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const total = useMemo(() => cart.reduce((sum, item) => {
    const product = item.product
    return sum + toPaise(product?.price || 0) * item.quantity
  }, 0) / 100, [cart])

  const changeQuantity = async (item, quantity) => {
    try {
      setError('')
      if (quantity < 1) await remove(item.product._id)
      else await update(item.product._id, quantity)
    } catch (requestError) {
      setError(typeof requestError === 'string'
        ? requestError
        : requestError.response?.data?.message || 'Could not update your cart.')
    }
  }

  const checkout = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')
    let paymentOrderId
    try {
      const { data } = await api.post('/payments/razorpay/order', { shippingAddress: address })
      paymentOrderId = data.order.id
      if (!(await loadRazorpayCheckout())) {
        await api.post(`/payments/razorpay/order/${paymentOrderId}/cancel`)
        throw new Error('Razorpay Checkout could not be loaded. Check your internet connection and try again.')
      }

      let paymentHandled = false
      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'Morrow Market',
        description: 'Your Morrow Market order',
        order_id: data.order.razorpayOrderId,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#7657ce' },
        handler: async (paymentResponse) => {
          paymentHandled = true
          try {
            const { data: result } = await api.post('/payments/razorpay/verify', paymentResponse)
            await refreshCart()
            navigate(`/account/orders?placed=${result.order._id}`, { state: { placed: true } })
          } catch (requestError) {
            setError(requestError.response?.data?.message || 'Payment could not be confirmed. Contact support before paying again.')
          } finally {
            setSubmitting(false)
          }
        },
        modal: {
          ondismiss: async () => {
            if (paymentHandled) return
            try {
              await api.post(`/payments/razorpay/order/${paymentOrderId}/cancel`)
            } catch (requestError) {
              setError(requestError.response?.data?.message || 'Checkout closed, but payment status could not be checked. Please refresh before retrying.')
            } finally {
              setSubmitting(false)
            }
          },
        },
      })
      checkout.on('payment.failed', (paymentFailure) => {
        setError(paymentFailure.error?.description || 'Payment failed. You can retry from the Razorpay window.')
      })
      checkout.open()
    } catch (requestError) {
      if (paymentOrderId) {
        try {
          await api.post(`/payments/razorpay/order/${paymentOrderId}/cancel`)
        } catch {
          setError('Checkout setup failed and payment status could not be checked. Please refresh before retrying.')
          setSubmitting(false)
          return
        }
      }
      setError(requestError.response?.data?.message || requestError.message || 'We could not start payment. Please try again.')
      setSubmitting(false)
    }
  }

  const placeDemoOrder = async () => {
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const { data } = await api.post('/orders/demo', { shippingAddress: address })
      await refreshCart()
      navigate(`/account/orders?placed=${data.order._id}`, { state: { placed: true } })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not place the demo order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="section-wrap"><div className="loading-state"><span className="loading-spinner" />Gathering your cart…</div></div>

  return (
    <section className="section-wrap shopping-page">
      <header className="shopping-heading">
        <p className="eyebrow">Saved for your next chapter</p>
        <h1>Your <em>bag.</em></h1>
        <p>A few good things, all in one place.</p>
      </header>
      {(error || cartError) && <div className="inline-error" role="alert">{error || cartError}</div>}
      {message && <div className="success-message" role="status">{message}</div>}
      {cart.length === 0 ? (
        <div className="empty-state glass-panel">
          <span className="empty-sparkle" aria-hidden="true">✳</span>
          <h3>Your bag is taking a little breather.</h3>
          <p>Find something lovely to bring home.</p>
          <Link className="button button-dark" to="/products">Browse the collection <span>↗</span></Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items glass-panel">
            {cart.map((item) => {
              const product = item.product
              if (!product) return null
              const src = imageUrl(product.images?.[0], apiOrigin)
              return (
                <article className="cart-item" key={product._id}>
                  <Link className="cart-thumb" to={`/products/${product._id}`}>
                    {src ? <img alt="" src={src} /> : <span>{product.name.slice(0, 1)}</span>}
                  </Link>
                  <div className="cart-item-copy">
                    <p className="product-category">{product.category?.name || 'A thoughtful find'}</p>
                    <Link className="product-name" to={`/products/${product._id}`}>{product.name}</Link>
                    <p className="cart-unit-price">{formatPrice(toPaise(product.price) / 100)} each</p>
                    <div className="quantity-control">
                      <button aria-label={`Decrease ${product.name} quantity`} disabled={item.quantity <= 1} onClick={() => changeQuantity(item, item.quantity - 1)} type="button">−</button>
                      <span>{item.quantity}</span>
                      <button aria-label={`Increase ${product.name} quantity`} disabled={item.quantity >= product.stock} onClick={() => changeQuantity(item, item.quantity + 1)} type="button">+</button>
                    </div>
                  </div>
                  <div className="cart-item-end">
                    <strong>{formatPrice(toPaise(product.price) * item.quantity / 100)}</strong>
                    <button className="remove-link" onClick={() => changeQuantity(item, 0)} type="button">Remove</button>
                  </div>
                </article>
              )
            })}
            <Link className="back-link" to="/products">← Keep looking</Link>
          </div>
          <form className="order-summary glass-panel" onSubmit={checkout}>
            <p className="eyebrow">A little delivery detail</p>
            <h2>Order <em>summary.</em></h2>
            <label htmlFor="street">Street address</label>
            <input id="street" onChange={(event) => setAddress({ ...address, street: event.target.value })} required value={address.street || ''} />
            <div className="address-row">
              <div><label htmlFor="city">City</label><input id="city" onChange={(event) => setAddress({ ...address, city: event.target.value })} required value={address.city || ''} /></div>
              <div><label htmlFor="postalCode">Postal code</label><input id="postalCode" onChange={(event) => setAddress({ ...address, postalCode: event.target.value })} required value={address.postalCode || ''} /></div>
            </div>
            <label htmlFor="country">Country</label>
            <input id="country" onChange={(event) => setAddress({ ...address, country: event.target.value })} required value={address.country || ''} />
            <div className="summary-rule" />
            <div className="summary-total"><span>Subtotal</span><strong>{formatPrice(total)}</strong></div>
            <div className="summary-total"><span>Delivery</span><span>On us</span></div>
            <div className="summary-rule" />
            <div className="summary-total summary-grand"><span>Total</span><strong>{formatPrice(total)}</strong></div>
            <p className="form-note">Secure payment powered by Razorpay. Test keys are used during development.</p>
            <button className="button button-dark auth-submit" disabled={submitting} type="submit">
              {submitting ? 'Opening secure checkout…' : 'Continue to payment'} <span aria-hidden="true">↗</span>
            </button>
            {import.meta.env.VITE_DEMO_CHECKOUT_ENABLED === 'true' && (
              <button className="button button-outline auth-submit" disabled={submitting} onClick={placeDemoOrder} type="button">
                {submitting ? 'Placing demo order…' : 'Place demo order'} <span aria-hidden="true">↗</span>
              </button>
            )}
          </form>
        </div>
      )}
    </section>
  )
}
