import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import UserLayout from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

// Protected Route
import ProtectedRoute from './components/ProtectedRoute';

// User Pages
import UserDashboard from './pages/user/Dashboard';
import UserProfile from './pages/user/Profile';
import CreateContent from './pages/user/CreateContent';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUserManagement from './pages/admin/UserManagement';

// Common & Error Pages
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';

import './App.css';
import './styles/create-content.css';

function App() {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={
          // isAuthenticated 
             <Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} /> 
            //  <Login />
        } />
        <Route path="/register" element={
          // isAuthenticated 
            // ? <Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} /> 
            <Register />
        } />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
      </Route>

      {/* User Routes */}
      <Route path="/dashboard" element={
        // <ProtectedRoute>
          <UserLayout>
            <UserDashboard />
          </UserLayout>
        // </ProtectedRoute>
      } />
      <Route path="/profile" element={

          <UserLayout>
            <UserProfile />
          </UserLayout>

      } />
      <Route path="/create-content" element={
        <ProtectedRoute>
          <UserLayout>
            <CreateContent />
          </UserLayout>
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminUserManagement />
          </AdminLayout>
        </ProtectedRoute>
      } />

      {/* Other Routes */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/not-found" element={<NotFound />} />
      
      {/* Home redirect */}
      <Route path="/" element={
        isAuthenticated 
          ? <Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} />
          : <Navigate to="/login" />
      } />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/not-found" />} />
    </Routes>
  );
}

export default App;
