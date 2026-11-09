import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, useCart } from '../store/hooks'

const COPYRIGHT_YEAR = new Date().getFullYear()

export default function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const cursorRef = useRef(null)
  const { user, logout } = useAuth()
  const { count } = useCart()
  const location = useLocation()
  const navigate = useNavigate()
  const accountUrl = user?.role === 'admin' ? '/admin' : user?.role === 'seller' ? '/seller' : '/account'
  const isProductsPage = location.pathname.startsWith('/products')
  const isNewArrivalsPage = location.pathname === '/products'
    && new URLSearchParams(location.search).get('sort') === 'newest'

  const signOut = () => {
    logout()
    setMenuOpen(false)
    navigate('/')
  }

  useEffect(() => {
    const cursor = cursorRef.current
    const finePointer = window.matchMedia('(pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!cursor || !finePointer.matches || reducedMotion.matches) return undefined

    let frame = 0

    const moveCursor = (event) => {
      if (event.pointerType === 'touch') return
      document.documentElement.classList.add('has-custom-cursor')
      if (!frame) {
        frame = window.requestAnimationFrame(() => {
          cursor.style.left = `${event.clientX}px`
          cursor.style.top = `${event.clientY}px`
          cursor.classList.add('is-visible')
          frame = 0
        })
      }

      const target = event.target
      cursor.classList.toggle(
        'is-interactive',
        target instanceof Element && Boolean(target.closest('a, button, input, select, textarea, [role="button"]')),
      )
    }

    const hideCursor = () => {
      cursor.classList.remove('is-visible', 'is-interactive', 'is-pressed')
      document.documentElement.classList.remove('has-custom-cursor')
    }
    const pressCursor = () => cursor.classList.add('is-pressed')
    const releaseCursor = () => cursor.classList.remove('is-pressed')
    const handleKeyDown = () => hideCursor()

    document.addEventListener('pointermove', moveCursor)
    document.addEventListener('pointerleave', hideCursor)
    document.addEventListener('pointerdown', pressCursor)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerup', releaseCursor)

    return () => {
      document.removeEventListener('pointermove', moveCursor)
      document.removeEventListener('pointerleave', hideCursor)
      document.removeEventListener('pointerdown', pressCursor)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerup', releaseCursor)
      if (frame) window.cancelAnimationFrame(frame)
      document.documentElement.classList.remove('has-custom-cursor')
    }
  }, [])

  return (
    <>
      <div aria-hidden="true" className="cursor-follower" ref={cursorRef} />
      <div className="announcement">
        <span>Thoughtful finds from independent sellers</span>
        <span className="announcement-note">A little more personal. A lot more to discover.</span>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="Morrow home">
            <span className="brand-mark">m</span>
            <span>morrow<span className="brand-period">.</span></span>
          </Link>
          <button
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            className="menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <span />
            <span />
          </button>
          <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
            <NavLink end onClick={() => setMenuOpen(false)} to="/">Home</NavLink>
            <Link
              aria-current={isProductsPage && !isNewArrivalsPage ? 'page' : undefined}
              className={isProductsPage && !isNewArrivalsPage ? 'active' : undefined}
              onClick={() => setMenuOpen(false)}
              to="/products"
            >
              Shop all
            </Link>
            <Link
              aria-current={isNewArrivalsPage ? 'page' : undefined}
              className={isNewArrivalsPage ? 'active' : undefined}
              onClick={() => setMenuOpen(false)}
              to="/products?sort=newest"
            >
              New arrivals
            </Link>
            {user && <NavLink onClick={() => setMenuOpen(false)} to={accountUrl}>My space</NavLink>}
          </nav>
          <div className="header-actions">
            {user ? (
              <>
                <Link className="account-link" to={accountUrl}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.5-3.6 3.2-5.5 7-5.5s6.5 1.9 7 5.5" /></svg>
                  <span>{user.name.split(' ')[0]}</span>
                </Link>
                <button className="text-button" onClick={signOut} type="button">Sign out</button>
              </>
            ) : (
              <Link className="account-link" to="/login">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.5-3.6 3.2-5.5 7-5.5s6.5 1.9 7 5.5" /></svg>
                <span>Account</span>
              </Link>
            )}
            <Link aria-label={`Shopping bag, ${count} items`} className="bag-link bag-count" title={`Shopping bag (${count})`} to={user?.role === 'customer' ? '/cart' : '/products'}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l1 12H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>
              {count > 0 && <span>{count > 99 ? '99+' : count}</span>}
            </Link>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <Link className="brand footer-brand" to="/">
          <span className="brand-mark">m</span>
          <span>morrow<span className="brand-period">.</span></span>
        </Link>
        <p>Made for finding the things you didn’t know you were looking for.</p>
        <span className="footer-copy">© {COPYRIGHT_YEAR} Morrow Market</span>
      </footer>
    </>
  )
}
