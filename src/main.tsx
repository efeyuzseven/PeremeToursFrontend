import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import App from './App'
import AdminLayout from './admin/AdminLayout'
import SiteContentPage from './admin/SiteContentPage'
import FrequentlyAskedQuestionsPage from './admin/FrequentlyAskedQuestionsPage'
import TicketsPage from './admin/TicketsPage'
import TicketErrorsPage from './admin/TicketErrorsPage'
import TourContentsPage from './admin/TourContentsPage'
import UsersPage from './admin/UsersPage'
import { AuthProvider } from './auth/AuthContext'
import ProtectedAdminRoute from './auth/ProtectedAdminRoute'
import ProtectedAccountRoute from './auth/ProtectedAccountRoute'
import AccountPage from './pages/AccountPage'
import LoginPage from './pages/LoginPage'
import ContactPage from './pages/ContactPage'
import FaqPage from './pages/FaqPage'
import KvkkPage from './pages/KvkkPage'
import TourPage from './pages/TourPage'
import TourPagesPage from './admin/TourPagesPage'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/turlar/:categorySlug" element={<TourPage />} />
          <Route path="/tur/:tourId" element={<TourPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedAccountRoute />}><Route path="/hesabim" element={<AccountPage />} /><Route path="/account" element={<AccountPage />} /></Route>
          <Route path="/iletisim" element={<ContactPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/sikca-sorulan-sorular" element={<FaqPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/kvkk-aydinlatma-metni" element={<KvkkPage />} />
          <Route path="/kvkk" element={<KvkkPage />} />
          <Route element={<ProtectedAdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="tickets" replace />} />
              <Route path="tickets" element={<TicketsPage />} />
              <Route path="ticket-errors" element={<TicketErrorsPage />} />
              <Route path="tour-contents" element={<TourContentsPage />} />
              <Route path="tour-pages" element={<TourPagesPage />} />
              <Route path="site-content" element={<SiteContentPage />} />
              <Route path="faqs" element={<FrequentlyAskedQuestionsPage />} />
              <Route path="users" element={<UsersPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
