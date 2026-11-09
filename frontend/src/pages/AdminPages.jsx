import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { apiOrigin } from '../services/api'
import { ErrorState, LoadingState } from '../components/PageState'
import { EmptyPanel, StatCard, StatusPill } from './CustomerPages'
import { formatPrice, imageUrl } from '../utils/format'
import {
  deactivateAdminProduct,
  deleteAdminCategory,
  fetchAdminCategories,
  fetchAdminOrders,
  fetchAdminOverview,
  fetchAdminProducts,
  fetchAdminReviews,
  fetchAdminUsers,
  saveAdminCategory,
  updateAdminCategory,
  updateAdminUserStatus,
  moderateAdminReview,
  updateSellerApplication,
} from '../store/adminSlice'

export function AdminOverview() {
  const dispatch = useDispatch()
  const { data: dashboard, status, error } = useSelector((state) => state.admin.overview)
  const load = () => dispatch(fetchAdminOverview())
  useEffect(() => { dispatch(fetchAdminOverview()) }, [dispatch])

  return (
    <div>
      <div className="subpage-heading"><p className="eyebrow">The whole market</p><h2>A good view of <em>everything.</em></h2><p>Keep an eye on the people, products, and orders making the market.</p></div>
      {status === 'error' && <ErrorState message={error || 'We couldn’t load the market summary.'} onRetry={load} />}
      {(status === 'idle' || status === 'loading') && <LoadingState label="Gathering the market numbers…" />}
      {dashboard && (
        <div className="stats-grid admin-stats">
          <StatCard label="People" value={dashboard.totalUsers} note="All registered accounts" />
          <StatCard label="Approved sellers" value={dashboard.approvedSellers} note={`${dashboard.pendingSellerApplications} applications to review`} />
          <StatCard label="Active products" value={dashboard.activeProducts} note="Available in the market" />
          <StatCard label="Orders" value={dashboard.totalOrders} note={`${dashboard.cancelledOrders} cancelled`} />
        </div>
      )}
      <div className="shortcut-grid">
        <Shortcut to="/admin/users" title="People & seller applications" text="Review accounts and decide who can sell." />
        <Shortcut to="/admin/categories" title="Categories" text="Keep the market easy to explore." />
        <Shortcut to="/admin/orders" title="Orders" text="Review the full platform order list." />
      </div>
    </div>
  )
}

