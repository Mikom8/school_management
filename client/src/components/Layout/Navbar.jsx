import React, { useState, useEffect } from "react";
import { LogOut, User, Menu, X, Search, Bell, Check } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Navbar = ({ isSidebarOpen, onMobileMenuToggle, sidebarWidth }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);

  // Fetch notifications
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get("/notifications?limit=10");
      setNotifications(response.data.data || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`/notifications/${notificationId}/read`);
      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`/notifications/${notificationId}`);
      // Remove from local state
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      // Update unread count if it was unread
      const notification = notifications.find(n => n._id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read to remove blue badge
    if (!notification.read) {
      await markAsRead(notification._id);
    }

    // Close dropdown
    setIsNotificationOpen(false);

    // Navigate based on notification type
    if (notification.type === "grade_assigned" || notification.type === "grade_updated") {
      navigate("/grade-report");
    }
  };

  const handleNotificationOpen = async () => {
    const wasOpen = isNotificationOpen;
    setIsNotificationOpen(!isNotificationOpen);

    // When opening dropdown with unread notifications
    if (!wasOpen && unreadCount > 0) {
      setUnreadCount(0); // Clear badge immediately for UX

      // Mark all notifications as read in the database (so reload works correctly)
      try {
        await axios.put("/notifications/read-all");
        // Don't update local state yet - keep blue dots visible
      } catch (error) {
        console.error("Error marking notifications as read:", error);
      }
    }

    // When closing dropdown, update local state to hide blue dots
    if (wasOpen) {
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotificationLoading(true);

      // Delete all notifications from the database
      const deletePromises = notifications.map(notif =>
        axios.delete(`/notifications/${notif._id}`).catch(err => console.error("Error deleting:", err))
      );
      await Promise.all(deletePromises);

      // Clear local state
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error clearing all notifications:", error);
    } finally {
      setNotificationLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notifTime) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return notifTime.toLocaleDateString();
  };

  return (
    <>
      <nav
        className="fixed top-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-40 transition-all duration-400"
        style={{
          left: sidebarWidth,
          right: 0,
        }}
      >
        <div className="flex items-center justify-between h-full px-4">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={onMobileMenuToggle}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden"
            >
              {isSidebarOpen ? (
                <X className="dark:text-white text-gray-600" size={20} />
              ) : (
                <Menu className="dark:text-white text-gray-600" size={20} />
              )}
            </button>

            {/* Logo - Mobile Only */}
            <div className="flex items-center lg:hidden">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                <img
                  src="New_Generation_University_College.png"
                  alt="Logo"
                  className="w-8 h-8"
                />
              </div>
              <span className="ml-2 text-sm font-play text-gray-900 dark:text-white">
                New Generation
              </span>
            </div>

            {/* Search Bar - Desktop Only */}
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students, courses, teachers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 lg:w-80 xl:w-96 pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={handleNotificationOpen}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                <Bell size={20} className="text-gray-600 dark:text-white" />
              </button>

              {/* Notification Dropdown */}
              {isNotificationOpen && (
                <div className="absolute top-12 -right-4 sm:right-0 w-[calc(100vw-2rem)] sm:w-80 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[calc(100vh-5rem)] sm:max-h-128 flex flex-col">
                  {/* Header */}
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Notifications
                    </h3>
                    {notifications.length > 1 && (
                      <button
                        onClick={markAllAsRead}
                        disabled={notificationLoading}
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1 disabled:opacity-50 cursor-pointer"
                      >
                        <Check size={14} />
                        <span>Clear all</span>
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <Bell size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification._id}
                          className="group p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {formatTime(notification.createdAt)}
                              </p>
                            </div>
                            <div className="flex items-center ml-2 space-x-2">
                              {!notification.read && (
                                <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-1"></span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification._id);
                                }}
                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                                title="Dismiss notification"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative flex items-center">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {user?.name?.charAt(0) || "U"}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user?.role}
                  </p>
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 top-12 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user?.email || `${user?.role}@school.edu`}
                    </p>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-700 pt-1">
                    <button
                      onClick={logout}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut size={16} className="mr-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Close dropdowns when clicking outside */}
        {(isProfileOpen || isNotificationOpen) && (
          <div
            className="fixed inset-0 z-30"
            onClick={() => {
              setIsProfileOpen(false);
              setIsNotificationOpen(false);
            }}
          />
        )}
      </nav>
    </>
  );
};

export default Navbar;
