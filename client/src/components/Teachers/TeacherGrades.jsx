import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Save,
  X,
  BookOpen,
  Users,
  Loader,
  Search,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import SkeletonLoading from "../Common/SkeletonLoading";

const TeacherGrades = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchStudentsWithGrades();
  }, []);

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 4000);
  };

  const fetchStudentsWithGrades = async () => {
    try {
      setLoading(true);

      // Fetch teacher's courses
      const coursesResponse = await axios.get("/courses/teacher-courses");
      const teacherCourses = coursesResponse.data.data || [];

      if (teacherCourses.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Fetch all grades for all teacher's courses in ONE API call
      const gradesResponse = await axios.get("/grades/teacher-grades");
      const allGradesData = gradesResponse.data.data.courses || [];

      // Fetch all students
      const studentsResponse = await axios.get("/students");
      const allStudents = studentsResponse.data.data || [];

      // Create a map of grades by student ID and course ID for quick lookup
      const gradesMap = new Map();
      allGradesData.forEach((courseData) => {
        courseData.students.forEach((studentData) => {
          const key = `${studentData.student._id}-${courseData.course._id}`;
          gradesMap.set(key, studentData.grade);
        });
      });

      // Filter students enrolled in teacher's courses
      const enrolledStudents = [];
      const addedStudentCourses = new Set(); // Track unique student-course combinations

      for (const course of teacherCourses) {
        // Find students who match this course by:
        // 1. Course string match (name or code)
        // 2. Department + Year + Semester match
        const courseStudents = allStudents.filter((student) => {
          // Method 1: Direct course name/code match
          if (student.course) {
            const studentCourse = student.course.toLowerCase().trim();
            const teacherCourseName = course.name.toLowerCase().trim();
            const teacherCourseCode = course.code.toLowerCase().trim();

            if (studentCourse === teacherCourseName || studentCourse === teacherCourseCode) {
              return true;
            }
          }

          // Method 2: Match by department, year (grade), and semester
          if (course.department && course.year && course.semester) {
            const deptMatch = student.department?._id === course.department?._id ||
              student.department?._id === course.department ||
              student.department === course.department?._id ||
              student.department === course.department;
            const yearMatch = student.grade === course.year;
            const semesterMatch = student.semester === course.semester;

            return deptMatch && yearMatch && semesterMatch;
          }

          return false;
        });

        for (const student of courseStudents) {
          const studentCourseKey = `${student._id}-${course._id}`;

          // Check if student-course combination already added
          if (!addedStudentCourses.has(studentCourseKey)) {
            addedStudentCourses.add(studentCourseKey);

            // Get grade from the pre-fetched grades map
            const gradeKey = `${student._id}-${course._id}`;
            const grade = gradesMap.get(gradeKey) || null;

            enrolledStudents.push({
              student: student,
              user: student.user,
              course: course,
              grade: grade,
            });
          }
        }
      }

      setStudents(enrolledStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
      showNotification("Error loading students", "error");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmit = async (studentData, gradeData) => {
    try {
      const response = await axios.post("/grades", {
        studentId: studentData.student.studentId,
        courseId: studentData.course._id,
        ...gradeData,
      });

      if (response.data.success) {
        setEditingGrade(null);
        fetchStudentsWithGrades();
        showNotification("Grade saved successfully!", "success");
        return true;
      }
    } catch (error) {
      console.error("Error submitting grade:", error);
      showNotification(
        error.response?.data?.message || "Error saving grade",
        "error",
      );
      return false;
    }
  };

  // Filter students based on search
  const filteredStudents = students
    .filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.student.studentId.toLowerCase().includes(searchLower) ||
        item.user.name.toLowerCase().includes(searchLower) ||
        item.course.name.toLowerCase().includes(searchLower) ||
        item.course.code.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      // Sort alphabetically by student name (A-Z) - teacher view only
      return a.user.name.localeCompare(b.user.name);
    });

  if (loading) {
    return <SkeletonLoading />;
  }

  return (
    <div className="space-y-6 font-saira">
      {/* Notification */}
      {notification.show && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-sm ${notification.type === "error"
            ? "bg-red-100 border-red-400 text-red-700"
            : "bg-green-100 border-green-400 text-green-700"
            } border px-4 py-3 rounded-lg shadow-lg flex items-start space-x-3`}
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

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Grade Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage student grades for your courses
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <label htmlFor="searchGrade">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-text"
                size={20}
              />
            </label>
            <input
              type="text"
              id="searchGrade"
              placeholder="Search by student name, ID, or course..."
              className="input w-full inputply"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Total:{" "}
              <span className="font-bold">{students.length} students</span>
            </p>
          </div>
        </div>
      </div>

      {/* Grades Table */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Student Grades
        </h2>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-medium">
              {students.length === 0
                ? "No students enrolled in your courses"
                : "No students match your search"}
            </p>
            <p className="text-sm mt-2">
              {students.length === 0
                ? "Students will appear here once they are enrolled in your courses"
                : "Try adjusting your search terms"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Student ID
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Student Name
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Course
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Grade / 100%
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Semester
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((studentData, index) => (
                  <tr
                    key={`${studentData.student._id}-${studentData.course._id}`}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-3 px-4 font-mono text-sm text-gray-900 dark:text-white">
                      {studentData.student.studentId}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {studentData.user.name}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      <div>
                        <div className="text-gray-500 dark:text-gray-200">
                          {studentData.course.name}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {studentData.grade ? (
                        <div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${studentData.grade.grade === "A+" ||
                              studentData.grade.grade === "A" ||
                              studentData.grade.grade === "A-"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                              : studentData.grade.grade.startsWith("B")
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                                : studentData.grade.grade.startsWith("C")
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                                  : studentData.grade.grade.startsWith("D")
                                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                                    : studentData.grade.grade === "NG"
                                      ? "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                                      : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                              }`}
                          >
                            {studentData.grade.grade}
                          </span>
                          {studentData.grade.percentage !== undefined && (
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-200">
                              ({studentData.grade.percentage})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm italic">
                          Not graded
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {studentData.grade?.semester || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setEditingGrade(studentData)}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                        title={studentData.grade ? "Edit grade" : "Add grade"}
                      >
                        {studentData.grade ? (
                          <>
                            <Edit size={18} />
                            <span>Edit</span>
                          </>
                        ) : (
                          <>
                            <Plus size={18} />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grade Edit Modal */}
      {editingGrade && (
        <GradeEditModal
          studentData={editingGrade}
          onClose={() => setEditingGrade(null)}
          onSubmit={handleGradeSubmit}
        />
      )}
    </div>
  );
};

// Grade Edit Modal Component
const GradeEditModal = ({ studentData, onClose, onSubmit }) => {
  // Helper function to get default semester
  const getDefaultSemester = () => {
    // Priority: existing grade semester > course semester > student semester > current semester
    if (studentData.grade?.semester) {
      return studentData.grade.semester;
    }
    if (studentData.course?.semester) {
      return studentData.course.semester;
    }
    if (studentData.student?.semester) {
      return studentData.student.semester;
    }
    return getCurrentSemester();
  };

  const [gradeData, setGradeData] = useState({
    percentage: studentData.grade?.percentage || "",
    grade: studentData.grade?.grade || "",
    semester: getDefaultSemester(),
    comments: studentData.grade?.comments || "",
  });

  const [autoCalculatedGrade, setAutoCalculatedGrade] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const grades = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F", "NG"];

  function getCurrentSemester() {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return month >= 7 ? `Fall ${year}` : `Spring ${year}`;
  }

  // Calculate letter grade from percentage
  const calculateLetterGrade = (percentage) => {
    const percent = parseFloat(percentage);
    if (isNaN(percent)) return null;

    if (percent >= 95) return { grade: 'A+', points: 4.0, description: 'Outstanding (rare)' };
    if (percent >= 85) return { grade: 'A', points: 4.0, description: 'Excellent' };
    if (percent >= 80) return { grade: 'A-', points: 3.7, description: 'Very Good' };
    if (percent >= 75) return { grade: 'B+', points: 3.3, description: 'Good' };
    if (percent >= 70) return { grade: 'B', points: 3.0, description: 'Good' };
    if (percent >= 65) return { grade: 'B-', points: 2.7, description: 'Above Average' };
    if (percent >= 60) return { grade: 'C+', points: 2.3, description: 'Satisfactory' };
    if (percent >= 50) return { grade: 'C', points: 2.0, description: 'Minimum Competency' };
    if (percent >= 45) return { grade: 'C-', points: 1.7, description: 'Marginal Pass' };
    if (percent >= 40) return { grade: 'D', points: 1.0, description: 'Poor Performance' };
    return { grade: 'F', points: 0.0, description: 'Fail' };
  };

  // Handle percentage change
  const handlePercentageChange = (e) => {
    const percentage = e.target.value;
    setGradeData({ ...gradeData, percentage });

    // Auto-calculate letter grade
    const calculated = calculateLetterGrade(percentage);
    setAutoCalculatedGrade(calculated);

    // If user hasn't manually overridden the grade, update it
    if (!gradeData.grade || calculated) {
      setGradeData({ ...gradeData, percentage, grade: calculated?.grade || "" });
    }
  };

  // Handle grade selection change
  const handleGradeChange = (e) => {
    const selectedGrade = e.target.value;
    setGradeData({ ...gradeData, grade: selectedGrade });

    // If NG is selected, clear the percentage field
    if (selectedGrade === "NG") {
      setGradeData({ ...gradeData, grade: selectedGrade, percentage: "" });
      setAutoCalculatedGrade(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate based on grade type
    if (gradeData.grade !== "NG") {
      if (!gradeData.percentage || parseFloat(gradeData.percentage) < 0 || parseFloat(gradeData.percentage) > 100) {
        alert("Please enter a valid percentage between 0 and 100");
        return;
      }
    }

    if (!gradeData.grade) {
      alert("Please select a grade");
      return;
    }

    setIsSubmitting(true);

    // Send data with percentage only if not NG
    const submitData = {
      ...gradeData,
      percentage: gradeData.grade === "NG" ? 0 : gradeData.percentage
    };

    await onSubmit(studentData, submitData);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {studentData.grade ? "Edit Grade" : "Add Grade"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Student
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                {studentData.user.name} ({studentData.student.studentId})
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                {studentData.course.code} - {studentData.course.name}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Percentage (0-100) {gradeData.grade !== "NG" && "*"}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={gradeData.percentage}
                onChange={handlePercentageChange}
                className="input w-full"
                placeholder="Enter percentage (0-100)"
                required={gradeData.grade !== "NG"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Letter Grade *
              </label>
              <select
                value={gradeData.grade}
                onChange={handleGradeChange}
                className="input w-full"
                required
              >
                <option value="">Select Grade</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
              {autoCalculatedGrade && gradeData.grade !== "NG" && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <span className="font-semibold">Auto-calculated: {autoCalculatedGrade.grade}</span>
                    <br />
                    <span className="text-xs">{autoCalculatedGrade.description} ({autoCalculatedGrade.points} GPA)</span>
                  </p>
                </div>
              )}
              {gradeData.grade === "NG" && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">No Grade (NG)</span>
                    <br />
                    <span className="text-xs">Not counted in GPA calculation</span>
                  </p>
                </div>
              )}
              {gradeData.grade && gradeData.grade !== "NG" && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Grade is auto-calculated but can be manually changed
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Semester *
              </label>
              <input
                type="text"
                value={gradeData.semester}
                onChange={(e) =>
                  setGradeData({ ...gradeData, semester: e.target.value })
                }
                className="input w-full"
                placeholder="e.g., Fall 2026, Spring 2026"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Comments (Optional)
              </label>
              <textarea
                value={gradeData.comments}
                onChange={(e) =>
                  setGradeData({ ...gradeData, comments: e.target.value })
                }
                className="input w-full resize-none"
                rows={3}
                placeholder="Add any comments about the grade..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="btn btn-secondary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary flex items-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Save Grade</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TeacherGrades;
