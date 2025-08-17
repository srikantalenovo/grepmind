import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import DashboardLayout from "./layout/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Resources from "./pages/Resources";
import Analyzer from "./pages/Analyzer";
import Helm from "./pages/Helm"; // <-- Add Helm page
import Analytics from "./pages/Analytics";
import LogsView from "./pages/LogsView";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Unauthorized from "./pages/Unauthorized";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Dashboard routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/resources" element={<Resources />} />

            {/* Analyzer main page */}
            <Route
              path="/analyzer"
              element={
                <ProtectedRoute allowedRoles={["editor", "admin"]}>
                  <Analyzer />
                </ProtectedRoute>
              }
            />

            {/* Helm tab under Analyzer */}
            <Route
              path="/analyzer/helm"
              element={
                <ProtectedRoute allowedRoles={["editor", "admin"]}>
                  <Helm />
                </ProtectedRoute>
              }
            />

            {/* Other protected pages */}
            <Route
              path="/analytics"
              element={
                <ProtectedRoute allowedRoles={["editor", "admin"]}>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route path="/logs" element={<LogsView />} />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
