// src/context/AuthContext.js
import React, { createContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Restore user & token on app start
  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser?.role) {
          setAccessToken(storedToken);
          setUser(parsedUser);
          axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
        } else {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
        }
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
      }
    }

    setInitializing(false);
  }, []);

  // Save auth data to state & storage
  const saveAuthData = (token, userData) => {
    if (!userData?.role) {
      console.error("User data missing role. Cannot proceed.");
      return;
    }
    localStorage.setItem("accessToken", token);
    localStorage.setItem("user", JSON.stringify(userData));
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setAccessToken(token);
    setUser(userData);
  };

  // Redirect based on role
  const redirectByRole = (role) => {
    switch (role) {
      case "admin":
        navigate("/"); // dashboard home
        break;
      case "editor":
        navigate("/resources");
        break;
      case "viewer":
        navigate("/logs");
        break;
      default:
        navigate("/");
    }
  };

  // Login function
  const login = async (email, password) => {
    const res = await axios.post("/api/auth/login", { email, password });
    saveAuthData(res.data.accessToken, res.data.user);
    // Use setTimeout to avoid race conditions with ProtectedRoute
    setTimeout(() => redirectByRole(res.data.user.role), 0);
  };

  // Signup function
  const signup = async (name, email, password, role) => {
    const res = await axios.post("/api/auth/signup", {
      name,
      email,
      password,
      role
    });
    saveAuthData(res.data.accessToken, res.data.user);
    setTimeout(() => redirectByRole(res.data.user.role), 0);
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    setAccessToken(null);
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        initializing,
        login,
        signup,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
