import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.post('/auth/refresh');
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
      } catch (err) {}
    })();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    navigate('/dashboard');
  };

  const signup = async (email, password, name) => {
    const res = await api.post('/auth/signup', { email, password, name });
    return res.data;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setAccessToken(null);
    setUser(null);
    navigate('/login');
  };

  const authHeader = () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {});

  return (
    <AuthContext.Provider value={{ accessToken, user, login, signup, logout, authHeader }}>
      {children}
    </AuthContext.Provider>
  );
}
