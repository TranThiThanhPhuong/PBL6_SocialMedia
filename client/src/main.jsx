import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {BrowserRouter} from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { Provider } from 'react-redux'
import { store } from './app/store.js' 

// su dung Clerk de quan ly dang nhap
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Kiem tra xem PUBLISHABLE_KEY da duoc dinh nghia trong file .env hay chua
if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key')
}

// Khoi tao React va render App vao phan tu co id 'root'
createRoot(document.getElementById('root')).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    <BrowserRouter>
      <Provider store={store}> 
        <App />
      </Provider>
    </BrowserRouter>
  </ClerkProvider>
)

// ClerkProvider: cung cấp context về authentication (login, user info).
// BrowserRouter: cung cấp điều hướng cho SPA (Single Page Application).
// Provider store={store}: cung cấp Redux store để quản lý state toàn cục.