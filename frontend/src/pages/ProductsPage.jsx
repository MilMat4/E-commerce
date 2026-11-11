import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api'
import ProductGrid from '../components/ProductGrid'

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [categoriesError, setCategoriesError] = useState(false)
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [status, setStatus] = useState('loading')
  const [loadedRequest, setLoadedRequest] = useState('')
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const sort = searchParams.get('sort') || 'newest'
  const page = Number(searchParams.get('page') || 1)
  const requestKey = `${search}\u0000${category}\u0000${sort}\u0000${page}`
  const isLoading = loadedRequest !== requestKey

  useEffect(() => {
    api.get('/categories')
      .then(({ data }) => setCategories(data.categories))
      .catch(() => {
        setCategories([])
        setCategoriesError(true)
      })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    api.get('/products', {
      params: { search: search || undefined, category: category || undefined, sort, page, limit: 12 },
      signal: controller.signal,
    })
      .then(({ data }) => {
        setProducts(data.products)
        setPagination({ page: data.page, pages: data.pages, total: data.total })
        setStatus('success')
        setLoadedRequest(requestKey)
      })
      .catch((error) => {
        if (error.code !== 'ERR_CANCELED') {
          setStatus('error')
          setLoadedRequest(requestKey)
        }
      })
    return () => controller.abort()
  }, [search, category, sort, page, requestKey])

  const updateQuery = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    setSearchParams(next)
  }

  return (
    <section className="catalog-page section-wrap">
      <div className="catalog-intro">
        <p className="eyebrow">The Morrow collection</p>
        <h1>Good things, <em>all together.</em></h1>
        <p>Thoughtful pieces from the people who make them.</p>
      </div>
      <form className="catalog-search" onSubmit={(event) => {
        event.preventDefault()
        updateQuery('search', new FormData(event.currentTarget).get('search').trim())
      }}>
        <label className="sr-only" htmlFor="product-search">Search products</label>
        <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></svg>
        <input key={search} defaultValue={search} id="product-search" name="search" placeholder="Looking for something lovely?" />
        <button type="submit">Search</button>
      </form>
      <div className="catalog-toolbar">
        <div className="filter-group">
          <label className="sr-only" htmlFor="category-filter">Filter by category</label>
          <select id="category-filter" onChange={(event) => updateQuery('category', event.target.value)} value={category}>
            <option value="">All categories</option>
            {categories.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </select>
        </div>
        <span className="result-count">{pagination.total} {pagination.total === 1 ? 'find' : 'finds'}</span>
        <div className="sort-group">
          <label htmlFor="sort-products">Sort by</label>
          <select id="sort-products" onChange={(event) => updateQuery('sort', event.target.value)} value={sort}>
            <option value="newest">Just added</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </div>
      </div>
      {categoriesError && (
        <p className="catalog-notice" role="status">
          Categories couldn’t be loaded, but you can still browse all available products.
        </p>
      )}
      {isLoading && <div className="loading-state"><span className="loading-spinner" /> Gathering the good things…</div>}
      {!isLoading && status === 'error' && <div className="inline-error" role="alert">We couldn’t load products. Check your connection to the backend and try again.</div>}
      {!isLoading && status === 'success' && <ProductGrid products={products} />}
      {!isLoading && status === 'success' && pagination.pages > 1 && (
        <div className="pagination">
          <button
            disabled={page <= 1}
            onClick={() => updateQuery('page', String(page - 1))}
            type="button"
          >← Previous</button>
          <span>Page {pagination.page} of {pagination.pages}</span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => updateQuery('page', String(page + 1))}
            type="button"
          >Next →</button>
        </div>
      )}
    </section>
  )
}
