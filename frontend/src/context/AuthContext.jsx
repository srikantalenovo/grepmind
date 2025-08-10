import React, { createContext, useState } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
  }

  const signup = async (email, password, name) => {
    const res = await api.post('/auth/signup', { email, password, name });
    return res.data;
  }

  const logout = async () => {
    await api.post('/auth/logout');
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ accessToken, user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
