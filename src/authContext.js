// src/authContext.js
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from './Api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation(); // get current route
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const refreshTimeout = useRef();
  const [loading, setLoading] = useState(true);

  const refreshAccessToken = useCallback(async () => {
    try {
      const res = await api.post('/api/token', {}, { withCredentials: true });
      const newToken = res.data.accessToken;
      const decoded = jwtDecode(newToken);

      setUser(decoded);
      setAccessToken(newToken);
      setIsLoggedIn(true);

      const timeout = (decoded.exp - Date.now() / 1000) * 1000;
      clearTimeout(refreshTimeout.current);
      refreshTimeout.current = setTimeout(refreshAccessToken, timeout - 2000);

      if (sessionStorage.getItem('justLoggedIn')) {
        sessionStorage.removeItem('justLoggedIn');
      }
    } catch (err) {
      // Only log if the user had been logged in previously
      if (accessToken || isLoggedIn) {
        console.warn('Refresh token failed, user not logged in.', err?.response?.data || err.message);
      }
      setUser(null);
      setAccessToken(null);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  }, [accessToken, isLoggedIn]);

  useEffect(() => {
    refreshAccessToken();
  }, [location.pathname, refreshAccessToken]);

  const login = (token) => {
    const decoded = jwtDecode(token);
    setUser(decoded);
    setAccessToken(token);
    setIsLoggedIn(true);

    sessionStorage.setItem('justLoggedIn', 'true');

    const timeout = (decoded.exp - Date.now() / 1000) * 1000;
    clearTimeout(refreshTimeout.current);
    refreshTimeout.current = setTimeout(refreshAccessToken, timeout - 2000);
  };

  // authContext.js
  const logout = async (resetLoading = true) => {
    navigate("/", { replace: true });
    try {
      await api.post('/api/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }

    setUser(null);
    setAccessToken(null);
    setIsLoggedIn(false);
    clearTimeout(refreshTimeout.current);

    sessionStorage.removeItem('justLoggedIn');

    if (resetLoading) setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoggedIn, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
