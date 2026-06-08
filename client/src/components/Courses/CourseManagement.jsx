import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Users,
  Clock,
  BookOpen,
  NotebookText,
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
import Toast from "../Common/Toast";
import SkeletonLoading from "../Common/SkeletonLoading";
import { formatTimeTo12Hour } from "../../utils/timeFormat";

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { user } = useAuth();
  const [toast, setToast] = useState({
    show: false,
    message: "",
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

  // Toast notification
  const showToast = (message) => {
    setToast({ show: true, message });
  };

  // Custom confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: () => { },
    onCancel: () => { },
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
    onCancel = () => { },
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

  // Function to count students enrolled in a course by matching department + year + semester
  const getStudentCountForCourse = (course) => {
    if (!students.length) return 0;
    const courseDeptId =
      typeof course.department === "object"
        ? course.department?._id?.toString()
        : course.department?.toString();

    return students.filter((student) => {
      // Match by enrolledStudents array (formal enrollment)
      if (
        Array.isArray(course.enrolledStudents) &&
        course.enrolledStudents.some(
          (id) => id?.toString() === student._id?.toString()
        )
      )
        return true;

      // Match by department + year (grade) + semester
      const studentDeptId =
        typeof student.department === "object"
          ? student.department?._id?.toString()
          : student.department?.toString();
      return (
        courseDeptId &&
        studentDeptId &&
        courseDeptId === studentDeptId &&
        student.grade === course.year &&
        student.semester === course.semester
      );
    }).length;
  };

  // Function to get students enrolled in a course by matching department + year + semester
  const getStudentsForCourse = (course) => {
    if (!students.length) return [];
    const courseDeptId =
      typeof course.department === "object"
        ? course.department?._id?.toString()
        : course.department?.toString();

    return students.filter((student) => {
      if (
        Array.isArray(course.enrolledStudents) &&
        course.enrolledStudents.some(
          (id) => id?.toString() === student._id?.toString()
        )
      )
        return true;

      const studentDeptId =
        typeof student.department === "object"
          ? student.department?._id?.toString()
          : student.department?.toString();
      return (
        courseDeptId &&
        studentDeptId &&
        courseDeptId === studentDeptId &&
        student.grade === course.year &&
        student.semester === course.semester
      );
    });
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
        showToast("Course created successfully!");
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
      showToast("Course created successfully!");
    } catch (error) {
      console.error("Error creating course:", error);
      setError(`Failed to create course: ${error.message}`);
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
        showToast("Course updated successfully!");
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
      setShowCreateModal(false);
      resetForm();
      showToast("Course updated successfully!");
    } catch (error) {
      console.error("Error updating course:", error);
      setError(`Failed to update course: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCourse = async (id) => {
    const courseToDelete = courses.find((course) => course._id === id);

    showConfirmDialog(
      "Delete Course",
      `Are you sure you want to delete "${courseToDelete?.name}"? This action cannot be undone.`,
      async () => {
        setDeletingId(id);
        try {
          const token = getAuthToken();
          if (!token) {
            setCourses((prev) => prev.filter((course) => course._id !== id));
            showToast("Course deleted successfully!");
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
          showToast("Course deleted successfully!");
        } catch (error) {
          console.error("Error deleting course:", error);
          setError(`Failed to delete course: ${error.message}`);
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

    if (!formData.name || !formData.code) {
      setError("Please fill in all required fields");
      return;
    }

    if (formData.schedule.days.length === 0) {
      setError("Please select at least one day for the schedule");
      return;
    }

    if (!formData.department || !formData.year || !formData.semester) {
      setError("Please select department, year and semester");
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
      startTime && endTime ? formatTimeTo12Hour(`${startTime} - ${endTime}`) : "Time not set";

    return `${dayStr} • ${timeStr}`;
  };

  // Filter courses based on search and department
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.description || "").toLowerCase().includes(searchTerm.toLowerCase());

    const courseDeptId = course.department?._id || course.department || "unassigned";
    const matchesDept =
      selectedDeptFilter === "all" ||
      courseDeptId === selectedDeptFilter;

    return matchesSearch && matchesDept;
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
      {/* Toast Notification */}
      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: "" })}
      />
      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black/80 bg-opacity-50 h-full flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-400 border-blue-500 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="shrink-0">
                <Info className="text-yellow-500" size={24} />
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
                    onConfirm: () => { },
                    onCancel: () => { },
                  });
                }}
                className="btn btn-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button className="button" type="button" onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog({
                  show: false,
                  title: "",
                  message: "",
                  onConfirm: () => { },
                  onCancel: () => { },
                });
              }}>
                <span className="button__text">Delete</span>
                <span className="button__icon"><svg className="svg" height={512} viewBox="0 0 512 512" width={512} xmlns="http://www.w3.org/2000/svg"><title></title><path d="M112,112l20,320c.95,18.49,14.4,32,32,32H348c17.67,0,30.87-13.51,32-32l20-320" style={{ fill: 'none', stroke: '#fff', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '32px' }}></path><line style={{ stroke: '#fff', strokeLinecap: 'round', strokeMiterlimit: 10, strokeWidth: '32px' }} x1={80} x2={432} y1={112} y2={112}></line><path d="M192,112V72h0a23.93,23.93,0,0,1,24-24h80a23.93,23.93,0,0,1,24,24h0v40" style={{ fill: 'none', stroke: '#fff', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '32px' }}></path><line style={{ fill: 'none', stroke: '#fff', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '32px' }} x1={256} x2={256} y1={176} y2={400}></line><line style={{ fill: 'none', stroke: '#fff', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '32px' }} x1={184} x2={192} y1={176} y2={400}></line><line style={{ fill: 'none', stroke: '#fff', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '32px' }} x1={328} x2={320} y1={176} y2={400}></line></svg></span>
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
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Course Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {courses.length} courses across{" "}
            {Object.keys(
              courses.reduce((acc, c) => {
                acc[c.department?._id || c.department || "unassigned"] = true;
                return acc;
              }, {})
            ).length}{" "}
            departments
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search courses..."
              className="pl-10 pr-4 py-2 w-64 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-300 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {user?.role === "admin" && (
            <div className="relative">
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-300 shadow-sm cursor-pointer min-w-[180px]"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {user?.role === "admin" && (
            <>
              <button
                onClick={() => setShowDeptModal(true)}
                className="btn btn-secondary flex items-center space-x-2 cursor-pointer"
              >
                <Plus size={16} />
                <span>Department</span>
              </button>
              <button
                onClick={handleCreateNew}
                className="btn btn-primary flex items-center space-x-2 cursor-pointer"
              >
                <Plus size={18} />
                <span>Create Course</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Department-grouped course list ── */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <BookOpen className="text-gray-400" size={36} />
          </div>
          <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">No courses found</h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {user?.role === "student"
              ? "You are not enrolled in any courses yet."
              : courses.length === 0
                ? "Create your first course to get started."
                : "Try adjusting your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.values(
            filteredCourses.reduce((acc, course) => {
              const deptId = course.department?._id || course.department || "unassigned";
              let deptName = "Unassigned";
              let deptCode = "";

              if (course.department && typeof course.department === "object") {
                deptName = course.department.name || "Unassigned";
                deptCode = course.department.code || "";
              } else if (course.department && course.department !== "unassigned") {
                const foundDept = departments.find((d) => d._id === course.department);
                if (foundDept) {
                  deptName = foundDept.name;
                  deptCode = foundDept.code || "";
                }
              }

              if (!acc[deptId]) {
                acc[deptId] = { id: deptId, name: deptName, code: deptCode, courses: [] };
              }
              acc[deptId].courses.push(course);
              return acc;
            }, {})
          ).map((dept, deptIdx) => {
            const colors = [
              { bg: "from-blue-500 to-indigo-600", light: "bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-800", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", top: "from-blue-500 to-indigo-600" },
              { bg: "from-emerald-500 to-teal-600", light: "bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-800", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", top: "from-emerald-500 to-teal-600" },
              { bg: "from-violet-500 to-purple-600", light: "bg-white dark:bg-gray-900 border-violet-200 dark:border-violet-800", badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300", top: "from-violet-500 to-purple-600" },
              { bg: "from-orange-500 to-amber-600", light: "bg-white dark:bg-gray-900 border-orange-200 dark:border-orange-800", badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300", top: "from-orange-500 to-amber-600" },
              { bg: "from-rose-500 to-pink-600", light: "bg-white dark:bg-gray-900 border-rose-200 dark:border-rose-800", badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300", top: "from-rose-500 to-pink-600" },
              { bg: "from-cyan-500 to-sky-600", light: "bg-white dark:bg-gray-900 border-cyan-200 dark:border-cyan-800", badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300", top: "from-cyan-500 to-sky-600" },
            ];
            const color = colors[deptIdx % colors.length];

            return (
              <section key={dept.id}>
                {/* Department Header */}
                <div className="flex items-center gap-2 mb-5">
                  <div className={`h-10 w-10 flex items-center justify-center shadow-md shrink-0`}>
                    <NotebookText size={18} className="text-black dark:text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                      {dept.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {dept.courses.length} course{dept.courses.length !== 1 ? "s" : ""}
                      {dept.code ? ` · ${dept.code}` : ""}
                    </p>
                  </div>
                  <div className="hidden sm:block h-px flex-1 bg-linear-to-r from-gray-200 dark:from-gray-700 to-transparent" />
                </div>

                {/* Courses grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {dept.courses.map((course) => {
                    const assignedTeacher = getAssignedTeacher(course);
                    const displayCode = course.code.split("-")[0];
                    const studentCount = getStudentCountForCourse(course);

                    return (
                      <div
                        key={course._id}
                        className={`relative rounded-2xl border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group ${color.light}`}
                      >

                        <div className="p-5">
                          {/* Course header */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug truncate">
                                {course.name}
                              </h3>
                              <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${color.badge}`}>
                                {displayCode}
                              </span>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 whitespace-nowrap">
                                {course.credits} credits
                              </span>
                              {user?.role === "admin" && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 flex items-center gap-1 whitespace-nowrap">
                                  <Users size={10} />
                                  {studentCount} enrolled
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Description */}
                          {course.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                              {course.description}
                            </p>
                          )}

                          {/* Meta info */}
                          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                            {(course.year || course.semester) && (
                              <div className="flex items-center gap-2">
                                {course.year && (
                                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">
                                    {course.year}
                                  </span>
                                )}
                                {course.semester && (
                                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">
                                    {course.semester}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <User size={13} className="text-gray-400 shrink-0" />
                              {assignedTeacher ? (
                                <span className="flex items-center gap-1 truncate">
                                  <CheckCircle size={11} className="text-green-500 shrink-0" />
                                  <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                                    {assignedTeacher.name}
                                  </span>
                                </span>
                              ) : (
                                <span className="italic text-gray-400">No teacher assigned</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Clock size={13} className="text-gray-400 shrink-0" />
                              <span className="truncate">{formatSchedule(course)}</span>
                            </div>

                            {course.schedule?.room && (
                              <div className="flex items-center gap-2">
                                <MapPin size={13} className="text-gray-400 shrink-0" />
                                <span>Room {course.schedule.room}</span>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          {user?.role !== "student" &&
                            (user?.role === "admin" ||
                              (user?.role === "teacher" && assignedTeacher?._id === user._id)) && (
                              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
                                <button
                                  onClick={() => handleEdit(course)}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
                                >
                                  <Edit size={13} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteCourse(course._id)}
                                  disabled={deletingId === course._id}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  {deletingId === course._id ? (
                                    <Loader size={13} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={13} />
                                  )}
                                  Delete
                                </button>
                              </div>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ── Create Department Modal ── */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Department</h3>
              <button onClick={() => setShowDeptModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!deptForm.name.trim()) { setError("Department name is required"); return; }
                setDeptSubmitting(true);
                try {
                  const token = getAuthToken();
                  const res = await fetch(getApiUrl("/courses/departments"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
                    body: JSON.stringify(deptForm),
                  });
                  const text = await res.text();
                  let json; try { json = JSON.parse(text); } catch (e) { json = { message: text }; }
                  if (!res.ok) throw new Error(json?.message || res.statusText || "Failed to create department");
                  const newDeptId = json?.data?._id || json?._id || null;
                  if (newDeptId) setFormData((prev) => ({ ...prev, department: newDeptId }));
                  await fetchDepartments();
                  setShowDeptModal(false);
                  setDeptForm({ name: "", code: "", description: "" });
                  showToast("Department created successfully!");
                } catch (err) {
                  setError(`Failed to create department: ${err.message}`);
                } finally { setDeptSubmitting(false); }
              }}
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <input name="name" value={deptForm.name} onChange={(e) => setDeptForm((p) => ({ ...p, name: e.target.value }))} className="input w-full" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                  <input name="code" value={deptForm.code} onChange={(e) => setDeptForm((p) => ({ ...p, code: e.target.value }))} className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea name="description" value={deptForm.description} onChange={(e) => setDeptForm((p) => ({ ...p, description: e.target.value }))} className="input w-full" rows={3} />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button type="button" onClick={() => setShowDeptModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={deptSubmitting}>{deptSubmitting ? "Saving..." : "Create"}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create / Edit Course Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-400 border-blue-500 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingCourse ? "Edit Course" : "Create New Course"}
              </h2>
              <button title="close" onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Course Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="input w-full" placeholder="e.g., Computer Science" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Course Code *</label>
                  <input type="text" name="code" value={formData.code} onChange={handleInputChange} className="input w-full uppercase" placeholder="e.g., COMP01" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} className="input w-full" rows={2} placeholder="Optional course description" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Credits *</label>
                  <input type="number" name="credits" value={formData.credits} onChange={handleInputChange} className="input w-full" min="1" max="100" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Year *</label>
                  <select name="year" value={formData.year} onChange={handleInputChange} className="input w-full" required>
                    <option value="" disabled>Select Year</option>
                    <option value="Remedial">Remedial</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="5th Year">5th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Semester *</label>
                  <select name="semester" value={formData.semester} onChange={handleInputChange} className="input w-full" required>
                    <option value="" disabled>Select Semester</option>
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Department *</label>
                <select name="department" value={formData.department || ""} onChange={handleInputChange} className="input w-full" required>
                  <option value="" disabled>Select Department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Schedule */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Days *</label>
                    <div className="flex flex-wrap gap-2">
                      {dayOptions.map((day) => (
                        <label
                          key={day}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-all ${formData.schedule.days.includes(day)
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400"
                            }`}
                        >
                          <input type="checkbox" checked={formData.schedule.days.includes(day)} onChange={() => handleDayToggle(day)} className="sr-only" />
                          {day.slice(0, 3)}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start</label>
                        <input type="time" name="schedule.startTime" value={formData.schedule.startTime} onChange={handleInputChange} className="input w-full" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End</label>
                        <input type="time" name="schedule.endTime" value={formData.schedule.endTime} onChange={handleInputChange} className="input w-full" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Room</label>
                      <input type="text" name="schedule.room" value={formData.schedule.room} onChange={handleInputChange} className="input w-full" placeholder="e.g., Room 101" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={() => setShowCreateModal(false)} disabled={isSubmitting} className="btn btn-secondary cursor-pointer disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary flex items-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
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
