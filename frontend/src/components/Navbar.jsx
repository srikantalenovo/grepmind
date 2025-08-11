import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/">Home</Link>

      {user && (
        <>
          <Link to="/dashboard">Dashboard</Link>

          {/* Admin-only link */}
          {user.role === 'admin' && <Link to="/admin">Admin Panel</Link>}

          {/* Admin + Editor */}
          {(user.role === 'admin' || user.role === 'editor') && (
            <Link to="/editor">Editor Tools</Link>
          )}
        </>
      )}

      {!user && (
        <>
          <Link to="/login">Login</Link>
          <Link to="/signup">Signup</Link>
        </>
      )}

      {user && (
        <button onClick={logout} style={{ marginLeft: '10px' }}>
          Logout
        </button>
      )}
    </nav>
  );
}
