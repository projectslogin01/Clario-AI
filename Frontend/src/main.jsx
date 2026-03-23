import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/main.scss'
import App from './App.jsx'
import { store } from './app/app.store.js'
import { Provider } from 'react-redux'

// Bootstraps the frontend app with the shared Redux store.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
