import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);

  if (!user) return null; // No navbar if not logged in

  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex justify-between items-center shadow-lg">
      <div className="flex items-center gap-6">
        <Link to="/dashboard" className="text-lg font-semibold hover:text-gray-300">
          GrepMind
        </Link>
        <Link to="/projects" className="hover:text-gray-300">
          Projects
        </Link>
        <Link to="/settings" className="hover:text-gray-300">
          Settings
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-300">
          {user.name} ({user.role})
        </span>
        <button
          onClick={logout}
          className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-sm"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
