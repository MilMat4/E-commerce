import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/hooks'

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [role, setRole] = useState('customer')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate replace to={user.role === 'admin' ? '/admin' : user.role === 'seller' ? '/seller' : '/account'} />

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const formData = new FormData(event.currentTarget)
    const details = {
      email: formData.get('email').trim(),
      password: formData.get('password'),
    }
    try {
      let signedInUser
      if (isRegister) {
        signedInUser = await register({ ...details, name: formData.get('name').trim(), role })
      } else {
        signedInUser = await login(details)
      }
      const destination = location.state?.from
        || (signedInUser.role === 'admin' ? '/admin' : signedInUser.role === 'seller' ? '/seller' : '/account')
      navigate(destination, { replace: true })
    } catch (requestError) {
      setError(typeof requestError === 'string'
        ? requestError
        : requestError.response?.data?.message || 'We couldn’t complete that request. Check that the backend is running.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-art" aria-hidden="true">
        <div className="auth-art-sun" />
        <div className="auth-art-arch" />
        <span>good things<br />start here</span>
      </div>
      <div className="auth-panel">
        <Link className="back-link" to="/">← Back to Morrow</Link>
        <p className="eyebrow">{isRegister ? 'Make yourself at home' : 'Lovely to see you again'}</p>
        <h1>{isRegister ? <>Join the <em>good find.</em></> : <>Welcome <em>back.</em></>}</h1>
        <p className="auth-intro">{isRegister ? 'Create an account to find and save your next favourite thing.' : 'Sign in to pick up right where you left off.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {isRegister && (
            <>
              <label htmlFor="name">Your name</label>
              <input autoComplete="name" id="name" maxLength="100" minLength="2" name="name" placeholder="e.g. Alex Morgan" required />
            </>
          )}
          <label htmlFor="email">Email address</label>
          <input autoComplete="email" id="email" name="email" placeholder="you@example.com" required type="email" />
          <label htmlFor="password">Password</label>
          <input autoComplete={isRegister ? 'new-password' : 'current-password'} id="password" minLength="6" name="password" placeholder="At least 6 characters" required type="password" />
          {isRegister && (
            <>
              <label htmlFor="role">I’m here as a</label>
              <select id="role" onChange={(event) => setRole(event.target.value)} value={role}>
                <option value="customer">Customer</option>
                <option value="seller">Seller</option>
              </select>
              {role === 'seller' && <p className="form-note">Seller accounts need admin approval before listing products.</p>}
            </>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-dark auth-submit" disabled={submitting} type="submit">
            {submitting ? 'One moment…' : isRegister ? 'Create my account' : 'Sign in'}
            {!submitting && <span aria-hidden="true">↗</span>}
          </button>
        </form>
        <p className="auth-switch">
          {isRegister ? 'Already part of the market?' : 'New around here?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link>
        </p>
        <p className="auth-demo-note">Demo storefront · Seller accounts need admin approval before listing products.</p>
      </div>
    </section>
  )
}
