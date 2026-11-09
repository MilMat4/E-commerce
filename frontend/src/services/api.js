import axios from 'axios'

// Keep the API URL in one place. Set VITE_API_URL when the backend runs elsewhere.
export const apiOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  .replace(/\/api\/?$/, '')

const api = axios.create({
  baseURL: `${apiOrigin}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Read the token for each request so login/logout changes apply immediately.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('session-expired'))
    }
    return Promise.reject(error)
  },
)

export default api
