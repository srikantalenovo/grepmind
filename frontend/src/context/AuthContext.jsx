// src/context/AuthContext.js
import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ✅ For smart redirect
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const navigate = useNavigate();

  // Load stored token/user when app starts
  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      setAccessToken(storedToken);
      setUser(JSON.parse(storedUser));

      // Set axios default header
      axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
    }
    setInitializing(false);
  }, []);

  // Save token & user to localStorage
  const saveAuthData = (token, userData) => {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("user", JSON.stringify(userData));
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setAccessToken(token);
    setUser(userData);
  };

  // Smart redirect after login/signup
  const redirectByRole = (role) => {
    switch (role) {
      case "admin":
        navigate("/admin");
        break;
      case "editor":
        navigate("/editor");
        break;
      case "viewer":
        navigate("/viewer");
        break;
      default:
        navigate("/");
    }
  };

  // Login function
  const login = async (email, password) => {
    const res = await axios.post("/api/auth/login", { email, password });
    saveAuthData(res.data.accessToken, res.data.user);
    redirectByRole(res.data.user.role); // ✅ smart redirect
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
    redirectByRole(res.data.user.role); // ✅ smart redirect
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    setAccessToken(null);
    setUser(null);
    navigate("/login"); // ✅ redirect to login after logout
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
