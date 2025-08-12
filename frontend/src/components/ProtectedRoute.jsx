import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { user, initializing } = useContext(AuthContext);
  const location = useLocation();

  // Show loading until AuthContext is done
  if (initializing) {
    return <div>Loading...</div>; // TODO: Replace with spinner later
  }

  // If no user → force login
  if (!user || !user.role) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user role not in allowed list → block
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Otherwise, render
  return children;
};

export default ProtectedRoute;
