import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { User, Bell, Shield, Moon, Sun, Save, CheckCircle, Lock, Eye, EyeOff, X } from "lucide-react";
import axios from "axios";
import Toast from "../Common/Toast";

const Settings = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    activityAlerts: true,
    gradeUpdates: true,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const handleToggle = (key) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError(""); // Clear previous errors

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setPasswordLoading(true);
    try {
      await axios.put("/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setToast({ show: true, message: "Password changed successfully", type: "success" });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordModal(false);
      setPasswordError("");
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to change password";
      setPasswordError(errorMessage);
    } finally {
      setPasswordLoading(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setShowPasswords({ current: false, new: false, confirm: false });
    setPasswordError(""); // Clear errors when closing
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // Simplified view for Teachers and Students
  if (user?.role === "teacher" || user?.role === "student") {
    return (
      <>
        <Toast
          message={toast.message}
          show={toast.show}
          onClose={() => setToast({ show: false, message: "", type: "success" })}
        />

        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage your account settings
            </p>
          </div>

          {/* Profile Section */}
          <div className="card shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <User size={20} className="text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                <p className="font-medium text-gray-900 dark:text-white">{user?.name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                <p className="font-medium text-gray-900 dark:text-white">{user?.email || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 capitalize">
                  {user?.role || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Change Password Option */}
          <div className="card shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <Lock size={24} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Change Password
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Update your account password
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="btn btn-primary flex items-center space-x-2 cursor-pointer"
              >
                <Lock size={16} />
                <span>Change Password</span>
              </button>
            </div>
          </div>
        </div>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onMouseDown={closePasswordModal}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Lock size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Change Password
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handlePasswordChange} className="p-6 space-y-5">
                {/* Error Message */}
                {passwordError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-start space-x-2">
                    <Shield size={18} className="mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{passwordError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="input pr-10"
                      placeholder="Enter your current password"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("current")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="input pr-10"
                      placeholder="Enter new password (min. 6 characters)"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("new")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="input pr-10"
                      placeholder="Re-enter your new password"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("confirm")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={closePasswordModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className={`btn btn-primary flex items-center space-x-2 ${passwordLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {passwordLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Shield size={16} />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  // Full settings view for Admins
  return (
    <>
      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: "", type: "success" })}
      />

      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your account preferences
          </p>
        </div>

        {/* Profile Section */}
        <div className="card shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <User size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
              <p className="font-medium text-gray-900 dark:text-white">{user?.name || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
              <p className="font-medium text-gray-900 dark:text-white">{user?.email || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 capitalize">
                {user?.role || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="card shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            {theme === "dark" ? (
              <Moon size={20} className="text-purple-500" />
            ) : (
              <Sun size={20} className="text-yellow-500" />
            )}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Currently using {theme === "dark" ? "dark" : "light"} theme
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${theme === "dark" ? "bg-blue-600" : "bg-gray-300"
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === "dark" ? "translate-x-6" : "translate-x-1"
                  }`}
              />
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="card shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <Bell size={20} className="text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
          </div>
          <div className="space-y-4">
            {[
              { key: "emailNotifications", label: "Email Notifications", desc: "Receive important updates via email" },
              { key: "activityAlerts", label: "Activity Alerts", desc: "Get notified about recent activity" },
              { key: "gradeUpdates", label: "Grade Updates", desc: "Be alerted when grades are posted" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
                <button
                  onClick={() => handleToggle(key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${prefs[key] ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prefs[key] ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Change Password Option for Admin */}
        <div className="card shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <Lock size={24} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Change Password
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Update your account password
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="btn btn-primary flex items-center space-x-2 cursor-pointer"
            >
              <Lock size={16} />
              <span>Change Password</span>
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onMouseDown={closePasswordModal}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Lock size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Change Password
                </h2>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handlePasswordChange} className="p-6 space-y-5">
              {/* Error Message */}
              {passwordError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-start space-x-2">
                  <Shield size={18} className="mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{passwordError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="input pr-10"
                    placeholder="Enter your current password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("current")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="input pr-10"
                    placeholder="Enter new password (min. 6 characters)"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("new")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="input pr-10"
                    placeholder="Re-enter your new password"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("confirm")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className={`btn btn-primary flex items-center space-x-2 ${passwordLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {passwordLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;
