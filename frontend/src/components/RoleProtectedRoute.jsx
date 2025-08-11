import React from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext  } from '../context/AuthContext';

export default function RoleProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
