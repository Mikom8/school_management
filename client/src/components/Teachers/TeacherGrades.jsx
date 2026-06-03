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

      console.log("Teacher's courses:", teacherCourses);

      if (teacherCourses.length === 0) {
        console.log("No courses assigned to teacher");
        setStudents([]);
        setLoading(false);
        return;
      }

      // Fetch all students
      const studentsResponse = await axios.get("/students");
      const allStudents = studentsResponse.data.data || [];

      console.log("All students:", allStudents.length);

      // Filter students enrolled in teacher's courses
      const enrolledStudents = [];

      for (const course of teacherCourses) {
        console.log(`Checking course: ${course.name} (${course.code})`);
        console.log(`Course dept: ${course.department?._id || course.department}, year: ${course.year}, semester: ${course.semester}`);
        
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

        console.log(`Found ${courseStudents.length} students for course ${course.name}`);

        for (const student of courseStudents) {
          // Check if student already added
          const existingIndex = enrolledStudents.findIndex(
            (s) => s.student._id === student._id,
          );

          if (existingIndex === -1) {
            // Fetch grades for this student in this course
            try {
              const gradesResponse = await axios.get(
                `/grades/teacher-grades?courseId=${course._id}`,
              );

              const courseData = gradesResponse.data.data.courses.find(
                (c) => c.course._id === course._id,
              );

              const studentGrade = courseData?.students.find(
                (s) => s.student._id === student._id,
              );

              enrolledStudents.push({
                student: student,
                user: student.user,
                course: course,
                grade: studentGrade?.grade || null,
              });
            } catch (error) {
              // No grades yet for this student
              console.log(`No grades for student ${student.user?.name} in ${course.name}`);
              enrolledStudents.push({
                student: student,
                user: student.user,
                course: course,
                grade: null,
              });
            }
          }
        }
      }

      console.log("Total enrolled students:", enrolledStudents.length);
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
          className={`fixed top-4 right-4 z-50 max-w-sm ${
            notification.type === "error"
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
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by student name, ID, or course..."
              className="input pl-10 w-full"
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
                    Grade
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
                        <div className="font-medium">
                          {studentData.course.code}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {studentData.course.name}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {studentData.grade ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            studentData.grade.grade === "A" ||
                            studentData.grade.grade === "A-"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                              : studentData.grade.grade.startsWith("B")
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                                : studentData.grade.grade.startsWith("C")
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                                  : studentData.grade.grade.startsWith("D")
                                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                                    : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                          }`}
                        >
                          {studentData.grade.grade}
                        </span>
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
  const [gradeData, setGradeData] = useState({
    grade: studentData.grade?.grade || "",
    semester: studentData.grade?.semester || getCurrentSemester(),
    comments: studentData.grade?.comments || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const grades = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"];

  function getCurrentSemester() {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return month >= 7 ? `Fall ${year}` : `Spring ${year}`;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!gradeData.grade) {
      alert("Please select a grade");
      return;
    }
    setIsSubmitting(true);
    await onSubmit(studentData, gradeData);
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
                Grade *
              </label>
              <select
                value={gradeData.grade}
                onChange={(e) =>
                  setGradeData({ ...gradeData, grade: e.target.value })
                }
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
