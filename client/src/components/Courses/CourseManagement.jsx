import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Users,
  Clock,
  BookOpen,
  Edit,
  Trash2,
  Loader,
  X,
  Save,
  MapPin,
  AlertCircle,
  CheckCircle,
  Info,
  User,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import SkeletonLoading from "../Common/SkeletonLoading";

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { user } = useAuth();
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    credits: 3,
    schedule: {
      days: [],
      startTime: "",
      endTime: "",
      room: "",
    },
    department: null,
    year: "",
    semester: "",
  });

  // Custom notification popup
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 4000);
  };

  // Custom confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: () => {},
    onCancel: () => {},
  });

  // Department modal state
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptForm, setDeptForm] = useState({
    name: "",
    code: "",
    description: "",
  });
  const [deptSubmitting, setDeptSubmitting] = useState(false);

  // Show confirmation dialog
  const showConfirmDialog = (
    title,
    message,
    onConfirm,
    onCancel = () => {},
  ) => {
    setConfirmDialog({
      show: true,
      title,
      message,
      onConfirm,
      onCancel,
    });
  };

  // Generate unique course code with suffix
  const generateCourseCode = (courseName, existingCourses) => {
    if (!courseName) return "";

    const prefix = courseName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("")
      .substring(0, 3);

    // Count how many courses already have this main course name
    const sameMainCourseCount = existingCourses.filter(
      (course) => course.name === courseName,
    ).length;

    // Use base code + incrementing suffix to ensure uniqueness
    const baseCode = `${prefix}01`;

    // If no courses with this name yet, use base code
    if (sameMainCourseCount === 0) {
      return baseCode;
    }

    // Add suffix to make it unique for database
    const suffix = String(sameMainCourseCount + 1).padStart(2, "0");
    return `${baseCode}-${suffix}`;
  };

  // Sample course data
  const sampleCourses = [
    {
      _id: "1",
      name: "Computer Science",
      code: "CS01",
      description: "cyber Security",
      credits: 50,
      schedule: {
        days: ["Tuesday"],
        startTime: "04:00",
        endTime: "06:00",
        room: "49",
      },
      maxStudents: 50,
      enrolledStudents: [],
      currentEnrollment: 0,
      teacher: {
        _id: "teacher_id_1",
        name: "Mikael Melese",
        email: "fsmikotechpaypal22@gmail.com",
      },
    },
  ];

  // Sample teachers data
  const sampleTeachers = [
    { _id: "t1", name: "Dr. Sarah Wilson", email: "sarah@university.edu" },
    { _id: "t2", name: "Prof. James Brown", email: "james@university.edu" },
  ];

  // Simple API URL helper
  const getApiUrl = (endpoint) => {
    return `http://localhost:5000/api${endpoint}`;
  };

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  };

  // Fetch courses and teachers from backend
  useEffect(() => {
    fetchCourses();
    fetchDepartments();
    // Only admin/teacher can fetch the full students list
    if (user?.role !== "student") {
      fetchTeachers();
      fetchStudents();
    }
  }, [user?.role, user?._id]);

  const fetchDepartments = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setDepartments([]);
        return;
      }

      const response = await fetch(getApiUrl("/courses/departments"), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const json = await response.json();
        setDepartments(json.data || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      setDepartments([]);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError("");
      const token = getAuthToken();

      if (!token) {
        setCourses(sampleCourses);
        setLoading(false);
        return;
      }

      // Students see their enrolled courses, teachers see their assigned courses, admins see all
      let endpoint = "/courses";
      if (user?.role === "student") {
        endpoint = "/courses/my-courses";
      } else if (user?.role === "teacher") {
        endpoint = "/courses/teacher-courses";
      }

      const response = await fetch(getApiUrl(endpoint), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const json = await response.json();
        // Both endpoints return { success, data } — extract the array
        const courseArray = json.data || json;
        setCourses(Array.isArray(courseArray) ? courseArray : []);
      } else {
        // If student/teacher has no courses yet, show empty list
        setCourses(user?.role === "admin" ? sampleCourses : []);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      setCourses(user?.role === "admin" ? sampleCourses : []);
      if (user?.role === "admin") {
        setError("Using sample data - API connection failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setTeachers(sampleTeachers);
        return;
      }

      const response = await fetch(getApiUrl("/teachers"), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const json = await response.json();
        // API now returns { success, data, pagination } — extract the array
        const teacherArray = json.data || json;
        setTeachers(Array.isArray(teacherArray) ? teacherArray : []);
      } else {
        setTeachers(sampleTeachers);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
      setTeachers(sampleTeachers);
    }
  };

  // Fetch students from backend
  const fetchStudents = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        // Use sample students if no token
        setStudents([
          {
            _id: "1",
            user: { name: "John Doe" },
            studentId: "STU001",
            course: "Computer Science",
            grade: "1st Year Degree",
          },
          {
            _id: "2",
            user: { name: "Jane Smith" },
            studentId: "STU002",
            course: "Computer Science",
            grade: "2nd Year Degree",
          },
        ]);
        return;
      }

      const response = await fetch(getApiUrl("/students"), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.data || data || []);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      setStudents([]);
    }
  };

  // Get assigned teacher for a course
  const getAssignedTeacher = (course) => {
    // Handle both populated teacher object and teacher ID string
    if (course.teacher && typeof course.teacher === "object") {
      return course.teacher;
    } else if (course.teacher) {
      const teacher = teachers.find((t) => t._id === course.teacher);
      return teacher || null;
    }
    return null;
  };

  // Function to count students enrolled in a course
  const getStudentCountForCourse = (courseName) => {
    if (!students.length) return 0;

    return students.filter(
      (student) =>
        student.course &&
        student.course.toLowerCase() === courseName.toLowerCase(),
    ).length;
  };

  // Function to get students enrolled in a course
  const getStudentsForCourse = (courseName) => {
    if (!students.length) return [];

    return students.filter(
      (student) =>
        student.course &&
        student.course.toLowerCase() === courseName.toLowerCase(),
    );
  };

  const createCourse = async (courseData) => {
    try {
      const token = getAuthToken();

      const backendCourseData = {
        name: courseData.name,
        code: courseData.code,
        description: courseData.description,
        credits: courseData.credits,
        department: courseData.department,
        year: courseData.year,
        semester: courseData.semester,
        schedule: {
          days: courseData.schedule.days,
          startTime: courseData.schedule.startTime,
          endTime: courseData.schedule.endTime,
          room: courseData.schedule.room,
        },
      };

      if (!token) {
        const newCourse = {
          _id: Date.now().toString(),
          ...courseData,
          enrolledStudents: [],
          currentEnrollment: 0,
          teacher:
            user?.role === "teacher"
              ? { _id: user._id, name: user.name }
              : null,
        };
        setCourses((prev) => [...prev, newCourse]);
        setShowCreateModal(false);
        resetForm();
        showNotification("Course created successfully!", "success");
        return;
      }

      // Teachers use their own endpoint that auto-assigns them
      const endpoint =
        user?.role === "teacher" ? "/courses/teacher-create" : "/courses";

      const response = await fetch(getApiUrl(endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(backendCourseData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error response:", errorText);
        throw new Error(
          `Failed to create course: ${response.status} - ${errorText}`,
        );
      }

      const result = await response.json();
      const newCourse = result.data || result;
      setCourses((prev) => [...prev, newCourse]);
      setShowCreateModal(false);
      resetForm();
      showNotification("Course created successfully!", "success");
    } catch (error) {
      console.error("Error creating course:", error);
      showNotification(`Failed to create course: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCourse = async (id, courseData) => {
    try {
      const token = getAuthToken();
      const currentCourse = courses.find((course) => course._id === id);

      const backendCourseData = {
        name: courseData.name,
        code: courseData.code,
        description: courseData.description,
        credits: courseData.credits,
        department: courseData.department,
        year: courseData.year,
        semester: courseData.semester,
        schedule: {
          days: courseData.schedule.days,
          startTime: courseData.schedule.startTime,
          endTime: courseData.schedule.endTime,
          room: courseData.schedule.room,
        },
        teacher: currentCourse?.teacher || null,
      };

      if (!token) {
        setCourses((prev) =>
          prev.map((course) =>
            course._id === id
              ? {
                  ...course,
                  ...courseData,
                  teacher: course.teacher,
                }
              : course,
          ),
        );
        setEditingCourse(null);
        resetForm();
        showNotification("Course updated successfully!", "success");
        return;
      }

      const response = await fetch(getApiUrl(`/courses/${id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(backendCourseData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to update course: ${response.status} - ${errorText}`,
        );
      }

      const updatedCourse = await response.json();
      setCourses((prev) =>
        prev.map((course) => (course._id === id ? updatedCourse : course)),
      );
      setEditingCourse(null);
      resetForm();
      showNotification("Course updated successfully!", "success");
    } catch (error) {
      console.error("Error updating course:", error);
      showNotification(`Failed to update course: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCourse = async (id) => {
    const courseToDelete = courses.find((course) => course._id === id);

    showConfirmDialog(
      "Delete Course",
      `Are you sure you want to delete "${courseToDelete?.name} - ${courseToDelete?.description}"? This action cannot be undone.`,
      async () => {
        setDeletingId(id);
        try {
          const token = getAuthToken();
          if (!token) {
            setCourses((prev) => prev.filter((course) => course._id !== id));
            showNotification("Course deleted successfully!", "success");
            return;
          }

          const response = await fetch(getApiUrl(`/courses/${id}`), {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to delete course: ${response.status}`);
          }

          setCourses((prev) => prev.filter((course) => course._id !== id));
          showNotification("Course deleted successfully!", "success");
        } catch (error) {
          console.error("Error deleting course:", error);
          showNotification(
            `Failed to delete course: ${error.message}`,
            "error",
          );
        } finally {
          setDeletingId(null);
        }
      },
    );
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      credits: 3,
      schedule: {
        days: [],
        startTime: "",
        endTime: "",
        room: "",
      },
      department: null,
      year: "",
      semester: "",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.code || !formData.description) {
      showNotification("Please fill in all required fields", "error");
      return;
    }

    if (formData.schedule.days.length === 0) {
      showNotification(
        "Please select at least one day for the schedule",
        "error",
      );
      return;
    }

    if (!formData.department || !formData.year || !formData.semester) {
      showNotification("Please select department, year and semester", "error");
      return;
    }

    setIsSubmitting(true);
    if (editingCourse) {
      updateCourse(editingCourse._id, formData);
    } else {
      createCourse(formData);
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      code: course.code,
      description: course.description || "",
      credits: course.credits,
      schedule: course.schedule || {
        days: [],
        startTime: "",
        endTime: "",
        room: "",
      },
      department: course.department?._id || course.department || null,
      year: course.year || "",
      semester: course.semester || "",
    });
    setShowCreateModal(true);
  };

  const handleCreateNew = () => {
    setEditingCourse(null);
    resetForm();
    setShowCreateModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("schedule.")) {
      const scheduleField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          [scheduleField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === "credits" ? parseInt(value) : value,
      }));

      // Auto-generate course code when main course name changes
      if (name === "name" && !editingCourse) {
        const generatedCode = generateCourseCode(value, courses);
        setFormData((prev) => ({
          ...prev,
          code: generatedCode,
        }));
      }
    }
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        days: prev.schedule.days.includes(day)
          ? prev.schedule.days.filter((d) => d !== day)
          : [...prev.schedule.days, day],
      },
    }));
  };

  // Format schedule for display
  const formatSchedule = (course) => {
    if (
      !course.schedule ||
      !course.schedule.days ||
      course.schedule.days.length === 0
    ) {
      return "Schedule not set";
    }

    const { days, startTime, endTime, room } = course.schedule;
    const dayStr = days.join(", ");
    const timeStr =
      startTime && endTime ? `${startTime} - ${endTime}` : "Time not set";

    return `${dayStr} • ${timeStr}`;
  };

  // Filter courses based on search - ADDED THIS FUNCTION
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const dayOptions = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  if (loading) {
    return <SkeletonLoading />;
  }

  return (
    <div className="space-y-6 font-saira">
      {/* Notification Popup */}
      {notification.show && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-sm ${
            notification.type === "error"
              ? "bg-red-100 border-red-400 text-red-700"
              : "bg-green-100 border-green-400 text-green-700"
          } border px-4 py-3 rounded-lg shadow-lg flex items-start space-x-3 animate-in slide-in-from-right-full duration-500`}
        >
          {notification.type === "error" ? (
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
          ) : (
            <CheckCircle className="shrink-0 mt-0.5" size={20} />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
          <button
            onClick={() =>
              setNotification({ show: false, message: "", type: "" })
            }
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="shrink-0">
                <Info className="text-yellow-500" size={24} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Year
                  </label>
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className="input w-full"
                    required
                  >
                    <option value="">Select Year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="5th Year">5th Year</option>
                    <option value="Remedial">Remedial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Semester
                  </label>
                  <select
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    className="input w-full"
                    required
                  >
                    <option value="">Select Semester</option>
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                    <option value="Spring">Spring</option>
                    <option value="Fall">Fall</option>
                  </select>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {confirmDialog.title}
                </h3>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {confirmDialog.message}
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  confirmDialog.onCancel();
                  setConfirmDialog({
                    show: false,
                    title: "",
                    message: "",
                    onConfirm: () => {},
                    onCancel: () => {},
                  });
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog({
                    show: false,
                    title: "",
                    message: "",
                    onConfirm: () => {},
                    onCancel: () => {},
                  });
                }}
                className="btn btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Error Display */}
      {error && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <div className="flex items-center">
            <AlertCircle className="mr-2" size={20} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError("")}
            className="mt-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Course Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage courses and curriculum - {courses.length} courses available
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
              placeholder="Search courses..."
              className="inpt pl-10 w-full placeholder:text-gray-400 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {user?.role !== "student" && user?.role !== "teacher" && (
            <button
              onClick={handleCreateNew}
              className="btn btn-primary flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Plus size={20} />
              <span>Create Course</span>
            </button>
          )}
          {user?.role === "admin" && (
            <>
              <button
                onClick={() => setShowDeptModal(true)}
                className="btn btn-secondary flex items-center justify-center space-x-2"
              >
                <span>Create Department</span>
              </button>

              {showDeptModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Create Department
                      </h3>
                      <button
                        onClick={() => setShowDeptModal(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!deptForm.name.trim()) {
                          showNotification(
                            "Department name is required",
                            "error",
                          );
                          return;
                        }

                        setDeptSubmitting(true);
                        try {
                          const token = getAuthToken();
                          const res = await fetch(
                            getApiUrl("/courses/departments"),
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: token ? `Bearer ${token}` : "",
                              },
                              body: JSON.stringify(deptForm),
                            },
                          );

                          const text = await res.text();
                          let json;
                          try {
                            json = JSON.parse(text);
                          } catch (e) {
                            json = { message: text };
                          }

                          if (!res.ok) {
                            const msg =
                              json?.message ||
                              res.statusText ||
                              "Failed to create department";
                            throw new Error(msg);
                          }

                          // If server returned created dept id, preselect it for the course form
                          const newDeptId =
                            json?.data?._id || json?._id || null;
                          if (newDeptId) {
                            setFormData((prev) => ({
                              ...prev,
                              department: newDeptId,
                            }));
                          }

                          await fetchDepartments();
                          setShowDeptModal(false);
                          setDeptForm({ name: "", code: "", description: "" });
                          showNotification("Department created", "success");
                        } catch (err) {
                          console.error("Create department error:", err);
                          showNotification(
                            `Failed to create department: ${err.message}`,
                            "error",
                          );
                        } finally {
                          setDeptSubmitting(false);
                        }
                      }}
                    >
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Name *
                          </label>
                          <input
                            name="name"
                            value={deptForm.name}
                            onChange={(e) =>
                              setDeptForm((p) => ({
                                ...p,
                                name: e.target.value,
                              }))
                            }
                            className="input w-full"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Code
                          </label>
                          <input
                            name="code"
                            value={deptForm.code}
                            onChange={(e) =>
                              setDeptForm((p) => ({
                                ...p,
                                code: e.target.value,
                              }))
                            }
                            className="input w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                          </label>
                          <textarea
                            name="description"
                            value={deptForm.description}
                            onChange={(e) =>
                              setDeptForm((p) => ({
                                ...p,
                                description: e.target.value,
                              }))
                            }
                            className="input w-full"
                            rows={3}
                          />
                        </div>

                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowDeptModal(false)}
                            className="btn btn-secondary"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={deptSubmitting}
                          >
                            {deptSubmitting ? "Saving..." : "Create"}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* Courses Grid */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => {
          const assignedTeacher = getAssignedTeacher(course);
          const displayCode = course.code.split("-")[0];
          const studentCount = getStudentCountForCourse(course.name);

          return (
            <div
              key={course._id}
              className="card group hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
            >
              {/* Header with Course Info and Enrollment Count */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">
                    {course.name}
                  </h3>
                  <p className="text-primary-600 dark:text-primary-400 font-medium">
                    {displayCode}
                  </p>
                  {course.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {course.description}
                    </p>
                  )}
                </div>

                {/* Enrollment Count Badge - Right Side */}
                <div className="flex flex-col items-end space-y-2 ml-2 shrink-0">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                    {course.credits} credits
                  </span>

                  {user?.role === "admin" && (
                    <div className="inline-flex flex-col items-center px-3 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      <div className="flex items-center">
                        <Users size={12} className="mr-1" />
                        <span className="font-bold">
                          {studentCount} enrolled
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {/* Assigned Teacher Section */}
                <div className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                  <User size={16} className="mr-2 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-medium">Assigned Teacher: </span>
                    {assignedTeacher ? (
                      <div className="mt-1">
                        <div className="flex items-center text-xs bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                          <CheckCircle
                            size={12}
                            className="mr-1 text-green-500 shrink-0"
                          />
                          <span className="text-gray-700 dark:text-gray-300">
                            {assignedTeacher.name}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">
                        No teacher assigned
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Clock size={16} className="mr-2 shrink-0" />
                  <span className="flex-1">{formatSchedule(course)}</span>
                </div>

                {course.schedule?.room && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <MapPin size={16} className="mr-2 shrink-0" />
                    <span>Room: {course.schedule.room}</span>
                  </div>
                )}
              </div>

              {user?.role !== "student" &&
                (user?.role === "admin" ||
                  (user?.role === "teacher" &&
                    assignedTeacher?._id === user._id)) && (
                  <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={() => handleEdit(course)}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium cursor-pointer"
                    >
                      <Edit size={16} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => deleteCourse(course._id)}
                      disabled={deletingId === course._id}
                      className="flex items-center space-x-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {deletingId === course._id ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      <span>Delete</span>
                    </button>
                  </div>
                )}
            </div>
          );
        })}
      </div>
      {/* Empty State */}
      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="mx-auto text-gray-400" size={48} />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No courses found
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {user?.role === "student"
              ? "You are not enrolled in any courses yet. Contact your admin to get enrolled."
              : courses.length === 0
                ? "Create your first course to get started."
                : "Try adjusting your search."}
          </p>
        </div>
      )}
      {/* Create/Edit Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingCourse ? "Edit Course" : "Create New Course"}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                           
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               
                <div>
                                   
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Main Course *                  
                  </label>
                                   
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="input w-full"
                    placeholder="e.g., Computer Science"
                    required
                  />
                                 
                </div>
                               
                <div>
                                   
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Course Code *                  
                  </label>
                                   
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    className="input w-full uppercase"
                    placeholder="e.g., COMP01"
                    required
                  />
                                   
                  <p className="text-xs text-gray-500 mt-1">
                                        Same base code for all subcourses under
                    this main course                  
                  </p>
                                 
                </div>
                             
              </div>
                           
              <div>
                               
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Subcourse Description *                
                </label>
                               
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="input w-full resize-none"
                  placeholder="e.g., Introduction to Programming, Data Structures, Algorithms, etc."
                  required
                />
                               
                <p className="text-xs text-gray-500 mt-1">
                                    This differentiates between subcourses under
                  the same main                   course                
                </p>
                             
              </div>
                           
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               
                <div>
                                   
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Credits *                  
                  </label>
                                   
                  <input
                    type="number"
                    name="credits"
                    value={formData.credits}
                    onChange={handleInputChange}
                    className="input w-full"
                    min="1"
                    max="100"
                    required
                  />
                                 
                </div>
                               
                <div>
                                   
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Department *
                      </label>
                      <select
                        name="department"
                        value={formData.department || ""}
                        onChange={handleInputChange}
                        className="input w-full"
                        required
                      >
                        <option value="">Select Department</option>
                        {departments.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                     Max Students                  
                  </label>
                                   
                  <input
                    type="number"
                    name="maxStudents"
                    value={formData.maxStudents}
                    onChange={handleInputChange}
                    className="input w-full"
                    min="1"
                    max="500"
                  />
                                 
                </div>
                             
              </div>
                            {/* Schedule Section */}             
              <div className="border-t border-gray-600 pt-6">
                               
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                    Schedule                
                </h3>
                               
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   
                  <div>
                                       
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Days *                    
                    </label>
                                       
                    <div className="space-y-2">
                                           
                      {dayOptions.map((day) => (
                        <label key={day} className="flex items-center">
                                                   
                          <input
                            type="checkbox"
                            checked={formData.schedule.days.includes(day)}
                            onChange={() => handleDayToggle(day)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                                                   
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                                        {day}                   
                                 
                          </span>
                                                 
                        </label>
                      ))}
                                         
                    </div>
                                   
                  </div>
                                   
                  <div className="space-y-4">
                                       
                    <div>
                                           
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Start Time                      
                      </label>
                                           
                      <input
                        type="time"
                        name="schedule.startTime"
                        value={formData.schedule.startTime}
                        onChange={handleInputChange}
                        className="input w-full"
                      />
                                         
                    </div>
                                       
                    <div>
                                           
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                End Time                      
                      </label>
                                           
                      <input
                        type="time"
                        name="schedule.endTime"
                        value={formData.schedule.endTime}
                        onChange={handleInputChange}
                        className="input w-full"
                      />
                                         
                    </div>
                                       
                    <div>
                                           
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Room                      
                      </label>
                                           
                      <input
                        type="text"
                        name="schedule.room"
                        value={formData.schedule.room}
                        onChange={handleInputChange}
                        className="input w-full"
                        placeholder="e.g., Room 101"
                      />
                                         
                    </div>
                                     
                  </div>
                                 
                </div>
                             
              </div>
                           
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                               
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                  className="btn btn-secondary cursor-pointer disabled:opacity-50"
                >
                                    Cancel                
                </button>
                               
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary flex items-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>{editingCourse ? "Update" : "Create"} Course</span>
                    </>
                  )}
                           
                </button>
                             
              </div>
                         
            </form>
                     
          </div>
                 
        </div>
      )}
         
    </div>
  );
};

export default CourseManagement;
