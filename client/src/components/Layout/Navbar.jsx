import React, { useState } from "react";
import { LogOut, User, Menu, X, Search, Bell } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const Navbar = ({ isSidebarOpen, onMobileMenuToggle, sidebarWidth }) => {
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
            {/* Profile Dropdown */}
            <div className="relative flex gap-3 items-center">
              <div className="hover:bg-gray-600 p-3 rounded-full">
                <Bell size={24} className="dark:text-white" />
              </div>
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

        {/* Close dropdown when clicking outside */}
        {isProfileOpen && (
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsProfileOpen(false)}
          />
        )}
      </nav>
    </>
  );
};

export default Navbar;
