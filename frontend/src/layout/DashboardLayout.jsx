import React, { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";

export default function DashboardLayout({ children }) {
  const { user } = useContext(AuthContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-green-200 via-yellow-100 to-orange-200">
        <h1 className="text-2xl font-bold text-gray-700">
          Please login to access the dashboard.
        </h1>
      </div>
    );
  }

  return (
    <div className="flex bg-gradient-to-br from-green-50 via-white to-orange-50 min-h-screen">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-500 p-6 ${
          isSidebarOpen ? "ml-64" : "ml-20"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
