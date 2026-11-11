import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import RoleGuard from './components/RoleGuard'
import DashboardShell from './components/DashboardShell'
import AuthPage from './pages/AuthPage'
import CartPage from './pages/CartPage'
import {
  CustomerOrders,
  CustomerOrderDetail,
  CustomerOverview,
  CustomerProfile,
  CustomerWishlist,
} from './pages/CustomerPages'
import {
  AdminCategories,
  AdminOrders,
  AdminOverview,
  AdminProducts,
  AdminReviews,
  AdminUsers,
} from './pages/AdminPages'
import HomePage from './pages/HomePage'
import ProductPage from './pages/ProductPage'
import ProductsPage from './pages/ProductsPage'
import {
  SellerOrders,
  SellerOverview,
  SellerProducts,
} from './pages/SellerPages'
import SiteLayout from './components/SiteLayout'
import './App.css'

function NotFoundPage() {
  return (
    <div className="page-message">
      <p className="eyebrow">A little off the map</p>
      <h1>This page wandered away.</h1>
      <a className="button button-dark" href="/">Back home <span aria-hidden="true">↗</span></a>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
            <Route element={<SiteLayout />}>
              <Route element={<HomePage />} index />
              <Route element={<ProductsPage />} path="products" />
              <Route element={<ProductPage />} path="products/:productId" />
              <Route element={<RoleGuard roles={['customer']}><CartPage /></RoleGuard>} path="cart" />
              <Route element={<AuthPage mode="login" />} path="login" />
              <Route element={<AuthPage mode="register" />} path="register" />
              <Route
                element={<RoleGuard roles={['customer']}><DashboardShell /></RoleGuard>}
                path="account"
              >
                <Route element={<CustomerOverview />} index />
                <Route element={<CustomerOrders />} path="orders" />
                <Route element={<CustomerOrderDetail />} path="orders/:orderId" />
                <Route element={<CustomerWishlist />} path="wishlist" />
                <Route element={<CustomerProfile />} path="profile" />
              </Route>
              <Route
                element={<RoleGuard roles={['seller']}><DashboardShell /></RoleGuard>}
                path="seller"
              >
                <Route element={<SellerOverview />} index />
                <Route element={<SellerProducts />} path="products" />
                <Route element={<SellerOrders />} path="orders" />
                <Route element={<CustomerProfile />} path="profile" />
              </Route>
              <Route
                element={<RoleGuard roles={['admin']}><DashboardShell /></RoleGuard>}
                path="admin"
              >
                <Route element={<AdminOverview />} index />
                <Route element={<AdminUsers />} path="users" />
                <Route element={<AdminCategories />} path="categories" />
                <Route element={<AdminProducts />} path="products" />
                <Route element={<AdminOrders />} path="orders" />
                <Route element={<AdminReviews />} path="reviews" />
              </Route>
              <Route element={<NotFoundPage />} path="not-found" />
              <Route element={<Navigate replace to="/not-found" />} path="*" />
            </Route>
      </Routes>
    </BrowserRouter>
  )
}
