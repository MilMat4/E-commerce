import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App.jsx'
import SessionSync from './store/SessionSync.jsx'
import { store } from './store/store'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <SessionSync />
      <App />
    </Provider>
  </StrictMode>,
)