export function AdminUsers() {
  const dispatch = useDispatch()
  const { data: userData, status, error: loadError } = useSelector((state) => state.admin.users)
  const users = userData || []
  const [filter, setFilter] = useState('pending')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = () => dispatch(fetchAdminUsers(filter))
  useEffect(() => { dispatch(fetchAdminUsers(filter)) }, [dispatch, filter])

  const updateSeller = async (id, action) => {
    setError(''); setNotice('')
    try {
      const data = await dispatch(updateSellerApplication({ id, action })).unwrap()
      setNotice(data.message)
      await load()
    } catch (requestError) {
      setError(requestError || 'We couldn’t update this seller application.')
    }
  }

  const updateStatus = async (person) => {
    const next = person.status === 'active' ? 'inactive' : 'active'
    setError(''); setNotice('')
    try {
      const data = await dispatch(updateAdminUserStatus({ id: person._id, status: next })).unwrap()
      setNotice(data.message)
      await load()
    } catch (requestError) {
      setError(requestError || 'We couldn’t update this account.')
    }
  }

  return (
    <div>
      <div className="subpage-heading"><p className="eyebrow">People make the market</p><h2>Meet the <em>people.</em></h2><p>Review seller applications and manage account access.</p></div>
      {notice && <div className="success-message" role="status">{notice}</div>}
      {(error || status === 'error') && <ErrorState message={error || loadError || 'We couldn’t load accounts.'} onRetry={load} />}
      <div className="table-section-heading filter-heading"><h3>Accounts</h3><select aria-label="Filter users by status" onChange={(event) => setFilter(event.target.value)} value={filter}><option value="pending">Pending</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="">All statuses</option></select></div>
      {(status === 'idle' || status === 'loading') && <LoadingState label="Finding accounts…" />}
      {status === 'success' && users.length === 0 && <EmptyPanel title="No accounts in this view." text="Try another status filter." />}
      {status === 'success' && users.length > 0 && (
        <div className="management-list">
          {users.map((person) => (
            <article className="management-row glass-panel" key={person._id}>
              <span className="user-avatar small-avatar">{person.name?.slice(0, 1).toUpperCase()}</span>
              <div className="management-product-copy"><strong>{person.name}</strong><small>{person.email} · {person.role}</small></div>
              <StatusPill value={person.status} />
              <div className="management-actions">
                {person.role === 'seller' && !person.isApprovedSeller && person.status === 'pending' && <>
                  <button className="text-button" onClick={() => updateSeller(person._id, 'approve')} type="button">Approve seller</button>
                  <button className="remove-link" onClick={() => updateSeller(person._id, 'reject')} type="button">Reject</button>
                </>}
                {person.role !== 'admin' && <button className="text-button" onClick={() => updateStatus(person)} type="button">{person.status === 'active' ? 'Deactivate' : 'Activate'}</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export function AdminCategories() {
  const dispatch = useDispatch()
  const { data: categoryData, status, error: loadError } = useSelector((state) => state.admin.categories)
  const categories = categoryData || []
  const [form, setForm] = useState({ name: '', description: '' })
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => dispatch(fetchAdminCategories())
  useEffect(() => { dispatch(fetchAdminCategories()) }, [dispatch])

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true); setError(''); setNotice('')
    try {
      await dispatch(saveAdminCategory({ id: editing?._id, form })).unwrap()
      setNotice(editing ? 'Category updated.' : 'Category created.')
      setEditing(null); setForm({ name: '', description: '' })
      await load()
    } catch (requestError) {
      setError(requestError || 'We couldn’t save this category.')
    } finally {
      setSaving(false)
    }
  }

  const toggleCategory = async (category) => {
    try {
      await dispatch(updateAdminCategory({
        id: category._id,
        changes: { status: category.status === 'active' ? 'inactive' : 'active' },
      })).unwrap()
      setNotice(`Category ${category.status === 'active' ? 'deactivated' : 'activated'}.`)
      await load()
    } catch (requestError) {
      setError(requestError || 'We couldn’t update this category.')
    }
  }

  const deleteCategory = async (category) => {
    if (!window.confirm(`Permanently delete category “${category.name}”?`)) return
    try {
      await dispatch(deleteAdminCategory({ id: category._id })).unwrap()
      setNotice('Category deleted.')
      await load()
    } catch (requestError) {
      setError(requestError || 'This category cannot be deleted while products use it.')
    }
  }

  return (
    <div>
      <div className="subpage-heading"><p className="eyebrow">A place for every good thing</p><h2>Shape the <em>categories.</em></h2><p>Create categories and keep the public catalog organised.</p></div>
      {notice && <div className="success-message" role="status">{notice}</div>}
      {(error || status === 'error') && <ErrorState message={error || loadError || 'We couldn’t load categories.'} onRetry={load} />}
      <form className="form-panel glass-panel category-form" onSubmit={submit}>
        <div className="form-panel-heading"><h3>{editing ? 'Edit category' : 'Add a category'}</h3>{editing && <button className="remove-link" onClick={() => { setEditing(null); setForm({ name: '', description: '' }) }} type="button">Cancel</button>}</div>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="category-name">Category name</label><input id="category-name" onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} /></div>
          <div className="form-field"><label htmlFor="category-description">Description</label><input id="category-description" onChange={(event) => setForm({ ...form, description: event.target.value })} value={form.description} /></div>
        </div>
        <button className="button button-dark" disabled={saving} type="submit">{saving ? 'Saving…' : editing ? 'Save category' : 'Create category'} <span>↗</span></button>
      </form>
      <div className="table-section-heading"><h3>All categories <span>({categories.length})</span></h3></div>
      {(status === 'idle' || status === 'loading') && <LoadingState label="Gathering categories…" />}
      {status === 'success' && categories.length === 0 && <EmptyPanel title="A fresh canvas." text="Add a category to help shoppers discover products." />}
      {status === 'success' && categories.length > 0 && (
        <div className="management-list">
          {categories.map((category) => (
            <article className="management-row glass-panel" key={category._id}>
              <span className="category-mini-mark">✳</span>
              <div className="management-product-copy"><strong>{category.name}</strong><small>/{category.slug} · {category.description || 'No description'}</small></div>
              <StatusPill value={category.status} />
              <div className="management-actions">
                <button className="text-button" onClick={() => { setEditing(category); setForm({ name: category.name, description: category.description || '' }) }} type="button">Edit</button>
                <button className="text-button" onClick={() => toggleCategory(category)} type="button">{category.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                <button className="remove-link" onClick={() => deleteCategory(category)} type="button">Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export function AdminProducts() {
  const dispatch = useDispatch()
  const { data: productData, status, error: loadError } = useSelector((state) => state.admin.products)
  const products = productData || []
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const load = () => dispatch(fetchAdminProducts())
  useEffect(() => { dispatch(fetchAdminProducts()) }, [dispatch])

  const deactivate = async (product) => {
    try {
      await dispatch(deactivateAdminProduct({ id: product._id })).unwrap()
      setNotice('Product deactivated; its order history has been kept.')
      await load()
    } catch (requestError) {
      setError(requestError || 'Could not deactivate product.')
    }
  }

  return (
    <div>
      <div className="subpage-heading"><p className="eyebrow">Across every maker</p><h2>All the <em>products.</em></h2><p>Review active listings across the market.</p></div>
      {notice && <div className="success-message" role="status">{notice}</div>}
      {(error || status === 'error') && <ErrorState message={error || loadError || 'We couldn’t load products.'} onRetry={load} />}
      {(status === 'idle' || status === 'loading') && <LoadingState label="Gathering products…" />}
      {status === 'error' && <ErrorState message="We couldn’t load products." onRetry={load} />}
      {status === 'success' && products.length === 0 && <EmptyPanel title="The shelves are quiet." text="Products added by approved sellers will appear here." />}
      {status === 'success' && products.length > 0 && (
        <div className="management-list">
          {products.map((product) => {
            const src = imageUrl(product.images?.[0], apiOrigin)
            return <article className="management-row glass-panel" key={product._id}>
              <div className="management-product-image">{src ? <img alt="" src={src} /> : <span>{product.name.slice(0, 1)}</span>}</div>
              <div className="management-product-copy"><strong>{product.name}</strong><small>{product.seller?.name || 'Seller'} · {product.category?.name || 'Uncategorized'}</small></div>
              <strong className="management-price">{formatPrice(product.price)}</strong>
              <StatusPill value={product.status} />
              {product.status !== 'inactive' && <button className="remove-link" onClick={() => deactivate(product)} type="button">Deactivate</button>}
            </article>
          })}
        </div>
      )}
    </div>
  )
}

export function AdminOrders() {
  const dispatch = useDispatch()
  const { data: orderData, status, error: loadError } = useSelector((state) => state.admin.orders)
  const orders = orderData || []
  const load = () => dispatch(fetchAdminOrders())
  useEffect(() => { dispatch(fetchAdminOrders()) }, [dispatch])

  return (
    <div>
      <div className="subpage-heading"><p className="eyebrow">A view across the market</p><h2>Every <em>order.</em></h2><p>Review payment and fulfillment progress. Sellers update their own shipments.</p></div>
      {status === 'error' && <ErrorState message={loadError || 'We couldn’t load orders.'} onRetry={load} />}
      {(status === 'idle' || status === 'loading') && <LoadingState label="Gathering orders…" />}
      {status === 'success' && orders.length === 0 && <EmptyPanel title="No orders yet." text="Orders will appear here as customers check out." />}
      {status === 'success' && orders.length > 0 && (
        <div className="order-list">
          {orders.map((order) => (
            <article className="order-card glass-panel" key={order._id}>
              <OrderCardContents order={order} />
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function OrderCardContents({ order }) {
  return (
    <>
      <div className="order-card-heading"><div><p className="product-category">Placed {new Date(order.createdAt).toLocaleDateString('en-IN')} · {order.customer?.name || 'Customer'}</p><strong>Order #{String(order._id).slice(-8).toUpperCase()}</strong></div><StatusPill value={order.orderStatus} /></div>
      <p className="order-address">Payment · {order.paymentStatus}</p>
      <div className="order-items-preview">{order.items.map((item) => <div className="order-line" key={item._id}><span>{item.productName || item.product?.name} × {item.quantity} <small>· {item.seller?.name || 'Seller'}</small></span><strong>{formatPrice(item.unitPrice * item.quantity)}</strong></div>)}</div>
      <div className="order-card-total"><span>Total</span><strong>{formatPrice(order.totalAmount)}</strong></div>
    </>
  )
}

export function AdminReviews() {
  const dispatch = useDispatch()
  const { data: reviewData, status, error } = useSelector((state) => state.admin.reviews)
  const reviews = reviewData || []
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState('')
  const [actionError, setActionError] = useState('')
  const [notes, setNotes] = useState({})
  const load = () => dispatch(fetchAdminReviews(filter))

  useEffect(() => {
    dispatch(fetchAdminReviews(filter))
  }, [dispatch, filter])

  const moderate = async (review, nextStatus) => {
    setBusy(review._id)
    setActionError('')
    try {
      await dispatch(moderateAdminReview({
        id: review._id,
        status: nextStatus,
        moderationNote: nextStatus === 'blocked' ? notes[review._id] || '' : '',
      })).unwrap()
      setNotes((current) => ({ ...current, [review._id]: '' }))
      await load()
    } catch (requestError) {
      setActionError(requestError || 'We couldn’t update this review.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div>
      <div className="subpage-heading"><p className="eyebrow">Community care</p><h2>Review the <em>reviews.</em></h2><p>Customer reviews are published when submitted. Block content that violates the marketplace rules.</p></div>
      {actionError && <ErrorState message={actionError} />}
      {status === 'error' && <ErrorState message={error || 'We couldn’t load reviews.'} onRetry={load} />}
      <div className="table-section-heading filter-heading"><h3>Customer reviews</h3><select aria-label="Filter reviews" onChange={(event) => setFilter(event.target.value)} value={filter}><option value="all">All reviews</option><option value="approved">Published</option><option value="blocked">Blocked</option></select></div>
      {(status === 'idle' || status === 'loading') && <LoadingState label="Gathering customer reviews…" />}
      {status === 'success' && reviews.length === 0 && <EmptyPanel title="No reviews in this view." text="New customer reviews will appear here." />}
      {status === 'success' && reviews.length > 0 && (
        <div className="management-list">
          {reviews.map((review) => (
            <article className="management-row glass-panel review-admin-row" key={review._id}>
              <div className="management-product-copy">
                <strong>{review.product?.name || 'Product removed'} · {'★'.repeat(review.rating)}</strong>
                <small>{review.customer?.name || 'Customer'} · {review.customer?.email || ''} · {new Date(review.createdAt).toLocaleDateString('en-IN')}</small>
                {review.title && <strong>{review.title}</strong>}
                <p>{review.comment}</p>
                {review.moderationNote && <small>Admin note: {review.moderationNote}</small>}
              </div>
              <StatusPill value={review.status} />
              <div className="management-actions">
                {review.status === 'approved' && <>
                  <input aria-label={`Moderation note for ${review.product?.name || 'review'}`} maxLength={500} onChange={(event) => setNotes({ ...notes, [review._id]: event.target.value })} placeholder="Reason (optional)" value={notes[review._id] || ''} />
                  <button className="remove-link" disabled={busy === review._id} onClick={() => moderate(review, 'blocked')} type="button">Block</button>
                </>}
                {review.status === 'blocked' && <button className="text-button" disabled={busy === review._id} onClick={() => moderate(review, 'approved')} type="button">Restore</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function Shortcut({ to, title, text }) {
  return <Link className="shortcut-card glass-panel" to={to}><span>↗</span><strong>{title}</strong><small>{text}</small></Link>
}
