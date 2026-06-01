import React, { useState } from "react";
import { GraduationCap, Eye, EyeOff, Loader } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await login(formData.email, formData.password);

    if (!result.success) {
      setError(result.message);
    }

    setIsLoading(false);
  };

  const demoAccounts = [
    { role: "Admin", email: "admin@school.com", password: "password" },
    { role: "Teacher", email: "teacher@school.com", password: "password" },
    { role: "Student", email: "student@school.com", password: "password" },
  ];

  const fillDemoCredentials = (email, password) => {
    setFormData({ email, password });
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
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="Enter your email"
              />
            </div>

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
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
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
                <span>Sign In</span>
              )}
            </button>
          </div>
        </form>

        {/* Demo Accounts */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Demo Accounts
          </h3>
          <div className="space-y-2">
            {demoAccounts.map((account, index) => (
              <button
                key={index}
                onClick={() =>
                  fillDemoCredentials(account.email, account.password)
                }
                className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
