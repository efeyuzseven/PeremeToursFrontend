import { lazy, StrictMode, Suspense } from 'react'
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
import ProtectedAdminRoute, { PanelHomeRedirect } from './auth/ProtectedAdminRoute'
import ProtectedAccountRoute from './auth/ProtectedAccountRoute'
import LoginPage from './pages/LoginPage'
import ContactPage from './pages/ContactPage'
import FaqPage from './pages/FaqPage'
import KvkkPage from './pages/KvkkPage'
import TourPage from './pages/TourPage'
import TourPagesPage from './admin/TourPagesPage'
import FloatingSupport from './components/FloatingSupport'
import './styles.css'

// This entry point mounts the application; the admin-only screen is intentionally loaded on demand.
// eslint-disable-next-line react-refresh/only-export-components
const FeedbackPage = lazy(() => import('./admin/FeedbackPage'))
// eslint-disable-next-line react-refresh/only-export-components
const AccountPage = lazy(() => import('./pages/AccountPage'))
// eslint-disable-next-line react-refresh/only-export-components
const ContractPage = lazy(() => import('./pages/ContractPage'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/turlar/:categorySlug" element={<TourPage />} />
          <Route path="/tur/:tourId" element={<TourPage />} />
          <Route path="/login" element={<LoginPage key="login" />} />
          <Route path="/sifremi-unuttum" element={<LoginPage key="forgot" initialMode="forgot" />} />
          <Route path="/sifre-sifirla" element={<LoginPage key="reset" initialMode="reset" />} />
          <Route element={<ProtectedAccountRoute />}><Route path="/hesabim" element={<Suspense fallback={<div className="site-content-loading"><span className="button-spinner" /></div>}><AccountPage /></Suspense>} /><Route path="/account" element={<Suspense fallback={<div className="site-content-loading"><span className="button-spinner" /></div>}><AccountPage /></Suspense>} /></Route>
          <Route path="/iletisim" element={<ContactPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/sikca-sorulan-sorular" element={<FaqPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/kvkk-aydinlatma-metni" element={<KvkkPage />} />
          <Route path="/kvkk" element={<KvkkPage />} />
          <Route path="/mesafeli-satis-sozlesmesi" element={<Suspense fallback={<div className="site-content-loading"><span className="button-spinner" /></div>}><ContractPage /></Suspense>} />
          <Route path="/distance-sales-agreement" element={<Suspense fallback={<div className="site-content-loading"><span className="button-spinner" /></div>}><ContractPage /></Suspense>} />
          <Route element={<ProtectedAdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<PanelHomeRedirect />} />
              <Route path="tickets" element={<TicketsPage />} />
              <Route path="ticket-errors" element={<TicketErrorsPage />} />
              <Route path="tour-contents" element={<TourContentsPage />} />
              <Route path="tour-pages" element={<TourPagesPage />} />
              <Route path="site-content" element={<SiteContentPage />} />
              <Route path="faqs" element={<FrequentlyAskedQuestionsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="feedback" element={<Suspense fallback={<div className="site-content-loading"><span className="button-spinner" /></div>}><FeedbackPage /></Suspense>} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <FloatingSupport />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
