import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCog,
  BookOpen,
  Calendar,
  FileText,
  Settings,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  School,
  BarChart3,
  ChevronDown,
  ChevronUp,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import axios from "axios";

const Sidebar = ({ isMobileOpen, onMobileClose, onSidebarToggle }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    courses: 0,
    departments: 0,
    attendance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  const menuItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      roles: ["admin", "teacher", "student"],
    },
    {
      name: "Students",
      href: "/students",
      icon: Users,
      roles: ["admin", "teacher"],
    },
    {
      name: "Teachers",
      href: "/teachers",
      icon: UserCog,
      roles: ["admin"],
    },
    {
      name: "Grade Management",
      href: "/teacher-grades",
      icon: BookOpen,
      roles: ["teacher"],
    },
    {
      name: "Courses",
      href: "/courses",
      icon: School,
      roles: ["admin", "teacher", "student"],
    },
    {
      name: "Schedule",
      href: "/schedule",
      icon: Calendar,
      roles: ["admin", "teacher", "student"],
    },
    {
      name: "Reports",
      href: "/reports",
      icon: BarChart3,
      roles: ["admin", "teacher"],
    },
    {
      name: "Grade Report",
      href: "/grade-report",
      icon: GraduationCap,
      roles: ["student"],
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      roles: ["admin"],
    },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user?.role)
  );

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/dashboard");
        setStats(response.data);
      } catch (error) {
        console.error("Error fetching stats:", error);
        setStats({ students: 0, teachers: 0, courses: 0, departments: 0, attendance: 0 });
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === "admin") {
      fetchStats();
    }
  }, [user?.role]);

  const handleItemClick = () => {
    if (window.innerWidth < 1024) {
      onMobileClose();
    }
  };

  const handleCollapseToggle = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    if (onSidebarToggle) {
      onSidebarToggle(newCollapsedState);
    }
  };

  const toggleStatsDropdown = () => {
    setIsStatsOpen(!isStatsOpen);
  };

  const getMenuItemClasses = (isActive, itemName) => {
    const baseClasses =
      "flex items-center rounded-xl transition-all duration-300 group relative overflow-hidden";

    if (isCollapsed) {
      return `${baseClasses} justify-center p-3 mx-2 ${isActive
          ? "bg-linear-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25"
          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105"
        } ${hoveredItem === itemName
          ? "ring-2 ring-blue-200 dark:ring-blue-800"
          : ""
        }`;
    }

    return `${baseClasses} px-4 py-3 ${isActive
        ? "bg-linear-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25"
        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:translate-x-2"
      } ${hoveredItem === itemName ? "ring-2 ring-blue-200 dark:ring-blue-800" : ""
      }`;
  };

  const sidebarWidth = isCollapsed ? "w-21" : "w-64";

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 backdrop-blur-sm"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container */}
      <div
        className={`fixed inset-y-0 left-0 z-40 bg-linear-to-b from-white to-gray-50/80 dark:from-gray-900 dark:to-gray-800/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 transform transition-all duration-500 ease-out overflow-y-auto ${sidebarWidth}
          ${isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
          }
          shadow-xl dark:shadow-2xl
        `}
        style={{ height: "100vh", top: "0" }}
      >
        {/* Sidebar Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
          {!isCollapsed && (
            <a className="flex items-center space-x-3 select-none" href="/">
              <div className="w-8 h-8 rounded-xl  flex items-center justify-center shadow-lg">
                <img src="New_Generation_University_College.png" alt="" srcSet="" />
              </div>
              <div>
                <h1 className="text-sm font-play text-gray-900 dark:text-white">
                  New Generation
                </h1>
                <p className="text-xs font-saira text-gray-500 dark:text-gray-400">
                  University Collage
                </p>
              </div>
            </a>
          )}

          {/* Modern Collapse Toggle */}
          <button
            onClick={handleCollapseToggle}
            className={`hidden md:block p-2 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-110 transition-all duration-300 shadow-sm cursor-pointer ${isCollapsed ? "mx-auto" : ""
              }`}
          >
            {isCollapsed ? (
              <ChevronRight size={18} className="text-blue-500" />
            ) : (
              <ChevronLeft size={18} className="text-blue-500" />
            )}
          </button>
        </div>

        {/* Navigation Menu - Using your exact hover effects */}
        <nav className="p-6 px-3 space-y-2 flex-1 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={handleItemClick}
                className={getMenuItemClasses(isActive)}
                title={isCollapsed ? item.name : ""}
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Icon
                  size={20}
                  className={`mr-3 shrink-0 transition-transform group-hover:scale-110 ${isCollapsed ? "ml-2" : ""
                    }`}
                />

                {!isCollapsed && (
                  <>
                    <span className="font-medium">{item.name}</span>
                    {isActive && (
                      <ChevronRight size={16} className="ml-auto opacity-70" />
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Stats Section - Using your exact dropdown style */}
        {!isCollapsed && user?.role === "admin" && (
          <div className="p-4 mt-auto border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl shadow-inner mb-4">
              {/* Dropdown Header */}
              <button
                onClick={toggleStatsDropdown}
                className={`flex items-center justify-between w-full text-left transition-colors text-gray-700 dark:text-gray-300 ${isStatsOpen ? "mb-2" : ""
                  } cursor-pointer`}
              >
                <div className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Quick Stats
                </div>
                {isStatsOpen ? (
                  <ChevronUp size={16} className="text-blue-500" />
                ) : (
                  <ChevronDown size={16} className="text-blue-500" />
                )}
              </button>

              {/* Dropdown Content */}
              <div
                className={`transition-all duration-300 ease-in-out ${isStatsOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
                  } overflow-hidden`}
              >
                <div className="space-y-3 pt-1">
                  {[
                    { label: "Students", key: "students" },
                    { label: "Faculty", key: "teachers" },
                    { label: "Department", key: "departments" },
                  ].map(({ label, key }) => (
                    <div
                      key={key}
                      className="flex justify-between items-center text-sm p-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm"
                    >
                      <span className="text-gray-500 dark:text-gray-400">
                        {label}
                      </span>
                      <span className="font-extrabold text-blue-600 dark:text-blue-400">
                        {loading ? (
                          <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-4 w-10 rounded"></div>
                        ) : (
                          stats[key]?.toLocaleString() || "0"
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Student-specific info */}
            {user?.role === "student" && (
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl shadow-inner mb-4">
                <div className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 border-b pb-2 border-gray-200 dark:border-gray-700">
                  My Info
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Year Group
                    </span>
                    <span className="font-semibold text-blue-700 dark:text-blue-300">
                      {user.grade || "2nd Year"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Enrollment
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400 py-0.5 px-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Teacher-specific info */}
            {user?.role === "teacher" && (
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl shadow-inner mb-4">
                <div className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 border-b pb-2 border-gray-200 dark:border-gray-700">
                  My Info
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Department
                    </span>
                    <span className="font-semibold text-blue-700 dark:text-blue-300">
                      {user.course || "Computer Science"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Enrollment
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400 py-0.5 px-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Current User Info & Logout */}
            <div className="w-full">
              <div className="flex items-center justify-between space-x-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl transition-shadow shadow-sm hover:shadow-md">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shrink-0 text-white">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                  <div className="min-w-0 flex-1 ml-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {user?.name || "User Name"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
                      {user?.role || "guest"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="p-2 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition-colors shrink-0 cursor-pointer"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tooltip for collapsed state */}
        {isCollapsed && hoveredItem && (
          <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-50 animate-in fade-in duration-200">
            {hoveredItem}
            <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-8 border-transparent border-r-gray-900"></div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
