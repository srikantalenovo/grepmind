import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import EditorTools from './pages/EditorTools';
import Unauthorized from './pages/Unauthorized';
import Login from './pages/Login';
import Signup from './pages/Signup';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/dashboard"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'editor', 'viewer']}>
              <Dashboard />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <AdminPanel />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/editor"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'editor']}>
              <EditorTools />
            </RoleProtectedRoute>
          }
        />

        <Route path="/unauthorized" element={<Unauthorized />} />
      </Routes>
    </Router>
  );
}

export default App;
