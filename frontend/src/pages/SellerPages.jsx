import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { apiOrigin } from '../services/api'
import { useAuth } from '../store/hooks'
import { ErrorState, LoadingState } from '../components/PageState'
import { EmptyPanel, FormField, StatCard, StatusPill } from './CustomerPages'
import { formatPrice, imageUrl } from '../utils/format'

export function SellerOverview() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState(false)
  const load = () => api.get('/dashboard/seller').then(({ data }) => setDashboard(data.dashboard)).catch(() => setError(true))
  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="subpage-heading"><p className="eyebrow">Your maker space</p><h2>Make room for <em>good work.</em></h2><p>Keep an eye on your collection and the orders it’s finding a home in.</p></div>
      {!user.isApprovedSeller && <div className="notice-banner">Your seller application is waiting for admin approval. You can set up your profile while it’s reviewed.</div>}
      {error && <ErrorState message="We couldn’t load your seller summary." onRetry={load} />}
      {!dashboard && !error && <LoadingState label="Gathering your shop details…" />}
      {dashboard && (
        <>
          <div className="stats-grid">
            <StatCard label="Your products" value={dashboard.myProducts} note="Across your collection" />
            <StatCard label="Low on stock" value={dashboard.lowStockProducts} note={`Fewer than ${dashboard.lowStockThreshold} in stock`} />
            <StatCard label="Orders to care for" value={dashboard.pendingOrderActions} note={`${dashboard.relevantOrders} orders include your work`} />
          </div>
          <div className="shortcut-grid">
            <Link className="shortcut-card glass-panel" to="/seller/products"><span>↗</span><strong>Care for your collection</strong><small>Add a new product or update your listings.</small></Link>
            <Link className="shortcut-card glass-panel" to="/seller/orders"><span>→</span><strong>See what’s finding a home</strong><small>Review your order items and fulfillment.</small></Link>
          </div>
        </>
      )}
    </div>
  )
}

