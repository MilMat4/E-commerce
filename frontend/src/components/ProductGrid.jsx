import ProductCard from './ProductCard'

export default function ProductGrid({ products }) {
  if (products.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-sparkle" aria-hidden="true">✳</span>
        <h3>No finds just yet</h3>
        <p>Try a different search or check back as sellers add more products.</p>
      </div>
    )
  }

  return (
    <div className="product-grid">
      {products.map((product, index) => (
        <ProductCard key={product._id} index={index} product={product} />
      ))}
    </div>
  )
}
