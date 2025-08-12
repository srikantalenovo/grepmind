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
import Analytics from "./pages/Analytics";
import LogsView from "./pages/LogsView";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Unauthorized from "./pages/Unauthorized";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected dashboard layout */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["viewer", "editor", "admin"]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Home />} />

            <Route
              path="/resources"
              element={
                <ProtectedRoute allowedRoles={["editor", "admin"]}>
                  <Resources />
                </ProtectedRoute>
              }
            />

            <Route
              path="/analyzer"
              element={
                <ProtectedRoute allowedRoles={["editor", "admin"]}>
                  <Analyzer />
                </ProtectedRoute>
              }
            />

            <Route
              path="/analytics"
              element={
                <ProtectedRoute allowedRoles={["editor", "admin"]}>
                  <Analytics />
                </ProtectedRoute>
              }
            />

            <Route
              path="/logs"
              element={
                <ProtectedRoute allowedRoles={["viewer", "editor", "admin"]}>
                  <LogsView />
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Users />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
