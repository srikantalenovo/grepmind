import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
        <Outlet /> {/* ✅ Renders the nested route content */}
      </div>
    </div>
  );
}
