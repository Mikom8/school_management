import React from "react";

const SkeletonLoading = () => {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 w-full animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
        </div>
        <div className="hidden sm:block h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            </div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
        ))}
      </div>

      {/* Content Area Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
          <div className="hidden sm:block h-10 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
        </div>
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkeletonLoading;
