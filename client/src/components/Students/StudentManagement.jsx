import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Users,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  Folder,
  FileText,
  Save,
  Loader,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import SkeletonLoading from "../Common/SkeletonLoading";

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [teacherCourses, setTeacherCourses] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showGradeReport, setShowGradeReport] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [gradeReportData, setGradeReportData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    studentId: null,
    studentName: "",
  });
  const [emailCheck, setEmailCheck] = useState({
    checking: false,
    checkedEmail: "",
    exists: false,
  });
  const { user } = useAuth();

  // Notification state
  const [notification, setNotification] = useState({
    show: false,
    type: "", // 'success', 'error', 'warning', 'info'
    title: "",
    message: "",
  });

  // Add Student Form State
  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
    password: "",
    grade: "",
    dateOfBirth: "",
    parentName: "",
    parentContact: "",
    emergencyContact: "",
    semester: "",
    course: "",
    department: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
    },
  });

  // Edit Student Form State
  const [editStudent, setEditStudent] = useState({
    name: "",
    grade: "",
    dateOfBirth: "",
    parentName: "",
    parentContact: "",
    emergencyContact: "",
    semester: "",
    course: "",
    department: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
    },
  });

  useEffect(() => {
    fetchStudents();
    fetchAvailableCourses();
    fetchDepartments();
    if (user?.role === "teacher") {
      fetchTeacherCourses();
    }
  }, [user?.role]);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification((prev) => ({ ...prev, show: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  const showNotification = (type, title, message) => {
    setNotification({
      show: true,
      type,
      title,
      message,
    });
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/students");
      setStudents(response.data.data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherCourses = async () => {
    try {
      const response = await axios.get("/courses/teacher-courses");
      setTeacherCourses(response.data.data || []);
    } catch (error) {
      console.error("Error fetching teacher courses:", error);
      setTeacherCourses([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get("/courses/departments", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setDepartments(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
      setDepartments([]);
    }
  };

  const fetchStudentGrades = async (studentId) => {
    try {
      const response = await axios.get(`/grades?studentId=${studentId}`);
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching student grades:", error);
      return [];
    }
  };

  const filteredStudents = students
    .filter((student) => {
      // department may be a populated object {_id, name} or a plain string
      const deptName =
        typeof student.department === "object"
          ? student.department?.name || ""
          : student.department || "";
      const matchesSearch =
        student.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.course?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deptName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGrade = !filterGrade || student.grade === filterGrade;
      
      // For teachers, filter by course using department, year, and semester
      let matchesCourse = true;
      if (user?.role === "teacher") {
        if (filterCourse) {
          // Specific course selected
          const selectedCourse = teacherCourses.find(c => c._id === filterCourse);
          if (selectedCourse) {
            // Match by department, year (grade), and semester
            const studentDeptId = typeof student.department === "object" 
              ? student.department?._id 
              : student.department;
            const courseDeptId = typeof selectedCourse.department === "object"
              ? selectedCourse.department?._id
              : selectedCourse.department;
            
            const deptMatch = studentDeptId === courseDeptId;
            const yearMatch = student.grade === selectedCourse.year;
            const semesterMatch = student.semester === selectedCourse.semester;
            
            matchesCourse = deptMatch && yearMatch && semesterMatch;
          } else {
            matchesCourse = false;
          }
        } else {
          // "All Courses" - show students matching any of teacher's courses
          matchesCourse = teacherCourses.some(course => {
            const studentDeptId = typeof student.department === "object" 
              ? student.department?._id 
              : student.department;
            const courseDeptId = typeof course.department === "object"
              ? course.department?._id
              : course.department;
            
            const deptMatch = studentDeptId === courseDeptId;
            const yearMatch = student.grade === course.year;
            const semesterMatch = student.semester === course.semester;
            
            return deptMatch && yearMatch && semesterMatch;
          });
        }
      }
      
      // For admin, use grade filter; for teacher, use course filter
      if (user?.role === "teacher") {
        return matchesSearch && matchesCourse;
      }
      return matchesSearch && matchesGrade;
    })
    .sort((a, b) => {
      // Sort alphabetically by student name (A-Z) only for teachers
      if (user?.role === "teacher") {
        const nameA = a.user?.name || "";
        const nameB = b.user?.name || "";
        return nameA.localeCompare(nameB);
      }
      // For admin, keep original order (or you can sort by student ID, creation date, etc.)
      return 0;
    });

  // fetch courses
  const fetchAvailableCourses = async () => {
    try {
      setCoursesLoading(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get("/courses", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // API returns { success, data, pagination } — extract the array
      const allCourses = response.data?.data || response.data || [];

      // Keep only unique course names for the dropdown
      const seen = new Set();
      const uniqueCourses = (
        Array.isArray(allCourses) ? allCourses : []
      ).filter((course) => {
        const key = course.name.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setCourses(uniqueCourses);
    } catch (error) {
      console.error("Error fetching courses for dropdown:", error);
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  const handleDeleteStudent = (studentId, studentName) => {
    setConfirmDialog({ show: true, studentId, studentName });
  };

  const confirmDelete = async () => {
    const { studentId } = confirmDialog;
    setConfirmDialog({ show: false, studentId: null, studentName: "" });
    setDeletingId(studentId);
    try {
      await axios.delete(`/students/${studentId}`);
      fetchStudents();
      showNotification("success", "Deleted", "Student deleted successfully!");
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to delete student";
      showNotification("error", "Delete Failed", msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setEditStudent({
      name: student.user?.name || "",
      grade: student.grade || "",
      dateOfBirth: student.dateOfBirth
        ? new Date(student.dateOfBirth).toISOString().split("T")[0]
        : "",
      parentName: student.parentName || "",
      parentContact: student.parentContact || "",
      emergencyContact: student.emergencyContact || "",
      semester: student.semester || "",
      department: student.department || "",
      address: {
        street: student.address?.street || "",
        city: student.address?.city || "",
        state: student.address?.state || "",
        zipCode: student.address?.zipCode || "",
      },
    });
    setShowEditForm(true);
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsSubmitting(true);
    try {
      const updateData = {
        name: editStudent.name,
        grade: editStudent.grade,
        dateOfBirth: editStudent.dateOfBirth,
        parentName: editStudent.parentName,
        parentContact: editStudent.parentContact,
        emergencyContact: editStudent.emergencyContact,
        semester: editStudent.semester,
        department: editStudent.department,
        address: editStudent.address,
      };
      await axios.put(`/students/${selectedStudent._id}`, updateData);
      setShowEditForm(false);
      setSelectedStudent(null);
      fetchStudents();
      showNotification("success", "Updated", "Student updated successfully!");
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to update student";
      showNotification("error", "Update Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewGradeReport = async (student) => {
    try {
      setSelectedStudent(student);
      setLoading(true);

      // Fetch student grades
      const grades = await fetchStudentGrades(student.studentId);

      setGradeReportData({
        student: student,
        grades: grades,
        gpa: calculateGPA(grades),
      });

      setShowGradeReport(true);
    } catch (error) {
      console.error("Error fetching grade report:", error);
      showNotification("error", "Error", "Failed to load grade report");
    } finally {
      setLoading(false);
    }
  };

  const calculateGPA = (grades) => {
    const gradePoints = {
      A: 4.0,
      "A-": 3.7,
      "B+": 3.3,
      B: 3.0,
      "B-": 2.7,
      "C+": 2.3,
      C: 2.0,
      "C-": 1.7,
      "D+": 1.3,
      D: 1.0,
      F: 0.0,
    };

    let totalPoints = 0;
    let totalCredits = 0;

    grades.forEach((grade) => {
      const credits = grade.course?.credits || 0;
      const points = gradePoints[grade.grade] || 0;
      totalPoints += points * credits;
      totalCredits += credits;
    });

    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
  };

  const checkEmailAvailability = async (email) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setEmailCheck({ checking: false, checkedEmail: "", exists: false });
      return true;
    }

    try {
      setEmailCheck((prev) => ({
        ...prev,
        checking: true,
        checkedEmail: normalizedEmail,
      }));

      const response = await axios.get("/users/check-email", {
        params: { email: normalizedEmail },
      });
      const exists = Boolean(response.data?.exists);

      setEmailCheck({
        checking: false,
        checkedEmail: normalizedEmail,
        exists,
      });

      if (exists) {
        showNotification(
          "error",
          "Email Already Registered",
          "This email is already registered. Please use another email.",
        );
        return false;
      }

      return true;
    } catch (error) {
      setEmailCheck({
        checking: false,
        checkedEmail: normalizedEmail,
        exists: false,
      });
      return true;
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();

    const cleanedStudent = {
      ...newStudent,
      name: newStudent.name.trim(),
      email: newStudent.email.trim().toLowerCase(),
      password: newStudent.password,
      grade: newStudent.grade.trim(),
      dateOfBirth: newStudent.dateOfBirth,
      parentName: newStudent.parentName.trim(),
      parentContact: newStudent.parentContact.trim(),
      emergencyContact: newStudent.emergencyContact.trim(),
      semester: newStudent.semester,
      department: newStudent.department,
      address: {
        street: newStudent.address.street.trim(),
        city: newStudent.address.city.trim(),
        state: newStudent.address.state.trim(),
        zipCode: newStudent.address.zipCode.trim(),
      },
    };

    // Frontend validation
    if (
      !cleanedStudent.name ||
      !cleanedStudent.email ||
      !cleanedStudent.password ||
      !cleanedStudent.grade ||
      !cleanedStudent.parentName ||
      !cleanedStudent.parentContact
    ) {
      showNotification(
        "warning",
        "Validation Error",
        "Please fill all required fields (marked with *)",
      );
      return;
    }

    if (cleanedStudent.password.length < 6) {
      showNotification(
        "warning",
        "Validation Error",
        "Password must be at least 6 characters long",
      );
      return;
    }

    const emailAvailable =
      emailCheck.checkedEmail === cleanedStudent.email && emailCheck.exists
        ? false
        : await checkEmailAvailability(cleanedStudent.email);

    if (!emailAvailable) {
      return;
    }

    setIsSubmitting(true);
    try {
      const studentData = {
        name: cleanedStudent.name,
        email: cleanedStudent.email,
        password: cleanedStudent.password,
        grade: cleanedStudent.grade,
        dateOfBirth:
          cleanedStudent.dateOfBirth || new Date().toISOString().split("T")[0],
        parentName: cleanedStudent.parentName,
        parentContact: cleanedStudent.parentContact,
        emergencyContact:
          cleanedStudent.emergencyContact || cleanedStudent.parentContact,
        semester: cleanedStudent.semester,
        department: cleanedStudent.department,
        address: cleanedStudent.address,
      };

      const response = await axios.post("/students/register", studentData);

      if (response.data.success) {
        setShowAddForm(false);
        setNewStudent({
          name: "",
          email: "",
          password: "",
          grade: "",
          dateOfBirth: "",
          parentName: "",
          parentContact: "",
          emergencyContact: "",
          semester: "",
          department: "",
          address: { street: "", city: "", state: "", zipCode: "" },
        });
        fetchStudents();
        showNotification(
          "success",
          "Student Registered",
          `${studentData.name} has been added successfully!`,
        );
      }
    } catch (error) {
      if (error.response?.data?.errors?.length > 0) {
        const validationMessage = error.response.data.errors
          .map((ve) => ve.msg)
          .join(", ");
        showNotification(
          "error",
          "Validation Error",
          validationMessage || "Please check all required fields",
        );
      } else {
        const msg =
          error.response?.data?.message || "Failed to register student";
        showNotification("error", "Registration Failed", msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setNewStudent((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      if (name === "email") {
        setEmailCheck({ checking: false, checkedEmail: "", exists: false });
      }

      setNewStudent((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setEditStudent((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setEditStudent((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // College grade options
  const gradeOptions = [
    "Remedial",
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
    "5th Year",
  ];

  const semesterOptions = ["1st Semester", "2nd Semester"];

  // Notification icon and colors
  const getNotificationStyles = (type) => {
    const styles = {
      success: {
        bg: "bg-green-50 dark:bg-green-900",
        border: "border-green-200 dark:border-green-800",
        icon: (
          <CheckCircle
            className="text-green-600 dark:text-green-400"
            size={24}
          />
        ),
        text: "text-green-800 dark:text-green-300",
      },
      error: {
        bg: "bg-red-50 dark:bg-red-900",
        border: "border-red-200 dark:border-red-800",
        icon: (
          <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
        ),
        text: "text-red-800 dark:text-red-300",
      },
      warning: {
        bg: "bg-yellow-50 dark:bg-yellow-900",
        border: "border-yellow-200 dark:border-yellow-800",
        icon: (
          <AlertCircle
            className="text-yellow-600 dark:text-yellow-400"
            size={24}
          />
        ),
        text: "text-yellow-800 dark:text-yellow-300",
      },
      info: {
        bg: "bg-blue-50 dark:bg-blue-900",
        border: "border-blue-200 dark:border-blue-800",
        icon: <Info className="text-blue-600 dark:text-blue-400" size={24} />,
        text: "text-blue-800 dark:text-blue-300",
      },
    };
    return styles[type] || styles.info;
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case "A":
      case "A-":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "B+":
      case "B":
      case "B-":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      case "C+":
      case "C":
      case "C-":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
      case "D+":
      case "D":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300";
      case "F":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
    }
  };

  if (loading && !showGradeReport) {
    return <SkeletonLoading />;
  }

  return (
    <div className="space-y-6 font-saira">
      {/* Notification Popup */}
      {notification.show && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-right-full duration-500`}
        >
          <div
            className={`${getNotificationStyles(notification.type).bg} ${
              getNotificationStyles(notification.type).border
            } rounded-lg border p-4 shadow-lg`}
          >
            <div className="flex items-start space-x-3">
              {getNotificationStyles(notification.type).icon}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium ${
                    getNotificationStyles(notification.type).text
                  }`}
                >
                  {notification.title}
                </p>
                <p
                  className={`mt-1 text-sm ${
                    getNotificationStyles(notification.type).text
                  } opacity-90`}
                >
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() =>
                  setNotification((prev) => ({ ...prev, show: false }))
                }
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Report Modal */}
      {showGradeReport && gradeReportData && (
        <div className="fixed top-0 right-0 w-full h-screen bg-black/80 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-400 border-blue-500 rounded-lg max-w-4xl w-full max-h-[92vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                <u>{gradeReportData.student.user?.name}</u> <span className="block text-xs">Grade Report</span>
                </h2>
                <button
                  onClick={() => {
                    setShowGradeReport(false);
                    setGradeReportData(null);
                  }}
                  title="close"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Student Info Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Student ID
                    </p>
                    <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                      {gradeReportData.student.studentId}
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Academic Year
                    </p>
                    <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                      {gradeReportData.student.grade}
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Cumulative GPA
                    </p>
                    <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                      {gradeReportData.gpa}
                    </p>
                  </div>
                </div>

                {/* Grades Table */}
                {gradeReportData.grades.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-600">
                          <th className="text-left py-3 px-4 font-medium dark:text-white">
                            Course
                          </th>
                          <th className="text-left py-3 px-4 font-medium dark:text-white">
                            Grade / 100%
                          </th>
                          <th className="text-left py-3 px-4 font-medium dark:text-white">
                            Credits
                          </th>
                          <th className="text-left py-3 px-4 font-medium dark:text-white">
                            Semester
                          </th>
                          <th className="text-left py-3 px-4 font-medium dark:text-white">
                            Instructor
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {gradeReportData.grades.map((grade, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-100 dark:border-gray-700"
                          >
                            <td className="py-3 px-4">
                              <div className="font-medium dark:text-white">
                                {grade.course?.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-white/70">
                                {grade.course?.code}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeColor(
                                  grade.grade,
                                )}`}
                              >
                                {grade.grade}
                              </span>
                              {grade.percentage !== undefined && (
                              <span className="ml-2 text-sm dark:text-white">
                                ({grade.percentage})
                              </span>
                            )}
                            </td>
                            <td className="py-3 px-4 dark:text-white/80">
                              {grade.course?.credits || 0}
                            </td>
                            <td className="py-3 px-4 text-sm dark:text-white">
                              {grade.semester}
                            </td>
                            <td className="py-3 px-4 text-sm dark:text-white/80">
                              {grade.course?.teacher?.name || "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No grades available for this student</p>
                    <p className="text-sm mt-2">
                      Grades will appear here once submitted by instructors
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => {
                    setShowGradeReport(false);
                    setGradeReportData(null);
                  }}
                  className="btn btn-secondary cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditForm && selectedStudent && (
        <div className="fixed top-0 right-0 w-full h-screen bg-black/80 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-400 border-blue-500 rounded-lg max-w-4xl w-full max-h-[92vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Edit Student - {selectedStudent.user?.name}
                </h2>
                <button
                  onClick={() => setShowEditForm(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateStudent} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={editStudent.name}
                      onChange={handleEditInputChange}
                      className="input"
                      placeholder="Enter student's full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Academic Year *
                    </label>
                    <select
                      name="grade"
                      required
                      value={editStudent.grade}
                      onChange={handleEditInputChange}
                      className="input"
                    >
                      <option value="">Select Academic Year</option>
                      {gradeOptions.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      required
                      value={editStudent.dateOfBirth}
                      onChange={handleEditInputChange}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Semester *
                    </label>
                    <select
                      name="semester"
                      required
                      value={editStudent.semester}
                      onChange={handleEditInputChange}
                      className="input"
                    >
                      <option value="">Select Semester</option>
                      {semesterOptions.map((sem) => (
                        <option key={sem} value={sem}>
                          {sem}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department *
                    </label>
                    <select
                      name="department"
                      required
                      value={editStudent.department}
                      onChange={handleEditInputChange}
                      className="input"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Parent/Guardian Name *
                    </label>
                    <input
                      type="text"
                      name="parentName"
                      required
                      value={editStudent.parentName}
                      onChange={handleEditInputChange}
                      className="input"
                      placeholder="Enter parent/guardian name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Parent Contact *
                    </label>
                    <input
                      type="text"
                      name="parentContact"
                      required
                      value={editStudent.parentContact}
                      onChange={handleEditInputChange}
                      className="input"
                      placeholder="Enter parent/guardian phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Emergency Contact *
                    </label>
                    <input
                      type="text"
                      name="emergencyContact"
                      required
                      value={editStudent.emergencyContact}
                      onChange={handleEditInputChange}
                      className="input"
                      placeholder="Enter emergency contact number"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-500 pt-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    Address Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Street
                      </label>
                      <input
                        type="text"
                        name="address.street"
                        value={editStudent.address.street}
                        onChange={handleEditInputChange}
                        className="input"
                        placeholder="Enter street address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        name="address.city"
                        value={editStudent.address.city}
                        onChange={handleEditInputChange}
                        className="input"
                        placeholder="Enter city"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        name="address.state"
                        value={editStudent.address.state}
                        onChange={handleEditInputChange}
                        className="input"
                        placeholder="Enter state"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        name="address.zipCode"
                        value={editStudent.address.zipCode}
                        onChange={handleEditInputChange}
                        className="input"
                        placeholder="Enter ZIP code"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
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
                        <Save size={16} />
                        <span>Update Student</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Rest of your component remains the same */}
      <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Student Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
            {user?.role === "teacher" 
              ? "View students enrolled in your courses" 
              : "Manage college student records and information"}
          </p>
        </div>
        {user?.role === "admin" && (
          <button
            className="btn btn-primary flex items-center space-x-2 w-full sm:w-auto justify-center sm:justify-start cursor-pointer"
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={20} />
            <span>Add Student</span>
          </button>
        )}
      </div>

      {/* Add Student Form Modal */}
      {showAddForm && (
        <div className="fixed top-0 right-0 w-full h-screen bg-black/80 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-400 border-blue-500 rounded-lg max-w-4xl w-full max-h-[92vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Add New College Student
                </h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddStudent} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={newStudent.name}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="Enter student's full name"
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
                      value={newStudent.email}
                      onChange={handleInputChange}
                      onBlur={(e) => checkEmailAvailability(e.target.value)}
                      className="input"
                      placeholder="Enter student's college email"
                    />
                    {emailCheck.checking && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Checking email...
                      </p>
                    )}
                    {!emailCheck.checking && emailCheck.exists && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Email already registered
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      value={newStudent.password}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="Enter temporary password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Academic Year *
                    </label>
                    <select
                      name="grade"
                      required
                      value={newStudent.grade}
                      onChange={handleInputChange}
                      className="input"
                    >
                      <option value="">Select Academic Year</option>
                      {gradeOptions.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      required
                      value={newStudent.dateOfBirth}
                      onChange={handleInputChange}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Semester *
                    </label>
                    <select
                      name="semester"
                      required
                      value={newStudent.semester}
                      onChange={handleInputChange}
                      className="input"
                    >
                      <option value="">Select Semester</option>
                      {semesterOptions.map((sem) => (
                        <option key={sem} value={sem}>
                          {sem}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department *
                    </label>
                    <select
                      name="department"
                      required
                      value={newStudent.department}
                      onChange={handleInputChange}
                      className="input"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Parent/Guardian Name *
                    </label>
                    <input
                      type="text"
                      name="parentName"
                      required
                      value={newStudent.parentName}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="Enter parent/guardian name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Parent Contact *
                    </label>
                    <input
                      type="text"
                      name="parentContact"
                      required
                      value={newStudent.parentContact}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="Enter parent/guardian phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Emergency Contact *
                    </label>
                    <input
                      type="text"
                      name="emergencyContact"
                      required
                      value={newStudent.emergencyContact}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="Enter emergency contact number"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-500 pt-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    Address Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Street
                      </label>
                      <input
                        type="text"
                        name="address.street"
                        value={newStudent.address.street}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Enter street address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        name="address.city"
                        value={newStudent.address.city}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Enter city"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        name="address.state"
                        value={newStudent.address.state}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Enter state"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        name="address.zipCode"
                        value={newStudent.address.zipCode}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Enter ZIP code"
                      />
                    </div>
                  </div>
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
                        <span>Add Student</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Rest of your component remains the same */}
      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="input relative w-full">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search students by name, ID, course, or department..."
              className="inpt pl-10 w-full placeholder:text-gray-400 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="input w-full md:w-auto"
            value={user?.role === "teacher" ? filterCourse : filterGrade}
            onChange={(e) => user?.role === "teacher" ? setFilterCourse(e.target.value) : setFilterGrade(e.target.value)}
          >
            {user?.role === "teacher" ? (
              <>
                <option value="">All Courses</option>
                {teacherCourses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </>
            ) : (
              <>
                <option value="">All Academic Years</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="card">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>No students found</p>
            <p className="text-sm mt-2">
              {students.length === 0
                ? "No students in the system yet"
                : "No students match your search criteria"}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Students: <span className="font-semibold text-gray-900 dark:text-white">{filteredStudents.length}</span>
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-900 dark:text-white text-sm sm:text-base whitespace-nowrap">
                      Student ID
                    </th>
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                      Name
                    </th>
                    {user?.role === "admin" && (
                      <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-900 dark:text-white text-sm sm:text-base hidden md:table-cell">
                        Email
                      </th>
                    )}
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-900 dark:text-white text-sm sm:text-base whitespace-nowrap hidden sm:table-cell">
                      Academic Year
                    </th>
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-900 dark:text-white text-sm sm:text-base hidden lg:table-cell">
                      Semester
                    </th>
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-900 dark:text-white text-sm sm:text-base hidden lg:table-cell">
                      Department
                    </th>
                    {user?.role === "admin" && (
                      <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-900 dark:text-white text-sm sm:text-base whitespace-nowrap">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student._id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs sm:text-sm"
                    >
                      <td className="py-3 px-2 sm:px-4 font-mono text-gray-900 dark:text-white">
                        {student.studentId}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {student.user?.name}
                        </div>
                      </td>
                      {user?.role === "admin" && (
                        <td className="py-3 px-2 sm:px-4 text-gray-900 dark:text-white hidden md:table-cell">
                          {student.user?.email}
                        </td>
                      )}
                      <td className="py-3 px-2 sm:px-4 text-gray-900 dark:text-white hidden sm:table-cell whitespace-nowrap">
                        {student.grade}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-gray-900 dark:text-white hidden lg:table-cell">
                        {student.semester || "-"}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-gray-900 dark:text-white hidden lg:table-cell">
                        {student.department?.name || student.department || "-"}
                      </td>
                      {user?.role === "admin" && (
                        <td className="py-3 px-2 sm:px-4">
                          <div className="flex space-x-1 sm:space-x-2">
                            <button
                              className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                              title="Grade report"
                              onClick={() => handleViewGradeReport(student)}
                            >
                              <Folder size={16} className="sm:size-4" />
                            </button>
                            <button
                              className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 cursor-pointer"
                              title="Edit Info"
                              onClick={() => handleEditStudent(student)}
                            >
                              <Edit size={16} className="sm:size-4" />
                            </button>
                            <button
                              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Delete"
                              disabled={deletingId === student._id}
                              onClick={() =>
                                handleDeleteStudent(
                                  student._id,
                                  student.user?.name,
                                )
                              }
                            >
                              {deletingId === student._id ? (
                                <Loader size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} className="sm:size-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Custom Confirm Delete Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertCircle
                  className="text-red-600 dark:text-red-400"
                  size={22}
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Student
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {confirmDialog.studentName}
              </span>
              ? This will permanently remove their account and all associated
              data.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() =>
                  setConfirmDialog({
                    show: false,
                    studentId: null,
                    studentName: "",
                  })
                }
                className="btn btn-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 size={16} />
                <span>Delete Student</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
