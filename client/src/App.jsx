import { useState, useEffect } from 'react'
import HomePage from './HomePage'
import CrescendoDashboard from './CrescendoDashboard'
import AuthModal from './AuthModal'

// page values: 'home' | 'dashboard' | 'markets' | 'portfolio' | 'news' | 'about' | 'contact' | 'profile'
// Dashboard-group pages share the CrescendoDashboard component with different initial tabs.
const DASHBOARD_TABS = { dashboard: 'Dashboard', markets: 'Markets', portfolio: 'Portfolio', news: 'News' }
const PROTECTED_PAGES = ['dashboard', 'markets', 'portfolio']

function App() {
  const [page, setPage] = useState('home')
  const [user, setUser] = useState(null) // null = logged out
  const [authModal, setAuthModal] = useState({ open: false, mode: 'signup' })

  const isLoggedIn = !!user

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(res => {
          if (res.ok) return res.json()
          throw new Error('Invalid token')
        })
        .then(data => {
          setUser({
            id: data.user.id,
            name: data.user.displayName || data.user.email.split('@')[0],
            email: data.user.email,
            role: data.user.role,
            initials: (data.user.displayName || data.user.email).slice(0, 2).toUpperCase(),
          })
        })
        .catch(() => {
          localStorage.removeItem('token')
        })
    }
  }, [])

  const navigate = (target) => {
    const key = target.toLowerCase()
    if (PROTECTED_PAGES.includes(key) && !isLoggedIn) {
      openAuth('login')
      return
    }
    setPage(key)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openAuth = (mode = 'signup') => {
    setAuthModal({ open: true, mode })
  }

  const handleAuth = (userData) => {
    setUser(userData)
    setAuthModal({ open: false, mode: 'signup' })
    // Navigate to dashboard after auth (bypass navigate guard since user just authenticated)
    if (!DASHBOARD_TABS[page] && page !== 'profile') {
      setPage('dashboard')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setPage('home')
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
          initialTab="Dashboard"
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

export default App
