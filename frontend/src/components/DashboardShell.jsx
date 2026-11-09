import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../store/hooks'

const sections = {
  customer: [
    { to: '/account', label: 'Overview', end: true },
    { to: '/account/orders', label: 'My orders' },
    { to: '/account/wishlist', label: 'Wishlist' },
    { to: '/account/profile', label: 'Profile' },
  ],
  seller: [
    { to: '/seller', label: 'Overview', end: true },
    { to: '/seller/products', label: 'My products' },
    { to: '/seller/orders', label: 'Orders' },
    { to: '/seller/profile', label: 'Profile' },
  ],
  admin: [
    { to: '/admin', label: 'Overview', end: true },
    { to: '/admin/users', label: 'People' },
    { to: '/admin/categories', label: 'Categories' },
    { to: '/admin/products', label: 'Products' },
    { to: '/admin/orders', label: 'Orders' },
    { to: '/admin/reviews', label: 'Reviews' },
  ],
}

export default function DashboardShell() {
  const { user } = useAuth()
  const links = sections[user.role] || sections.customer

  return (
    <section className="dashboard-wrap section-wrap">
      <header className="dashboard-heading">
        <p className="eyebrow">{user.role} space</p>
        <h1>A place to <em>keep things moving.</em></h1>
      </header>
      <div className="dashboard-layout">
        <nav className="dashboard-nav glass-panel" aria-label={`${user.role} dashboard`}>
          <div className="dashboard-user">
            <span className="user-avatar">{user.name?.slice(0, 1).toUpperCase()}</span>
            <span><strong>{user.name}</strong><small>{user.email}</small></span>
          </div>
          {links.map((link) => (
            <NavLink end={link.end} key={link.to} to={link.to}>
              <span>{link.label}</span><span aria-hidden="true">↗</span>
            </NavLink>
          ))}
        </nav>
        <div className="dashboard-content"><Outlet /></div>
      </div>
    </section>
  )
}
