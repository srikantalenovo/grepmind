// src/components/Sidebar.jsx
import React, { useContext } from "react";
import {
  FaHome,
  FaBook,
  FaBrain,
  FaChartBar,
  FaFileAlt,
  FaUsers,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const roleMenus = {
    admin: [
      { name: "Home", icon: <FaHome />, path: "/" },
      { name: "Resources", icon: <FaBook />, path: "/resources" },
      { name: "Analyzer", icon: <FaBrain />, path: "/analyzer" },
      { name: "Analytics", icon: <FaChartBar />, path: "/analytics" },
      { name: "LogsView", icon: <FaFileAlt />, path: "/logs" },
      { name: "Users", icon: <FaUsers />, path: "/users" },
      { name: "Settings", icon: <FaCog />, path: "/settings" },
    ],
    editor: [
      { name: "Home", icon: <FaHome />, path: "/" },
      { name: "Resources", icon: <FaBook />, path: "/resources" },
      { name: "Analyzer", icon: <FaBrain />, path: "/analyzer" },
      { name: "Analytics", icon: <FaChartBar />, path: "/analytics" },
      { name: "LogsView", icon: <FaFileAlt />, path: "/logs" },
    ],
    viewer: [
      { name: "Home", icon: <FaHome />, path: "/" },
      { name: "Resources", icon: <FaBook />, path: "/resources" },
      { name: "LogsView", icon: <FaFileAlt />, path: "/logs" },
    ],
  };

  const menuItems = roleMenus[user?.role] || [];

  return (
    <div className="fixed top-0 left-0 h-screen z-50 flex">
      <div
        className={`h-full p-4 pt-6 flex flex-col justify-between shadow-lg transition-all duration-500 ease-in-out
          ${isOpen ? "w-64" : "w-20"} 
          bg-white/20 backdrop-blur-lg border border-white/30 rounded-r-2xl`}
      >
        {/* Top Section */}
        <div>
          {/* App Name + Toggle */}
          <div className="flex items-center justify-between mb-8">
            <div
              className={`flex items-center transition-all duration-500 overflow-hidden 
              ${isOpen ? "opacity-100 w-auto" : "opacity-0 w-0"}`}
            >
              <h1 className="text-2xl font-bold whitespace-nowrap">
                <span className="text-green-500">Grep</span>
                <span className="text-orange-500">Mind</span>
              </h1>
            </div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg hover:bg-white/30 transition-transform duration-300"
            >
              <FaBars
                className={`transition-transform duration-300 ${
                  isOpen ? "rotate-90" : "rotate-0"
                }`}
              />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="space-y-2">
            {menuItems.map((item, idx) => {
              const isActive = location.pathname === item.path;
              return (
                <div key={idx} className="relative group">
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 
                      ${isActive ? "bg-green-500 text-white" : "hover:bg-white/30"}`}
                  >
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <span
                      className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out
                        ${isOpen ? "opacity-100 w-auto" : "opacity-0 w-0"}`}
                    >
                      {item.name}
                    </span>
                  </Link>

                  {/* Tooltip with fade + slide */}
                  {!isOpen && (
                    <span
                      className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 text-xs bg-black text-white rounded 
                      opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 ease-in-out
                      whitespace-nowrap shadow-lg z-50"
                    >
                      {item.name}
                    </span>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <div className="flex justify-center mb-4 relative group">
          <button
            onClick={logout}
            className="p-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition"
            title="Logout"
          >
            <FaSignOutAlt size={18} />
          </button>

          {/* Tooltip for Logout with fade + slide */}
          {!isOpen && (
            <span
              className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 text-xs bg-black text-white rounded 
              opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 ease-in-out
              whitespace-nowrap shadow-lg z-50"
            >
              Logout
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
