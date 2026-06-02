import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Mail,
  Edit,
  Trash2,
  UserCog,
  Save,
  X,
  BookOpen,
  Check,
  AlertCircle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Loader,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import SkeletonLoading from "../Common/SkeletonLoading";
import Toast from "../Common/Toast";

// Custom Popup Component
const CustomPopup = ({
  type,
  title,
  message,
  onConfirm,
  onCancel,
  show,
  children,
}) => {
  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case "error":
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
      case "info":
        return <Info className="w-6 h-6 text-blue-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case "success":
        return "bg-green-600 hover:bg-green-700";
      case "error":
        return "bg-red-600 hover:bg-red-700";
      case "warning":
        return "bg-yellow-600 hover:bg-yellow-700";
      case "info":
        return "bg-blue-600 hover:bg-blue-700";
      default:
        return "bg-blue-600 hover:bg-blue-700";
    }
  };

  return (
    <div className="fixed inset-0 top-0 left-0 w-full h-screen bg-black/80 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg max-w-md w-full mx-auto">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            {getIcon()}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>

          {message && (
            <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
          )}

          {children}

          <div className="flex justify-end space-x-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors cursor-pointer ${getButtonColor()}`}
            >
              {type === "warning" ? "Confirm" : "OK"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const TeacherManagement = () => {
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [expandedDepartments, setExpandedDepartments] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDepartmentExpansion = (deptId) => {
    setExpandedDepartments((prev) => ({
      ...prev,
      [deptId]: !prev[deptId],
    }));
  };
  const [deletingId, setDeletingId] = useState(null);
  const { user } = useAuth();

  // Toast states
  const [toast, setToast] = useState({
    show: false,
    message: "",
  });

  // Popup states (for confirmations only)
  const [popup, setPopup] = useState({
    show: false,
    type: "info",
    title: "",
    message: "",
    onConfirm: null,
    onCancel: null,
  });

  // Add Teacher Form State
  const [newTeacher, setNewTeacher] = useState({
    name: "",
    email: "",
    password: "",
    assignedCourses: [],
  });

  useEffect(() => {
    fetchTeachers();
    fetchCourses();
  }, []);

  const showToast = (message) => {
    setToast({
      show: true,
      message,
    });
  };

  const showPopup = (
    type,
    title,
    message,
    onConfirm = null,
    onCancel = null,
  ) => {
    // For success messages, use toast instead
    if (type === "success") {
      showToast(message);
      if (onConfirm) {
        onConfirm();
      }
      return;
    }

    setPopup({
      show: true,
      type,
      title,
      message,
      onConfirm:
        onConfirm || (() => setPopup((prev) => ({ ...prev, show: false }))),
      onCancel:
        onCancel || (() => setPopup((prev) => ({ ...prev, show: false }))),
    });
  };

  // Get API base URL
  const getApiUrl = (endpoint) => {
    return `http://localhost:5000/api${endpoint}`;
  };

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  };

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await axios.get(getApiUrl("/teachers"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // API now returns { success, data, pagination } — extract the array
      const teacherArray = response.data?.data || response.data || [];
      setTeachers(Array.isArray(teacherArray) ? teacherArray : []);
    } catch (error) {
      // Fallback to sample data if API fails
      setTeachers([
        {
          _id: "1",
          name: "Dr. Sarah Wilson",
          email: "sarah@university.edu",
          role: "teacher",
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          _id: "2",
          name: "Prof. James Brown",
          email: "james@university.edu",
          role: "teacher",
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ]);
      showPopup(
        "error",
        "Error",
        "Failed to fetch teachers. Using sample data.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get(getApiUrl("/courses"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // API now returns { success, data, pagination } — extract the array
      const courseArray = response.data?.data || response.data || [];
      setCourses(Array.isArray(courseArray) ? courseArray : []);
    } catch (error) {
      // Fallback to sample data
      const sampleCourses = [
        {
          _id: "1",
          name: "Computer Science",
          code: "CS01",
          description: "Introduction to Programming",
          credits: 4,
          teacher: null,
          teacherName: null,
          schedule: {
            days: ["Monday", "Wednesday", "Friday"],
            startTime: "09:00",
            endTime: "10:30",
            room: "CS Building 101",
          },
          maxStudents: 40,
          department: {
            _id: "dept_cs",
            name: "Computer Science"
          }
        },
      ];
      setCourses(sampleCourses);
      showPopup(
        "error",
        "Error",
        "Failed to fetch courses. Using sample data.",
      );
    }
  };

  // Safe filtering
  const filteredTeachers = (teachers || []).filter(
    (teacher) =>
      teacher.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleDeleteTeacher = async (teacher) => {
    showPopup(
      "warning",
      "Delete Teacher",
      `Are you sure you want to delete ${teacher.name}? This will also remove them from all assigned courses.`,
      async () => {
        setDeletingId(teacher._id);
        try {
          const token = getAuthToken();

          // First, remove this teacher from all courses they teach
          const teacherCourses = courses.filter(
            (course) => course.teacher === teacher._id || course.teacher?._id === teacher._id,
          );

          for (const course of teacherCourses) {
            await axios.put(
              getApiUrl(`/courses/${course._id}`),
              {
                teacher: null,
              },
              {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              },
            );
          }

          // Then delete the teacher
          await axios.delete(getApiUrl(`/teachers/${teacher._id}`), {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          fetchTeachers();
          fetchCourses(); // Refresh courses to update assignments
          showToast("Teacher deleted successfully!");
        } catch (error) {
          console.error("Error deleting teacher:", error);
          showPopup("error", "Error", "Failed to delete teacher");
        } finally {
          setDeletingId(null);
        }
      },
    );
  };

  // Edit Teacher
  const handleEditTeacher = (teacher) => {
    const assignedCourses = [];
    courses.forEach((course) => {
      if (course.teacher === teacher._id || course.teacher?._id === teacher._id) {
        assignedCourses.push(course._id);
      }
    });

    setEditingTeacher({
      ...teacher,
      assignedCourses: assignedCourses,
    });
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();

    if (!editingTeacher.name || !editingTeacher.email) {
      showPopup(
        "warning",
        "Validation Error",
        "Please fill all required fields",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      // First update the teacher's basic info
      await axios.put(
        getApiUrl(`/teachers/${editingTeacher._id}`),
        {
          name: editingTeacher.name,
          email: editingTeacher.email,
          isActive: editingTeacher.isActive,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      // Update course assignments
      for (const course of courses) {
        const shouldBeAssigned = editingTeacher.assignedCourses.includes(course._id);
        const isCurrentlyAssigned = course.teacher === editingTeacher._id || course.teacher?._id === editingTeacher._id;

        if (shouldBeAssigned && !isCurrentlyAssigned) {
          await axios.put(
            getApiUrl(`/courses/${course._id}`),
            { teacher: editingTeacher._id },
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          );
        } else if (!shouldBeAssigned && isCurrentlyAssigned) {
          await axios.put(
            getApiUrl(`/courses/${course._id}`),
            { teacher: null },
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          );
        }
      }

      setEditingTeacher(null);
      fetchTeachers();
      fetchCourses(); // Refresh courses to get updated teacher assignments
      showToast("Teacher updated successfully!");
    } catch (error) {
      console.error("Error updating teacher:", error);
      showPopup("error", "Error", "Failed to update teacher");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();

    if (!newTeacher.name || !newTeacher.email || !newTeacher.password) {
      showPopup(
        "warning",
        "Validation Error",
        "Please fill all required fields",
      );
      return;
    }

    if (newTeacher.password.length < 6) {
      showPopup(
        "warning",
        "Validation Error",
        "Password must be at least 6 characters long",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      // Create teacher first
      const teacherResponse = await axios.post(
        getApiUrl("/teachers"),
        {
          name: newTeacher.name,
          email: newTeacher.email,
          password: newTeacher.password,
          role: "teacher",
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      const newTeacherId = teacherResponse.data._id;

      // Update courses to set the teacher reference
      for (const course of courses) {
        if (newTeacher.assignedCourses.includes(course._id)) {
          await axios.put(
            getApiUrl(`/courses/${course._id}`),
            { teacher: newTeacherId },
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          );
        }
      }

      setShowAddForm(false);
      setNewTeacher({
        name: "",
        email: "",
        password: "",
        assignedCourses: [],
      });
      fetchTeachers();
      fetchCourses(); // Refresh courses
      showToast("Teacher added successfully!");
    } catch (error) {
      console.error("Error adding teacher:", error);
      showPopup("error", "Error", "Failed to add teacher");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTeacher((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingTeacher((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Course assignment functions
  const toggleCourseAssignment = (courseId, isForNewTeacher = false) => {
    if (isForNewTeacher) {
      setNewTeacher((prev) => {
        const assignedCourses = prev.assignedCourses || [];
        const isAssigned = assignedCourses.includes(courseId);
        return {
          ...prev,
          assignedCourses: isAssigned
            ? assignedCourses.filter((id) => id !== courseId)
            : [...assignedCourses, courseId],
        };
      });
    } else {
      setEditingTeacher((prev) => {
        const assignedCourses = prev.assignedCourses || [];
        const isAssigned = assignedCourses.includes(courseId);
        return {
          ...prev,
          assignedCourses: isAssigned
            ? assignedCourses.filter((id) => id !== courseId)
            : [...assignedCourses, courseId],
        };
      });
    }
  };

  // Get teaching courses for display
  const getTeachingCoursesForTeacher = (teacher) => {
    return courses.filter((course) => course.teacher === teacher._id || course.teacher?._id === teacher._id);
  };

  if (loading) {
    return <SkeletonLoading />;
  }

  return (
    <div className="space-y-6 font-saira">
      {/* Toast Notification */}
      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: "" })}
      />

      {/* Custom Popup (for warnings/errors) */}
      <CustomPopup
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onConfirm={popup.onConfirm}
        onCancel={popup.onCancel}
        show={popup.show}
      />

      {/* Add Teacher Modal */}
      {showAddForm && (
        <div className="fixed inset-0 top-0 left-0 w-full h-screen bg-black/80 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border dark:bg-gray-800 dark:border-gray-400 border-blue-500 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Add New Teacher
                </h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddTeacher} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={newTeacher.name}
                      onChange={handleInputChange}
                      className="input w-full"
                      placeholder="Enter teacher's full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={newTeacher.email}
                      onChange={handleInputChange}
                      className="input w-full"
                      placeholder="Enter teacher's email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={newTeacher.password}
                    onChange={handleInputChange}
                    className="input w-full"
                    placeholder="Enter temporary password"
                  />
                </div>

                {/* Course Assignment Section */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    Assign Courses
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Select the courses this teacher will teach
                  </p>

                  {courses.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No courses available. Please create courses first.
                    </p>
                  ) : (
                    <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                      {Object.values(
                        courses.reduce((acc, mainCourse) => {
                          const deptId = mainCourse.department?._id || "unassigned";
                          const deptName = mainCourse.department?.name || "Unassigned Courses";
                          if (!acc[deptId]) {
                            acc[deptId] = { id: deptId, name: deptName, courses: [] };
                          }
                          acc[deptId].courses.push(mainCourse);
                          return acc;
                        }, {})
                      ).map((dept) => (
                        <div key={dept.id} className="space-y-3">
                          <div
                            className="flex items-center justify-between cursor-pointer border-b border-gray-200 dark:border-gray-700 pb-1 sticky top-0 bg-white dark:bg-gray-800 z-10"
                            onClick={() => toggleDepartmentExpansion(dept.id)}
                          >
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                              {dept.name}
                            </h4>
                            <button
                              type="button"
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              {expandedDepartments[dept.id] ? (
                                <ChevronDown size={18} />
                              ) : (
                                <ChevronRight size={18} />
                              )}
                            </button>
                          </div>
                          {expandedDepartments[dept.id] && (
                            <div className="space-y-2">
                              {dept.courses.map((course) => {
                                const isAssigned = newTeacher.assignedCourses.includes(course._id);
                                const isAssignedToOther = course.teacher !== null && course.teacher !== undefined;

                                return (
                                  <div
                                    key={course._id}
                                    className={`border rounded-lg transition-colors ${
                                      isAssignedToOther
                                        ? "border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10 opacity-70"
                                        : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    }`}
                                  >
                                    <div className="flex items-center space-x-3 p-3 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isAssigned || isAssignedToOther}
                                        disabled={isAssignedToOther}
                                        onChange={() => toggleCourseAssignment(course._id, true)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-55"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                          {course.name}
                                        </p>
                                        <p className={`text-xs truncate ${isAssignedToOther ? "text-red-500 font-semibold" : "text-gray-500 dark:text-gray-400"}`}>
                                          Assigned Teacher: {course.teacher?.name || "None"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    disabled={isSubmitting}
                    className="btn btn-secondary cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary cursor-pointer flex items-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        <span>Add Teacher</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {editingTeacher && (
        <div className="fixed inset-0 top-0 left-0 w-full h-screen bg-black/80 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-400 border-blue-500 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Edit Teacher
                </h2>
                <button
                  onClick={() => setEditingTeacher(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateTeacher} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={editingTeacher.name}
                      onChange={handleEditInputChange}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={editingTeacher.email}
                      onChange={handleEditInputChange}
                      className="input w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    name="isActive"
                    value={editingTeacher.isActive}
                    onChange={handleEditInputChange}
                    className="input w-full"
                  >
                    <option value={true}>Active</option>
                    <option value={false}>Inactive</option>
                  </select>
                </div>

                {/* Course Assignment Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Assigned Courses
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {editingTeacher.assignedCourses.length} courses assigned
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Select the courses this teacher will teach
                  </p>

                  {courses.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No courses available.
                    </p>
                  ) : (
                    <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                      {Object.values(
                        courses.reduce((acc, mainCourse) => {
                          const deptId = mainCourse.department?._id || "unassigned";
                          const deptName = mainCourse.department?.name || "Unassigned Courses";
                          if (!acc[deptId]) {
                            acc[deptId] = { id: deptId, name: deptName, courses: [] };
                          }
                          acc[deptId].courses.push(mainCourse);
                          return acc;
                        }, {})
                      ).map((dept) => (
                        <div key={dept.id} className="space-y-3">
                          <div
                            className="flex items-center justify-between cursor-pointer border-b border-gray-200 dark:border-gray-700 pb-1 sticky top-0 bg-white dark:bg-gray-800 z-10"
                            onClick={() => toggleDepartmentExpansion(dept.id)}
                          >
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                              {dept.name}
                            </h4>
                            <button
                              type="button"
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              {expandedDepartments[dept.id] ? (
                                <ChevronDown size={18} />
                              ) : (
                                <ChevronRight size={18} />
                              )}
                            </button>
                          </div>
                          {expandedDepartments[dept.id] && (
                            <div className="space-y-2">
                              {dept.courses.map((course) => {
                                const isAssigned = editingTeacher.assignedCourses.includes(course._id);
                                const isAssignedToOther =
                                  course.teacher !== null &&
                                  course.teacher !== undefined &&
                                  course.teacher !== editingTeacher._id &&
                                  course.teacher?._id !== editingTeacher._id;

                                return (
                                  <div
                                    key={course._id}
                                    className={`border rounded-lg transition-colors ${
                                      isAssignedToOther
                                        ? "border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10 opacity-70"
                                        : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    }`}
                                  >
                                    <div className="flex items-center space-x-3 p-3 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isAssigned || isAssignedToOther}
                                        disabled={isAssignedToOther}
                                        onChange={() => toggleCourseAssignment(course._id, false)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-55"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                          {course.name}
                                        </p>
                                        <p className={`text-xs truncate ${isAssignedToOther ? "text-red-500 font-semibold" : "text-gray-500 dark:text-gray-400"}`}>
                                          Assigned Teacher: {course.teacher?.name || "None"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingTeacher(null)}
                    disabled={isSubmitting}
                    className="btn btn-secondary cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary cursor-pointer flex items-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Save size={20} className="mr-2 inline" />
                        <span>Update Teacher</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Rest of the component remains the same */}
      {/* ... (Header, Search, Teacher Cards) ... */}

      {/* Responsive Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Teacher Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage teacher records and course assignments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full md:w-auto">
          <div className="input relative grow">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search teachers..."
              className="inpt pl-10 w-full placeholder:text-gray-400 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {user?.role === "admin" && (
            <button
              className="btn btn-primary sm:w-auto cursor-pointer"
              onClick={() => setShowAddForm(true)}
            >
              <Plus size={20} className="inline" />
              <span className="ml-2">Add Teacher</span>
            </button>
          )}
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTeachers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            <UserCog size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">No teachers found</p>
            <p className="text-sm mt-2">
              {teachers.length === 0
                ? "No teachers in the system yet."
                : "No teachers match your search criteria."}
            </p>
          </div>
        ) : (
          filteredTeachers.map((teacher) => {
            const teachingCourses = getTeachingCoursesForTeacher(teacher);

            return (
              <div
                key={teacher._id}
                className="card group hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">
                      {teacher.name}
                    </h3>
                    <p className="text-blue-600 dark:text-blue-400 font-medium">
                      Teacher
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${teacher.isActive
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                  >
                    {teacher.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Mail
                      size={16}
                      className="mr-2 shrink-0 text-green-400"
                    />
                    <span className="truncate">{teacher.email}</span>
                  </div>

                  {/* Currently Teaching Courses */}
                  <div className="text-sm">
                    <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                      <BookOpen
                        size={16}
                        className="mr-2 shrink-0 text-blue-400"
                      />
                      <span>
                        Teaching {teachingCourses.length} course(s)
                      </span>
                    </div>

                    {teachingCourses.length > 0 ? (
                      <div className="space-y-1 max-h-20 overflow-y-auto">
                        {teachingCourses.slice(0, 3).map((course) => (
                          <div
                            key={course._id}
                            className="flex items-center text-xs"
                          >
                            <Check
                              size={12}
                              className="mr-1 text-green-500 shrink-0"
                            />
                            <span className="text-gray-500 dark:text-gray-400 truncate">
                              {course.name}
                            </span>
                          </div>
                        ))}
                        {teachingCourses.length > 3 && (
                          <div className="text-xs text-gray-400 italic">
                            +{teachingCourses.length - 3} more courses
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 italic">
                        No courses assigned yet
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Member since:
                    <span className="font-medium">
                      {new Date(teacher.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {user?.role === "admin" && (
                  <div className="flex justify-start space-x-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium cursor-pointer"
                      onClick={() => handleEditTeacher(teacher)}
                    >
                      <Edit size={16} />
                      <span>Edit</span>
                    </button>
                    <button
                      className="flex items-center space-x-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => handleDeleteTeacher(teacher)}
                      disabled={deletingId === teacher._id}
                    >
                      {deletingId === teacher._id ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      <span>Remove</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TeacherManagement;
