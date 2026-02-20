import { useState } from 'react'
import HomePage from './HomePage'
import CrescendoDashboard from './CrescendoDashboard'
import AuthModal from './AuthModal'
import { AuthProvider, useAuth } from './AuthContext'

// page values: 'home' | 'dashboard' | 'markets' | 'portfolio' | 'news' | 'about' | 'contact' | 'profile'
// Dashboard-group pages share the CrescendoDashboard component with different initial tabs.
const DASHBOARD_TABS = { dashboard: 'Portfolio', markets: 'Markets', news: 'News', portfolio: 'Portfolio' }

function AppInner() {
  const [page, setPage] = useState('home')
  const [authModal, setAuthModal] = useState({ open: false, mode: 'signup' })
  const auth = useAuth()

  const isLoggedIn = auth.isLoggedIn
  const user = auth.user ? {
    ...auth.user,
    name: auth.user.displayName || auth.user.email?.split('@')[0] || '',
    initials: (auth.user.displayName || auth.user.email || '??').slice(0, 2).toUpperCase(),
  } : null

  const navigate = (target) => {
    const key = target.toLowerCase()
    setPage(key)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openAuth = (mode = 'signup') => {
    setAuthModal({ open: true, mode })
  }

  const handleAuth = (userData) => {
    // AuthModal already called api.login/register which stores token
    // Just sync the user data with auth context
    auth.setUser(userData)
    setAuthModal({ open: false, mode: 'signup' })
    // If on home page, navigate to dashboard after auth
    if (!DASHBOARD_TABS[page] && page !== 'profile') {
      navigate('dashboard')
    }
  }

  const handleLogout = () => {
    auth.logout()
    navigate('home')
  }

  // Dashboard-group pages
  if (DASHBOARD_TABS[page]) {
    return (
      <>
        <CrescendoDashboard
          initialTab={DASHBOARD_TABS[page]}
          navigate={navigate}
          isLoggedIn={isLoggedIn}
          user={user}
          openAuth={openAuth}
          onLogout={handleLogout}
        />
        <AuthModal
          isOpen={authModal.open}
          onClose={() => setAuthModal({ ...authModal, open: false })}
          onAuth={handleAuth}
          initialMode={authModal.mode}
        />
      </>
    )
  }

  // Profile reuses dashboard shell with a profile flag
  if (page === 'profile') {
    return (
      <>
        <CrescendoDashboard
          initialTab="Portfolio"
          navigate={navigate}
          showProfile
          isLoggedIn={isLoggedIn}
          user={user}
          openAuth={openAuth}
          onLogout={handleLogout}
        />
        <AuthModal
          isOpen={authModal.open}
          onClose={() => setAuthModal({ ...authModal, open: false })}
          onAuth={handleAuth}
          initialMode={authModal.mode}
        />
      </>
    )
  }

  // Home / About / Contact all render the homepage (About & Contact are sections on it)
  return (
    <>
      <HomePage
        navigate={navigate}
        scrollTo={page === 'about' ? 'about' : page === 'contact' ? 'contact' : null}
        isLoggedIn={isLoggedIn}
        openAuth={openAuth}
        user={user}
      />
      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ ...authModal, open: false })}
        onAuth={handleAuth}
        initialMode={authModal.mode}
      />
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}

export default App
