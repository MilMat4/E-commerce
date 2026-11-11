import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api, { apiOrigin } from '../services/api'
import { useAuth, useWishlist } from '../store/hooks'
import { formatDate, formatPrice, imageUrl } from '../utils/format'
import { ErrorState, LoadingState } from '../components/PageState'

export function CustomerOverview() {
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState(false)
  const load = () => api.get('/dashboard/customer').then(({ data }) => setDashboard(data.dashboard)).catch(() => setError(true))
  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="subpage-heading"><p className="eyebrow">Your little corner</p><h2>Welcome to your <em>market.</em></h2><p>Keep an eye on the things you’ve saved and ordered.</p></div>
      {error && <ErrorState message="We couldn’t load your account summary." onRetry={load} />}
      {!dashboard && !error && <LoadingState label="Gathering your account…" />}
      {dashboard && (
        <>
          <div className="stats-grid">
            <StatCard label="Things in your bag" value={dashboard.cartItems} note="Ready when you are" />
            <StatCard label="Saved for later" value={dashboard.wishlistItems} note="A little inspiration" />
            <StatCard label="Orders placed" value={dashboard.totalOrders} note={`${dashboard.pendingOrders} still in progress`} />
          </div>
          <div className="shortcut-grid">
            <Link className="shortcut-card glass-panel" to="/account/orders"><span>→</span><strong>Follow your orders</strong><small>See where your finds are on their way.</small></Link>
            <Link className="shortcut-card glass-panel" to="/account/wishlist"><span>✳</span><strong>Your saved things</strong><small>Everything you’ve had your eye on.</small></Link>
            <Link className="shortcut-card glass-panel" to="/cart"><span>↗</span><strong>Pick up your bag</strong><small>Finish up whenever you’re ready.</small></Link>
          </div>
        </>
      )}
    </div>
  )
}

export function CustomerOrders() {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')
  const location = useLocation()
  const fetchOrders = () => {
    api.get('/orders').then(({ data }) => { setOrders(data.orders); setStatus('success') }).catch(() => setStatus('error'))
  }
  const load = () => {
    setStatus('loading')
    fetchOrders()
  }
  useEffect(() => { fetchOrders() }, [])

  return (
    <div>
      <div className="subpage-heading"><p className="eyebrow">A little record of good finds</p><h2>Your <em>orders.</em></h2><p>Order history and the latest status of your purchases.</p></div>
      {location.state?.placed && <div className="success-message">Your order is in. Thanks for shopping small.</div>}
      {status === 'loading' && <LoadingState label="Finding your orders…" />}
      {status === 'error' && <ErrorState message="We couldn’t load your orders." onRetry={load} />}
      {status === 'success' && orders.length === 0 && <EmptyPanel title="Your next favourite thing is out there." text="Orders you place will show up here." href="/products" linkText="Explore the market" />}
      {status === 'success' && orders.length > 0 && (
        <div className="order-list">
          {orders.map((order) => <OrderCard key={order._id} order={order} />)}
        </div>
      )}
    </div>
  )
}

