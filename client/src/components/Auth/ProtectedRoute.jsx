import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import SkeletonLoading from '../Common/SkeletonLoading';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <SkeletonLoading />;
  }

  if (!user) {
    return <Navigate to="/" replace /> // Currently handled by App.jsx, but good fallback
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace /> // Unauthorized roles go back to Dashboard
  }

  return children
}

export default ProtectedRoute