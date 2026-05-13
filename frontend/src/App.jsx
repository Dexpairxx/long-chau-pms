import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import HomePage from './pages/HomePage';
import Cart from './pages/Cart';
import OrderStatus from './pages/OrderStatus';
import Payment from './pages/Payment';
import Warehouse from './pages/Warehouse';
import OrderManagement from './pages/OrderManagement';
// import PlaceOrder from './pages/PlaceOrder';
import InStoreOrder from './pages/InStoreOrder';
import PrescriptionValidator from './pages/PrescriptionValidator';
import SalesReport from './pages/SalesReport';
import StaffManagement from './pages/StaffManagement';
import Promotions from './pages/Promotions';
import { CircularProgress, Box } from '@mui/material';
import theme from './theme';

// Role-based page access configuration
const PAGE_ACCESS = {
  customer: ['home', 'cart', 'order-status', 'payment'],
  cashier: ['home', 'warehouse', 'order-management', 'in-store-order'],
  pharmacist: ['home', 'prescription-validator'],
  branch_manager: ['home', 'warehouse', 'order-management', 'sales-report', 'staff-management', 'promotions']
};

// Protected Route Component
const ProtectedRoute = ({ children, requiredPage }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPage && !PAGE_ACCESS[user.role]?.includes(requiredPage)) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

// Public Route Component (redirect to home if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CartProvider>
        <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />

        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={
            <ProtectedRoute requiredPage="home">
              <HomePage />
            </ProtectedRoute>
          } />
          <Route path="cart" element={
            <ProtectedRoute requiredPage="cart">
              <Cart />
            </ProtectedRoute>
          } />
          <Route path="order-status" element={
            <ProtectedRoute requiredPage="order-status">
              <OrderStatus />
            </ProtectedRoute>
          } />
          <Route path="payment/:orderId" element={
            <ProtectedRoute requiredPage="payment">
              <Payment />
            </ProtectedRoute>
          } />
          <Route path="warehouse" element={
            <ProtectedRoute requiredPage="warehouse">
              <Warehouse />
            </ProtectedRoute>
          } />
          <Route path="order-management" element={
            <ProtectedRoute requiredPage="order-management">
              <OrderManagement />
            </ProtectedRoute>
          } />
          <Route path="in-store-order" element={
            <ProtectedRoute requiredPage="in-store-order">
              <InStoreOrder />
            </ProtectedRoute>
          } />
          <Route path="prescription-validator" element={
            <ProtectedRoute requiredPage="prescription-validator">
              <PrescriptionValidator />
            </ProtectedRoute>
          } />
          <Route path="sales-report" element={
            <ProtectedRoute requiredPage="sales-report">
              <SalesReport />
            </ProtectedRoute>
          } />
          <Route path="staff-management" element={
            <ProtectedRoute requiredPage="staff-management">
              <StaffManagement />
            </ProtectedRoute>
          } />
          <Route path="promotions" element={
            <ProtectedRoute requiredPage="promotions">
              <Promotions />
            </ProtectedRoute>
          } />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      </CartProvider>
    </ThemeProvider>
  );
}

export default App;
