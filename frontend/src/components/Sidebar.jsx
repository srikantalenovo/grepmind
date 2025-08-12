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
} from "react-icons/fa";
import { AuthContext } from "../context/AuthContext";

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useContext(AuthContext);

  // Define menus by role
  const roleMenus = {
    admin: [
      { name: "Home", icon: <FaHome />, path: "#" },
      { name: "Resources", icon: <FaBook />, path: "#" },
      { name: "Analyzer", icon: <FaBrain />, path: "#" },
      { name: "Analytics", icon: <FaChartBar />, path: "#" },
      { name: "LogsView", icon: <FaFileAlt />, path: "#" },
      { name: "Users", icon: <FaUsers />, path: "#" },
      { name: "Settings", icon: <FaCog />, path: "#" },
    ],
    editor: [
      { name: "Home", icon: <FaHome />, path: "#" },
      { name: "Resources", icon: <FaBook />, path: "#" },
      { name: "Analyzer", icon: <FaBrain />, path: "#" },
      { name: "Analytics", icon: <FaChartBar />, path: "#" },
      { name: "LogsView", icon: <FaFileAlt />, path: "#" },
    ],
    viewer: [
      { name: "Home", icon: <FaHome />, path: "#" },
      { name: "Resources", icon: <FaBook />, path: "#" },
      { name: "LogsView", icon: <FaFileAlt />, path: "#" },
    ],
  };

  // Get menus based on role, fallback to empty array
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
            <h1
              className={`text-2xl font-bold whitespace-nowrap transition-all duration-500
                ${isOpen ? "opacity-100" : "opacity-0 overflow-hidden w-0"}`}
            >
              <span className="text-green-500">Grep</span>
              <span className="text-orange-500">Mind</span>
            </h1>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg hover:bg-white/30"
            >
              <FaBars />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="space-y-4">
            {menuItems.map((item, idx) => (
              <a
                key={idx}
                href={item.path}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/30 transition-colors"
              >
                <span className="text-xl">{item.icon}</span>
                <span
                  className={`text-sm font-medium transition-all duration-500
                    ${isOpen ? "opacity-100" : "opacity-0 overflow-hidden w-0"}`}
                >
                  {item.name}
                </span>
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Logout Floating Button */}
      <button
        onClick={logout}
        className="absolute top-4 right-[-3rem] p-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition"
        title="Logout"
      >
        <FaSignOutAlt size={18} />
      </button>
    </div>
  );
}
