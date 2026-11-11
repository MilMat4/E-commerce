import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth, useCart, useWishlist } from '../store/hooks'
import api, { apiOrigin } from '../services/api'
import { formatPrice, imageUrl } from '../utils/format'

export default function ProductPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { add } = useCart()
  const { isSaved, toggle } = useWishlist()
  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading')
  const [loadedProductId, setLoadedProductId] = useState('')
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [imageUnavailable, setImageUnavailable] = useState(false)
  const [cartStatus, setCartStatus] = useState('')
  const [addingToCart, setAddingToCart] = useState(false)
  const [savingWish, setSavingWish] = useState(false)
  const [reviews, setReviews] = useState([])
  const [reviewSummary, setReviewSummary] = useState({ count: 0, averageRating: 0 })
  const [reviewStatus, setReviewStatus] = useState('loading')
  const [reviewsProductId, setReviewsProductId] = useState('')
  const [reviewEligibility, setReviewEligibility] = useState({ eligible: false, reviewed: false, message: '' })
  const [eligibilityKey, setEligibilityKey] = useState('')
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' })
  const [reviewError, setReviewError] = useState('')
  const [reviewNotice, setReviewNotice] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    api.get(`/products/${productId}`, { signal: controller.signal })
      .then(({ data }) => {
        setProduct(data.product)
        setSelectedImageIndex(0)
        setImageUnavailable(false)
        setLoadedProductId(productId)
        setStatus('success')
      })
      .catch((error) => {
        if (error.code !== 'ERR_CANCELED') {
          setLoadedProductId(productId)
          setStatus(error.response?.status === 404 ? 'not-found' : 'error')
        }
      })
    return () => controller.abort()
  }, [productId])

  useEffect(() => {
    const controller = new AbortController()
    const requestEligibilityKey = `${productId}:${user?._id || ''}`
    api.get(`/reviews/products/${productId}`, { signal: controller.signal })
      .then(({ data }) => {
        setReviews(data.reviews)
        setReviewSummary({ count: data.count, averageRating: data.averageRating })
        setReviewsProductId(productId)
        setReviewStatus('success')
      })
      .catch((error) => {
        if (error.code !== 'ERR_CANCELED') {
          setReviewsProductId(productId)
          setReviewStatus('error')
        }
      })

    if (user?.role === 'customer') {
      api.get(`/reviews/products/${productId}/eligibility`, { signal: controller.signal })
        .then(({ data }) => {
          setReviewEligibility(data)
          setEligibilityKey(requestEligibilityKey)
        })
        .catch((error) => {
          if (error.code !== 'ERR_CANCELED') {
            setReviewEligibility({ eligible: false, reviewed: false, message: 'We couldn’t check review eligibility.' })
            setEligibilityKey(requestEligibilityKey)
          }
        })
    }

    return () => controller.abort()
  }, [productId, user?._id, user?.role])

  const productStatus = loadedProductId === productId ? status : 'loading'

  if (productStatus === 'loading') return <div className="page-message"><span className="loading-spinner" /> Loading this lovely find…</div>
  if (productStatus === 'not-found') {
    return <div className="page-message"><h1>We can’t find that one.</h1><Link className="button button-dark" to="/products">Back to the collection</Link></div>
  }
  if (productStatus === 'error') {
    return <div className="page-message"><h1>Something didn’t load.</h1><p>Check that the backend is running, then try again.</p></div>
  }

  const productImage = imageUrl(product.images?.[selectedImageIndex], apiOrigin)
  const saved = isSaved(product._id)

  const addToCart = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/products/${productId}` } })
      return
    }
    if (user.role !== 'customer') {
      setCartStatus('Shopping cart actions are available to customer accounts.')
      return
    }

    setAddingToCart(true)
    setCartStatus('')
    try {
      await add(product._id, 1)
      setCartStatus('Added to your cart. It’ll be waiting for you when you’re ready.')
    } catch (error) {
      setCartStatus(typeof error === 'string'
        ? error
        : error.response?.data?.message || 'We couldn’t add this to your cart. Please try again.')
    } finally {
      setAddingToCart(false)
    }
  }

  const toggleWishlist = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/products/${productId}` } })
      return
    }
    if (user.role !== 'customer') {
      setCartStatus('Wishlist actions are available to customer accounts.')
      return
    }

    setSavingWish(true)
    setCartStatus('')
    try {
      await toggle(product._id)
    } catch (error) {
      setCartStatus(typeof error === 'string'
        ? error
        : error.response?.data?.message || 'We couldn’t update your wishlist.')
    } finally {
      setSavingWish(false)
    }
  }

  const submitReview = async (event) => {
    event.preventDefault()
    setSubmittingReview(true)
    setReviewError('')
    setReviewNotice('')
    try {
      const { data } = await api.post(`/reviews/products/${productId}`, reviewForm)
      const nextReviews = [data.review, ...reviews]
      setReviews(nextReviews)
      setReviewSummary({
        count: nextReviews.length,
        averageRating: Number((nextReviews.reduce((sum, review) => sum + review.rating, 0) / nextReviews.length).toFixed(1)),
      })
      setReviewEligibility({ eligible: false, reviewed: true, message: 'You have already reviewed this product.' })
      setEligibilityKey(`${productId}:${user?._id || ''}`)
      setReviewsProductId(productId)
      setReviewForm({ rating: 5, title: '', comment: '' })
      setReviewNotice(data.message)
    } catch (requestError) {
      setReviewError(requestError.response?.data?.message || 'We couldn’t submit your review.')
    } finally {
      setSubmittingReview(false)
    }
  }

  const currentReviews = reviewsProductId === productId ? reviews : []
  const currentReviewSummary = reviewsProductId === productId ? reviewSummary : { count: 0, averageRating: 0 }
  const currentReviewStatus = reviewsProductId === productId ? reviewStatus : 'loading'
  const currentReviewEligibility = user?.role === 'customer'
    && eligibilityKey === `${productId}:${user?._id || ''}`
    ? reviewEligibility
    : { eligible: false, reviewed: false, message: '' }

  return (
    <section className="product-detail section-wrap">
      <Link className="back-link" to="/products">← Back to all finds</Link>
      <div className="product-detail-grid">
        <div className="detail-image-gallery">
          <div className="detail-image image-tone-1">
            {productImage && !imageUnavailable
            ? <img alt={product.name} onError={() => setImageUnavailable(true)} src={productImage} />
            : <span className="image-placeholder" aria-hidden="true">{product.name.slice(0, 1)}</span>}
          </div>
          {product.images?.length > 1 && (
            <div className="detail-image-thumbnails" aria-label="Product images">
              {product.images.map((image, index) => {
                const thumbnail = imageUrl(image, apiOrigin)
                return (
                  <button
                    aria-label={`View product image ${index + 1}`}
                    aria-pressed={selectedImageIndex === index}
                    className={selectedImageIndex === index ? 'is-selected' : ''}
                    key={`${image}-${index}`}
                    onClick={() => { setSelectedImageIndex(index); setImageUnavailable(false) }}
                    type="button"
                  >
                    {thumbnail
                      ? <img alt="" onError={(event) => { event.currentTarget.hidden = true }} src={thumbnail} />
                      : <span>{index + 1}</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{product.category?.name || 'A thoughtful find'}</p>
          <h1>{product.name}</h1>
          <p className="detail-price">{formatPrice(product.price)}</p>
          <div className="detail-rule" />
          <p className="detail-description">{product.description}</p>
          <p className={`detail-stock ${product.stock > 0 ? '' : 'out-of-stock'}`}>
            <span /> {product.stock > 0 ? `${product.stock} in stock` : 'Currently out of stock'}
          </p>
          <button className="button button-dark detail-add-button" disabled={product.stock === 0 || addingToCart} onClick={addToCart} type="button">
            {product.stock === 0 ? 'Out of stock' : addingToCart ? 'Adding to your cart…' : 'Add to cart'}
          </button>
          <button className={`button button-outline wishlist-detail-button ${saved ? 'is-saved' : ''}`} disabled={savingWish} onClick={toggleWishlist} type="button">
            {savingWish ? 'Saving…' : saved ? '♥ Saved to wishlist' : '♡ Save for later'}
          </button>
          {cartStatus && <p className="cart-feedback" role="status">{cartStatus}</p>}
          <p className="feature-note">A piece with a person and a story behind it.</p>
          {product.seller?.name && <p className="product-seller detail-seller">Made by {product.seller.name}</p>}
        </div>
      </div>
      <section className="product-reviews" aria-labelledby="product-reviews-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">From the community</p>
            <h2 id="product-reviews-title">Customer <em>reviews.</em></h2>
          </div>
          <span className="review-average" aria-label={`${currentReviewSummary.averageRating} out of 5 stars`}>
            {currentReviewSummary.count ? `★ ${currentReviewSummary.averageRating} · ${currentReviewSummary.count} ${currentReviewSummary.count === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}
          </span>
        </div>

        {reviewNotice && <p className="success-message" role="status">{reviewNotice}</p>}
        {reviewError && <p className="inline-error" role="alert">{reviewError}</p>}
        {user?.role === 'customer' && currentReviewEligibility.eligible && (
          <form className="review-form glass-panel" onSubmit={submitReview}>
            <h3>Share your experience</h3>
            <label htmlFor="review-rating">Rating</label>
            <select id="review-rating" onChange={(event) => setReviewForm({ ...reviewForm, rating: Number(event.target.value) })} value={reviewForm.rating}>
              <option value={5}>5 — Loved it</option>
              <option value={4}>4 — Really liked it</option>
              <option value={3}>3 — It’s nice</option>
              <option value={2}>2 — Not for me</option>
              <option value={1}>1 — Disappointed</option>
            </select>
            <label htmlFor="review-title">Title (optional)</label>
            <input id="review-title" maxLength={100} onChange={(event) => setReviewForm({ ...reviewForm, title: event.target.value })} value={reviewForm.title} />
            <label htmlFor="review-comment">Your review</label>
            <textarea id="review-comment" maxLength={2000} onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })} required rows={4} value={reviewForm.comment} />
            <button className="button button-dark" disabled={submittingReview} type="submit">{submittingReview ? 'Posting…' : 'Post review'} <span>↗</span></button>
          </form>
        )}
        {user?.role === 'customer' && !currentReviewEligibility.eligible && currentReviewEligibility.message && (
          <p className="review-eligibility">{currentReviewEligibility.message}</p>
        )}
        {!user && <p className="review-eligibility">Sign in and receive this product to leave a review.</p>}
        {user && user.role !== 'customer' && <p className="review-eligibility">Customer accounts can review purchased products.</p>}
        {currentReviewStatus === 'loading' && <p className="review-eligibility">Loading customer reviews…</p>}
        {currentReviewStatus === 'error' && <p className="inline-error" role="alert">Customer reviews couldn’t be loaded.</p>}
        {currentReviewStatus === 'success' && currentReviews.length === 0 && <p className="review-eligibility">Be the first to share your experience.</p>}
        {currentReviewStatus === 'success' && currentReviews.length > 0 && (
          <div className="review-list">
            {currentReviews.map((review) => (
              <article className="review-card glass-panel" key={review._id}>
                <div className="review-card-heading">
                  <strong>{review.customer?.name || 'Customer'}</strong>
                  <span aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                </div>
                {review.title && <h3>{review.title}</h3>}
                <p>{review.comment}</p>
                <small>{new Date(review.createdAt).toLocaleDateString('en-IN')} · Verified purchase</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