export function SellerProducts() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', category: '' })
  const [images, setImages] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setStatus('loading')
    try {
      const [{ data: productData }, { data: categoryData }] = await Promise.all([
        api.get('/products/mine'),
        api.get('/categories'),
      ])
      setProducts(productData.products)
      setCategories(categoryData.categories)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }
  useEffect(() => { load() }, [])

  const startEdit = (product) => {
    setEditing(product)
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      category: product.category?._id || product.category || '',
    })
    setImages([])
  }

  const resetForm = () => {
    setEditing(null)
    setForm({ name: '', description: '', price: '', stock: '', category: '' })
    setImages([])
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true); setError(''); setNotice('')
    const body = new FormData()
    Object.entries(form).forEach(([key, value]) => body.append(key, value))
    Array.from(images).forEach((image) => body.append('images', image))
    try {
      // Multipart uploads must preserve the browser-generated boundary.
      if (editing) await api.put(`/products/${editing._id}`, body, { headers: { 'Content-Type': 'multipart/form-data' } })
      else await api.post('/products', body, { headers: { 'Content-Type': 'multipart/form-data' } })
      setNotice(editing ? 'Your product has been updated.' : 'Your new product is in the collection.')
      resetForm()
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We couldn’t save this product.')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async (product) => {
    if (!window.confirm(`Deactivate “${product.name}”? It will no longer appear in the storefront.`)) return
    try {
      await api.delete(`/products/${product._id}`)
      setNotice('Product deactivated. Its order history has been preserved.')
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We couldn’t deactivate this product.')
    }
  }

  return (
    <div>
      <div className="subpage-heading"><p className="eyebrow">The things you make</p><h2>Your <em>collection.</em></h2><p>Add, update, and care for your product listings.</p></div>
      {!user.isApprovedSeller && <div className="notice-banner">Your seller account needs admin approval before you can list products.</div>}
      {notice && <div className="success-message" role="status">{notice}</div>}
      {error && <ErrorState message={error} />}
      {user.isApprovedSeller && (
        <form className="form-panel glass-panel seller-product-form" onSubmit={submit}>
          <div className="form-panel-heading"><div><p className="eyebrow">{editing ? 'A little refresh' : 'A new good thing'}</p><h3>{editing ? 'Edit your listing' : 'Add a product'}</h3></div>{editing && <button className="remove-link" onClick={resetForm} type="button">Cancel edit</button>}</div>
          <div className="form-grid">
            <FormField id="seller-product-name" label="Product name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
            <FormField id="seller-product-price" label="Price (INR)" type="number" value={form.price} onChange={(value) => setForm({ ...form, price: value })} required />
            <FormField id="seller-product-stock" label="Stock" type="number" value={form.stock} onChange={(value) => setForm({ ...form, stock: value })} required />
            <div className="form-field"><label htmlFor="seller-product-category">Category</label><select id="seller-product-category" onChange={(event) => setForm({ ...form, category: event.target.value })} required value={form.category}><option value="">Choose one</option>{categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></div>
            <div className="form-field form-field-wide"><label htmlFor="seller-product-description">A little about it</label><textarea id="seller-product-description" maxLength="2000" onChange={(event) => setForm({ ...form, description: event.target.value })} required rows="4" value={form.description} /></div>
            <div className="form-field form-field-wide"><label htmlFor="seller-product-images">Product photos <span className="field-hint">Up to 5 JPG, PNG, or WEBP images, 5 MB each.</span></label><input accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" id="seller-product-images" multiple onChange={(event) => setImages(event.target.files)} type="file" /></div>
          </div>
          {editing?.images?.length > 0 && <p className="form-note">Selecting new photos replaces the current product photos. Leave this blank to keep them.</p>}
          <button className="button button-dark" disabled={saving} type="submit">{saving ? 'Saving…' : editing ? 'Save changes' : 'Add to my collection'} <span>↗</span></button>
        </form>
      )}
      <div className="table-section-heading"><h3>Your listings <span>({products.length})</span></h3></div>
      {status === 'loading' && <LoadingState label="Gathering your products…" />}
      {status === 'error' && <ErrorState message="We couldn’t load your products." onRetry={load} />}
      {status === 'success' && products.length === 0 && <EmptyPanel title="Your first listing starts here." text="Add a product above to introduce your work to shoppers." />}
      {status === 'success' && products.length > 0 && (
        <div className="management-list">
          {products.map((product) => {
            const src = imageUrl(product.images?.[0], apiOrigin)
            return (
              <article className="management-row glass-panel" key={product._id}>
                <div className="management-product-image">{src ? <img alt="" src={src} /> : <span>{product.name.slice(0, 1)}</span>}</div>
                <div className="management-product-copy"><strong>{product.name}</strong><small>{product.category?.name || 'Uncategorized'} · {product.stock} in stock</small></div>
                <strong className="management-price">{formatPrice(product.price)}</strong>
                <StatusPill value={product.status} />
                <div className="management-actions"><button className="text-button" onClick={() => startEdit(product)} type="button">Edit</button>{product.status !== 'inactive' && <button className="remove-link" onClick={() => deactivate(product)} type="button">Deactivate</button>}</div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function SellerOrders() {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [busyItem, setBusyItem] = useState('')

  const load = () => {
    setStatus('loading')
    api.get('/orders').then(({ data }) => { setOrders(data.orders); setStatus('success') }).catch(() => setStatus('error'))
  }
  useEffect(() => { load() }, [])

  const advance = async (order, item) => {
    const next = { pending: 'confirmed', confirmed: 'shipped', shipped: 'delivered' }[item.fulfillmentStatus]
    if (!next) return
    setBusyItem(item._id); setError('')
    try {
      await api.put(`/orders/${order._id}/items/${item._id}/fulfillment`, { fulfillmentStatus: next })
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update fulfillment.')
    } finally {
      setBusyItem('')
    }
  }

  return (
    <div>
      <div className="subpage-heading"><p className="eyebrow">Thoughtful things on their way</p><h2>Your <em>orders.</em></h2><p>Update the progress of the products you’re sending out.</p></div>
      {error && <ErrorState message={error} />}
      {status === 'loading' && <LoadingState label="Gathering your orders…" />}
      {status === 'error' && <ErrorState message="We couldn’t load your orders." onRetry={load} />}
      {status === 'success' && orders.length === 0 && <EmptyPanel title="The next order is just around the corner." text="When someone finds your work, it’ll appear here." href="/seller/products" linkText="Visit your collection" />}
      {status === 'success' && orders.length > 0 && (
        <div className="order-list">
          {orders.map((order) => (
            <article className="order-card glass-panel" key={order._id}>
              <div className="order-card-heading"><div><p className="product-category">Placed {new Date(order.createdAt).toLocaleDateString('en-IN')}</p><strong>Order #{String(order._id).slice(-8).toUpperCase()}</strong></div><StatusPill value={order.orderStatus} /></div>
              <p className="seller-subtotal">Your items · {formatPrice(order.sellerSubtotal)}</p>
              {order.shippingAddress?.city && <p className="order-address">Ship to {order.shippingAddress.city}, {order.shippingAddress.country}</p>}
              <div className="order-items-preview">
                {order.items.map((item) => {
                  const next = { pending: 'confirmed', confirmed: 'shipped', shipped: 'delivered' }[item.fulfillmentStatus]
                  return (
                    <div className="seller-order-line" key={item._id}>
                      <span>{item.product?.name || item.productName} × {item.quantity}</span>
                      <StatusPill value={item.fulfillmentStatus} />
                      {next && order.orderStatus !== 'cancelled' && <button className="text-button" disabled={busyItem === item._id} onClick={() => advance(order, item)} type="button">{busyItem === item._id ? 'Saving…' : `Mark ${next}`}</button>}
                    </div>
                  )
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
