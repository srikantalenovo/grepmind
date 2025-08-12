import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, initializing } = useContext(AuthContext);
  const location = useLocation();

  // Wait until AuthContext finishes loading from localStorage
  if (initializing) {
    return <div>Loading...</div>; // You can replace with a spinner
  }

  // Not logged in → redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role not allowed → redirect to unauthorized page
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Allowed → render child component
  return children;
};

export default ProtectedRoute;
