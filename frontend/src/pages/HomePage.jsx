import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import ProductGrid from '../components/ProductGrid'

const categoryColors = ['sage', 'peach', 'lavender', 'butter']

export default function HomePage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      api.get('/products?limit=4', { signal: controller.signal }),
      api.get('/categories', { signal: controller.signal }),
    ])
      .then(([productResponse, categoryResponse]) => {
        setProducts(productResponse.data.products)
        setCategories(categoryResponse.data.categories)
        setStatus('success')
      })
      .catch((error) => {
        if (error.code !== 'ERR_CANCELED') setStatus('error')
      })
    return () => controller.abort()
  }, [])

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> A marketplace with a little more meaning</p>
          <h1>Find your kind<br />of <em>wonder.</em></h1>
          <p className="hero-description">
            Good things, made by good people. Discover thoughtful pieces from independent makers and growing brands.
          </p>
          <div className="hero-actions">
            <Link className="button button-dark" to="/products">Explore the collection <span aria-hidden="true">↗</span></Link>
            <a className="quiet-link" href="#our-story">Our little story <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-note">
            <span className="avatar-stack" aria-hidden="true"><i>J</i><i>A</i><i>M</i></span>
            <span>Small makers. Big heart.</span>
          </div>
        </div>
        <div aria-label="Abstract warm-toned shapes representing a curated collection" className="hero-art" role="img">
          <div className="art-sun" />
          <div className="art-arch" />
          <div className="art-vase art-vase-one" />
          <div className="art-vase art-vase-two" />
          <div className="art-table" />
          <span className="art-caption">THE SLOW LIVING EDIT · Nº 01</span>
          <span className="art-sticker">made<br />with care</span>
        </div>
        <div className="hero-pagination"><span /> 01 <i /> 03</div>
      </section>

      <section className="category-section section-wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A good place to start</p>
            <h2>Explore by <em>feeling.</em></h2>
          </div>
          <Link className="quiet-link" to="/products">All categories <span aria-hidden="true">↗</span></Link>
        </div>
        {categories.length > 0 ? (
          <div className="category-grid">
            {categories.slice(0, 4).map((category, index) => (
              <Link
                className={`category-tile category-${categoryColors[index % categoryColors.length]}`}
                key={category._id}
                to={`/products?category=${category._id}`}
              >
                <span className="category-number">0{index + 1}</span>
                <span className="category-title">{category.name}</span>
                <span aria-hidden="true" className="category-arrow">↗</span>
                <span aria-hidden="true" className="category-orbit">{['◌', '✳', '◍', '✺'][index % 4]}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted-copy">Our makers are putting their collections together. Check back soon.</p>
        )}
      </section>

      <section className="featured-section">
        <div className="section-wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Picked with intention</p>
              <h2>Little things, <em>lovingly found.</em></h2>
            </div>
            <Link className="quiet-link" to="/products">See everything <span aria-hidden="true">↗</span></Link>
          </div>
          {status === 'loading' && <div className="loading-state"><span className="loading-spinner" /> Gathering the good things…</div>}
          {status === 'error' && (
            <div className="inline-error" role="alert">
              We couldn’t reach the shop. Check that the backend is running, then refresh.
            </div>
          )}
          {status === 'success' && <ProductGrid products={products} />}
          <div className="center-action"><Link className="button button-outline" to="/products">Shop all the good things <span aria-hidden="true">↗</span></Link></div>
        </div>
      </section>

      <section className="story-section section-wrap" id="our-story">
        <span aria-hidden="true" className="story-flower">✳</span>
        <p className="eyebrow">A market built around people</p>
        <h2>Behind every lovely thing,<br />there’s a <em>lovely human.</em></h2>
        <p>We bring independent sellers and curious shoppers together, so the things you bring home have a story worth sharing.</p>
        <Link className="quiet-link" to="/products">Meet the makers through their work <span aria-hidden="true">↗</span></Link>
      </section>
    </>
  )
}
