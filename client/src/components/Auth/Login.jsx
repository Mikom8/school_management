import React, { useState } from "react";
import { Eye, EyeOff, Loader, Mail, GraduationCap } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const Login = () => {
  const [loginType, setLoginType] = useState("email"); // "email" | "collegeId"
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleTabChange = (type) => {
    setLoginType(type);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await login(
      formData.identifier.trim(),
      formData.password,
      loginType
    );

    if (!result.success) {
      setError(result.message);
    }

    setIsLoading(false);
  };

  const demoAccounts = [
    { role: "Superadmin", email: "superadmin@gmial.com", password: "superadmin" },
    { role: "Admin", email: "admin@school.com", password: "password" }
  ];

  const fillDemoCredentials = (email, password) => {
    setLoginType("email");
    setFormData({ identifier: email, password });
    setError("");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-saira">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center">
              <img
                src="New_Generation_University_College.png"
                alt="New Generation"
              />
            </div>
            <div>
              <h1 className="text-md font-bold text-gray-900 dark:text-white font-play">
                New Generation
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                School Management System
              </p>
            </div>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Welcome back! Please enter your details.
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6 card" onSubmit={handleSubmit}>
          {/* Method Selector Tabs */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => handleTabChange("email")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                loginType === "email"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Mail size={16} />
              <span>Email</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("collegeId")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                loginType === "collegeId"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <GraduationCap size={16} />
              <span>College ID</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {loginType === "email" ? (
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Email Address
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type="email"
                  required
                  value={formData.identifier}
                  onChange={handleChange}
                  className="input"
                  placeholder="Enter your email (e.g. name@school.com)"
                />
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label
                    htmlFor="identifier"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    College ID
                  </label>
                  <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                    Students Only
                  </span>
                </div>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  required
                  value={formData.identifier}
                  onChange={handleChange}
                  className="input"
                  placeholder="Enter College ID"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} className="text-gray-400" />
                  ) : (
                    <Eye size={20} className="text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary flex items-center justify-center space-x-2 py-3 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>
                  {loginType === "collegeId"
                    ? "Sign In with College ID"
                    : "Sign In"}
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Demo Accounts */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Accounts
          </h3>
          <div className="space-y-2">
            {demoAccounts.map((account, index) => (
              <button
                key={index}
                onClick={() =>
                  fillDemoCredentials(account.email, account.password)
                }
                className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {account.role}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {account.email} / {account.password}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