export function CustomerWishlist() {
  const { toggle } = useWishlist()
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading')
  const fetchWishlist = () => {
    api.get('/wishlist').then(({ data }) => { setProducts(data.wishlist); setStatus('success') }).catch(() => setStatus('error'))
  }
  const load = () => {
    setStatus('loading')
    fetchWishlist()
  }
  useEffect(() => { fetchWishlist() }, [])

  const remove = async (id) => {
    try {
      await toggle(id)
      setProducts((current) => current.filter((product) => product._id !== id))
    } catch {
      setStatus('error')
    }
  }

  return (
    <div>
      <div className="subpage-heading"><p className="eyebrow">For another day</p><h2>Your <em>wishlist.</em></h2><p>All the things you’ve saved for later.</p></div>
      {status === 'loading' && <LoadingState label="Gathering the things you saved…" />}
      {status === 'error' && <ErrorState message="We couldn’t load your wishlist." onRetry={load} />}
      {status === 'success' && products.length === 0 && <EmptyPanel title="Save a little inspiration." text="Tap a heart on a product to keep it close." href="/products" linkText="Find something lovely" />}
      {status === 'success' && products.length > 0 && (
        <div className="product-grid">
          {products.map((product, index) => (
            <article className="product-card wishlist-card" key={product._id} style={{ '--card-index': index }}>
              <ProductVisual product={product} />
              <div className="product-info"><Link className="product-name" to={`/products/${product._id}`}>{product.name}</Link><span className="product-price">{formatPrice(product.price)}</span></div>
              <button className="remove-link" onClick={() => remove(product._id)} type="button">Remove from wishlist</button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export function CustomerProfile() {
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    country: user?.address?.country || '',
    postalCode: user?.address?.postalCode || '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true); setMessage(''); setError('')
    try {
      await api.put('/users/profile', {
        name: form.name,
        email: form.email,
        address: { street: form.street, city: form.city, country: form.country, postalCode: form.postalCode },
      })
      await refreshUser()
      setMessage('Your details are up to date.')
    } catch (requestError) {
      setError(typeof requestError === 'string'
        ? requestError
        : requestError.response?.data?.message || 'We couldn’t save those details.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="subpage-heading"><p className="eyebrow">A few details</p><h2>Your <em>profile.</em></h2><p>Keep your account and delivery details current.</p></div>
      {message && <div className="success-message" role="status">{message}</div>}
      {error && <ErrorState message={error} />}
      <form className="form-panel glass-panel profile-form" onSubmit={submit}>
        <div className="form-grid">
          <FormField id="profile-name" label="Full name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
          <FormField id="profile-email" label="Email address" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required />
          <FormField id="profile-street" label="Street address" value={form.street} onChange={(value) => setForm({ ...form, street: value })} />
          <FormField id="profile-city" label="City" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
          <FormField id="profile-country" label="Country" value={form.country} onChange={(value) => setForm({ ...form, country: value })} />
          <FormField id="profile-postal" label="Postal code" value={form.postalCode} onChange={(value) => setForm({ ...form, postalCode: value })} />
        </div>
        <button className="button button-dark" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save my details'} <span>↗</span></button>
      </form>
    </div>
  )
}

export function StatCard({ label, value, note }) {
  return <article className="stat-card glass-panel"><span>{label}</span><strong>{value ?? '—'}</strong><small>{note}</small></article>
}

export function OrderCard({ order }) {
  return (
    <article className="order-card glass-panel">
      <div className="order-card-heading"><div><p className="product-category">Placed {formatDate(order.createdAt)}</p><strong>Order #{String(order._id).slice(-8).toUpperCase()}</strong></div><StatusPill value={order.orderStatus} /></div>
      {order.paymentStatus && <p className="order-address">Payment · {String(order.paymentStatus).replaceAll('_', ' ')}</p>}
      <div className="order-items-preview">
        {order.items.map((item) => (
          <div className="order-line" key={item._id}>
            <span>{item.productName || item.product?.name} × {item.quantity} <small>· {String(item.fulfillmentStatus).replaceAll('_', ' ')}</small></span>
            <strong>{formatPrice(item.unitPrice * item.quantity)}</strong>
          </div>
        ))}
      </div>
      <div className="order-card-total"><span>Total</span><strong>{formatPrice(order.totalAmount)}</strong></div>
      {order.shippingAddress?.city && <p className="order-address">Delivering to {order.shippingAddress.city}, {order.shippingAddress.country}</p>}
    </article>
  )
}

export function StatusPill({ value }) {
  return <span className={`status-pill status-${String(value).toLowerCase()}`}>{String(value).replaceAll('_', ' ')}</span>
}

export function EmptyPanel({ title, text, href, linkText }) {
  return <div className="empty-state glass-panel"><span aria-hidden="true" className="empty-sparkle">✳</span><h3>{title}</h3><p>{text}</p>{href && <Link className="button button-dark" to={href}>{linkText} <span>↗</span></Link>}</div>
}

export function ProductVisual({ product }) {
  const src = imageUrl(product.images?.[0], apiOrigin)
  return <Link className="product-image image-tone-2" to={`/products/${product._id}`}>{src ? <img alt={product.name} loading="lazy" src={src} /> : <span className="image-placeholder">{product.name.slice(0, 1)}</span>}</Link>
}

export function FormField({ id, label, value, onChange, required = false, type = 'text' }) {
  return <div className="form-field"><label htmlFor={id}>{label}</label><input id={id} onChange={(event) => onChange(event.target.value)} required={required} type={type} value={value} /></div>
}
