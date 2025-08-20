import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {BrowserRouter} from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'

// su dung Clerk de quan ly dang nhap
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Kiem tra xem PUBLISHABLE_KEY da duoc dinh nghia trong file .env hay chua
if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}

// Khoi tao React va render App vao phan tu co id 'root'
createRoot(document.getElementById('root')).render(

  // Bao bo App trong ClerkProvider va BrowserRouter de cung cap cac chuc nang dang nhap va dieu huong
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    <BrowserRouter>
        <App />
    </BrowserRouter>
  </ClerkProvider>
)
