import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiOrigin } from '../services/api'
import { useAuth, useWishlist } from '../store/hooks'
import { formatPrice, imageUrl as resolveImageUrl } from '../utils/format'

export default function ProductCard({ product, index = 0 }) {
  const { user } = useAuth()
  const { isSaved, toggle } = useWishlist()
  const saved = isSaved(product._id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [imageUnavailable, setImageUnavailable] = useState(false)
  const image = resolveImageUrl(product.images?.[0], apiOrigin)

  return (
    <article className="product-card" style={{ '--card-index': index }}>
      <div className={`product-image image-tone-${index % 4}`}>
        <Link aria-label={`View ${product.name}`} className="product-card-image-link" to={`/products/${product._id}`}>
        {image && !imageUnavailable ? (
          <img alt={product.name} loading="lazy" onError={() => setImageUnavailable(true)} src={image} />
        ) : (
          <span className="image-placeholder" aria-hidden="true">{product.name.slice(0, 1)}</span>
        )}
        </Link>
        {product.stock <= 5 && product.stock > 0 && <span className="stock-tag">Almost gone</span>}
        {product.stock === 0 && <span className="stock-tag sold-out-tag">Sold out</span>}
        {user?.role === 'customer' && (
          <button
            aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            className={`wishlist-heart ${saved ? 'is-saved' : ''}`}
            disabled={busy}
            onClick={async () => {
              if (!user) return
              setBusy(true); setError('')
              try {
                await toggle(product._id)
              } catch (requestError) {
                setError(typeof requestError === 'string'
                  ? requestError
                  : requestError.response?.data?.message || 'Could not update wishlist.')
              } finally {
                setBusy(false)
              }
            }}
            type="button"
          >
            {saved ? '♥' : '♡'}
          </button>
        )}
      </div>
      <div className="product-info">
        <div>
          <p className="product-category">{product.category?.name || 'Curated find'}</p>
          <Link className="product-name" to={`/products/${product._id}`}>{product.name}</Link>
        </div>
        <span className="product-price">{formatPrice(product.price)}</span>
      </div>
      {product.seller?.name && <p className="product-seller">By {product.seller.name}</p>}
      {error && <span className="field-hint" role="status">{error}</span>}
    </article>
  )
}
