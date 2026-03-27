import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_URL = 'https://tictactoe-multiplayer-75ud.onrender.com';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('ttt-token'));
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  // Persist token
  useEffect(() => {
    if (token) {
      localStorage.setItem('ttt-token', token);
    } else {
      localStorage.removeItem('ttt-token');
    }
  }, [token]);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
        } else {
          setToken(null);
          setUser(null);
        }
      } catch {
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    validateToken();
  }, [token]);

  const register = useCallback(async (username, email, password) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!data.success) {
      const msg = data.errors?.[0]?.msg || data.message || 'Registration failed.';
      throw new Error(msg);
    }
    setToken(data.data.token);
    setUser(data.data);
    return data.data;
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Login failed.');
    }
    setToken(data.data.token);
    setUser(data.data);
    return data.data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  /** Refresh user data from server (e.g. after a game to update stats). */
  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setUser(data.data);
    } catch { /* silent */ }
  }, [token]);

  return (
    <AuthContext.Provider value={{
      user, token, isAuthenticated, loading,
      register, login, logout, refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};
