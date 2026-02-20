import { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as api from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("crescendo_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setTokenState] = useState(() => api.getToken());
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const isLoggedIn = !!token && !!user;

  // Fetch balance when logged in
  const refreshBalance = useCallback(async () => {
    if (!token) return;
    setBalanceLoading(true);
    try {
      const data = await api.getBalance();
      setBalance(data.balance);
    } catch (err) {
      if (err.status === 401) {
        // Token expired
        setUser(null);
        setTokenState(null);
        setBalance(null);
      }
      // Silently fail for other errors (user might not have wallet yet)
    } finally {
      setBalanceLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isLoggedIn) {
      refreshBalance();
    }
  }, [isLoggedIn, refreshBalance]);

  const handleLogin = async (email, password) => {
    const data = await api.login(email, password);
    setUser(data.user);
    setTokenState(data.token);
    return data;
  };

  const handleRegister = async (email, password, displayName) => {
    const data = await api.register(email, password, displayName, "investor");
    setUser(data.user);
    setTokenState(data.token);
    return data;
  };

  const handleGoogleAuth = async (credential) => {
    const data = await api.googleAuth(credential);
    setUser(data.user);
    setTokenState(data.token);
    return data;
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setTokenState(null);
    setBalance(null);
  };

  const value = {
    user,
    token,
    isLoggedIn,
    balance,
    balanceLoading,
    login: handleLogin,
    register: handleRegister,
    googleAuth: handleGoogleAuth,
    logout: handleLogout,
    refreshBalance,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
