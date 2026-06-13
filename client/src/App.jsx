import React, { useState, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Navbar from "./components/Layout/Navbar";
import Sidebar from "./components/Layout/Sidebar";
import Login from "./components/Auth/Login";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import ErrorBoundary from "./components/Common/ErrorBoundary";

// Lazy-loaded route components — each becomes its own JS chunk
const Dashboard = lazy(() => import("./components/Dashboard/Dashboard"));
const StudentManagement = lazy(() => import("./components/Students/StudentManagement"));
const TeacherManagement = lazy(() => import("./components/Teachers/TeacherManagement"));
const TeacherGrades = lazy(() => import("./components/Teachers/TeacherGrades"));
const CourseManagement = lazy(() => import("./components/Courses/CourseManagement"));
const GradeReport = lazy(() => import("./components/Students/GradeReport"));
const Reports = lazy(() => import("./components/Reports/Reports"));
const Schedule = lazy(() => import("./components/Schedule/Schedule"));
const AssignmentManagement = lazy(() => import("./components/Assignments/AssignmentManagement"));
const Settings = lazy(() => import("./components/Settings/Settings"));

// Simple full-screen loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
    </div>
  </div>
);

function AppContent() {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSidebarToggle = (isCollapsed) => {
    setIsSidebarCollapsed(isCollapsed);
  };

  // Calculate main content margin based on sidebar state
  const getMainContentMargin = () => {
    if (isMobileMenuOpen) {
      return "lg:ml-0"; // Mobile sidebar overlay doesn't push content
    }
    return isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64";
  };

  // Calculate sidebar width for navbar positioning - FIXED FOR MOBILE
  const getSidebarWidth = () => {
    // On mobile, navbar should always span full width
    if (window.innerWidth < 1024) {
      return "0px";
    }

    if (isMobileMenuOpen) {
      return "0px"; // Mobile sidebar doesn't affect navbar position
    }

    return isSidebarCollapsed ? "80px" : "256px";
  };

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={closeMobileMenu}
        onSidebarToggle={handleSidebarToggle}
      />

      {/* Navbar - Now responsive to sidebar state */}
      <Navbar
        isSidebarOpen={isMobileMenuOpen}
        onMobileMenuToggle={toggleMobileMenu}
        sidebarWidth={getSidebarWidth()}
      />

      {/* Main Content */}
      <main
        className={`pt-14 transition-all duration-300 ${getMainContentMargin()}`}
      >
        <div className="p-4 lg:p-6">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/students"
                element={
                  <ProtectedRoute allowedRoles={["admin", "teacher"]}>
                    <StudentManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teachers"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <TeacherManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses"
                element={
                  <ProtectedRoute allowedRoles={["admin", "teacher", "student"]}>
                    <CourseManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/grade-report"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <GradeReport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={["admin", "teacher"]}>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher-grades"
                element={
                  <ProtectedRoute allowedRoles={["teacher"]}>
                    <TeacherGrades />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/schedule"
                element={
                  <ProtectedRoute>
                    <Schedule />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assignments"
                element={
                  <ProtectedRoute>
                    <AssignmentManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
