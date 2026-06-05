import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Filter,
  Calendar,
  Users,
  BookOpen,
  Loader,
  User,
  Search,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";

const Reports = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState("grades");
  const [dateRange, setDateRange] = useState("this_semester");
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [semester, setSemester] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Helper function to make API calls with consistent endpoint handling
  const apiCall = async (endpoint, params = {}) => {
    // Remove any leading slash to avoid double slashes
    const cleanEndpoint = endpoint.replace(/^\//, "");
    return await axios.get(`/${cleanEndpoint}`, { params });
  };

  useEffect(() => {
    fetchDepartments();
    if (user?.role === "teacher") {
      fetchTeacherCourses();
    }
  }, [user]);

  const fetchDepartments = async () => {
    try {
      const response = await apiCall("courses/departments");
      const allDepartments = response.data.data || [];

      // For teachers, filter to show only departments they're assigned to
      if (user?.role === "teacher") {
        // Fetch teacher's courses first to get their departments
        const coursesResponse = await apiCall("courses/teacher-courses");
        const teacherCourses = coursesResponse.data.data || [];

        // Get unique department IDs from teacher's courses
        const teacherDeptIds = new Set(
          teacherCourses
            .map(course => course.department?._id || course.department)
            .filter(Boolean)
        );

        // Filter departments to only those the teacher teaches in
        const teacherDepartments = allDepartments.filter(dept =>
          teacherDeptIds.has(dept._id)
        );

        setDepartments(teacherDepartments);
      } else {
        setDepartments(allDepartments);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      setDepartments([]);
    }
  };

  const fetchTeacherCourses = async () => {
    try {
      const response = await apiCall("courses/teacher-courses");
      setCourses(response.data.data || []);
    } catch (error) {
      console.error("Error fetching teacher courses:", error);
      setCourses([]);
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      setReportData(null);

      let endpoint = "";
      const params = {};

      switch (reportType) {
        case "attendance":
          endpoint = "reports/attendance";
          if (selectedDepartment) params.department = selectedDepartment;
          if (dateRange) {
            const dates = getDateRange(dateRange);
            params.startDate = dates.start;
            params.endDate = dates.end;
          }
          break;

        case "grades":
          // ADMIN: Use the admin grades endpoint
          if (user?.role === "admin") {
            endpoint = "grades";
            if (selectedDepartment) params.department = selectedDepartment;
            if (selectedYear) params.grade = selectedYear;
            if (semester) params.semester = semester;
          }
          // TEACHER: Use teacher grades endpoint
          else if (user?.role === "teacher") {
            endpoint = "grades/teacher-grades";
            if (selectedCourse) params.courseId = selectedCourse;
            if (semester) params.semester = semester;
          }
          // STUDENT: Use student grades endpoint
          else {
            endpoint = "grades/my-grades";
          }
          break;

        case "student-performance":
          endpoint = "reports/student-performance";
          if (selectedYear) params.grade = selectedYear;
          break;

        default:
          return;
      }

      const response = await apiCall(endpoint, params);

      // Format the response based on endpoint and role
      if (endpoint === "grades/my-grades") {
        setReportData({
          type: "student-grades",
          data: response.data.data,
          role: "student",
        });
      } else if (endpoint === "grades/teacher-grades") {
        setReportData({
          type: "teacher-grades",
          data: response.data.data,
          role: "teacher",
        });
      } else if (endpoint === "grades") {
        setReportData({
          type: "admin-grades",
          data: response.data,
          role: "admin",
        });
      } else {
        setReportData(response.data.data);
      }
    } catch (error) {
      console.error("Error generating report:", error);
      const errorMessage = error.response?.data?.message || "Unknown error";

      if (error.response?.status === 403) {
        alert("Access denied: You don't have permission to view this report");
      } else if (error.response?.status === 404) {
        alert(
          "Report endpoint not found. Please check the server configuration.",
        );
      } else {
        alert("Error generating report: " + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // ... rest of your functions (getDateRange, getCurrentSemester, etc.) remain the same

  const getDateRange = (range) => {
    const now = new Date();
    switch (range) {
      case "this_week":
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        return {
          start: startOfWeek.toISOString().split("T")[0],
          end: new Date().toISOString().split("T")[0],
        };
      case "this_month":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          start: startOfMonth.toISOString().split("T")[0],
          end: new Date().toISOString().split("T")[0],
        };
      default:
        return { start: "", end: "" };
    }
  };

  const getCurrentSemester = () => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return month >= 7 ? `Fall ${year}` : `Spring ${year}`;
  };

  const yearOptions = [
    "Remedial",
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
    "5th Year",
  ];

  const semesterOptions = ["1st Semester", "2nd Semester"];

  const downloadReport = (format) => {
    if (!reportData) return;

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportType}_report_${new Date().toISOString().split("T")[0]
      }.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const reportTypes = [
    {
      id: "attendance",
      name: "Attendance Report",
      icon: Users,
      description: "Student attendance records",
      roles: ["admin", "teacher"],
    },
    {
      id: "grades",
      name: "Grade Report",
      icon: FileText,
      description: "Course grades and statistics",
      roles: ["admin", "teacher", "student"],
    },
    {
      id: "student-performance",
      name: "Student Performance",
      icon: BookOpen,
      description: "Individual student progress",
      roles: ["admin", "teacher"],
    },
  ];

  const filteredReportTypes = reportTypes.filter((type) =>
    type.roles.includes(user?.role),
  );

  const getGradeColor = (grade) => {
    switch (grade) {
      case "A+":
        return "bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-300";
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

  return (
    <div className="space-y-6 font-saira">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Reports - Admin Panel
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Generate comprehensive reports for all students and courses
          </p>
        </div>
      </div>

      {/* Report Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Generate Report
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredReportTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setReportType(type.id)}
                      className={`p-4 border rounded-lg text-left transition-all ${reportType === type.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                        }`}
                    >
                      <Icon size={24} className="mb-2" />
                      <div className="font-medium">{type.name}</div>
                      <div className="text-sm opacity-75">
                        {type.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Department Selection - For admin and teacher */}
              {(user?.role === "admin" || user?.role === "teacher") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department (Optional)
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="input"
                  >
                    <option value="">
                      {user?.role === "teacher" ? "All My Departments" : "All Departments"}
                    </option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Course Selection - For teacher only */}
              {user?.role === "teacher" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Course
                  </label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="input"
                  >
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.code} - {course.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Year Selection - For admin only */}
              {user?.role === "admin" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Year (Optional)
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="input"
                  >
                    <option value="">All Years</option>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Semester Selection - For grade reports */}
              {(reportType === "grades" ||
                reportType === "student-performance") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Semester
                    </label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="input"
                    >
                      <option value="">All Semesters</option>
                      {semesterOptions.map((sem) => (
                        <option key={sem} value={sem}>
                          {sem}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              {/* Date Range - For attendance reports */}
              {reportType === "attendance" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date Range
                  </label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="input"
                  >
                    <option value="this_week">This Week</option>
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="this_semester">This Semester</option>
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={generateReport}
              disabled={loading}
              className={`btn btn-primary flex items-center space-x-2 disabled:opacity-50 ${loading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {loading ? (
                <Loader className="animate-spin" size={20} />
              ) : (
                <FileText size={20} />
              )}
              <span>{loading ? "Generating..." : "Generate Report"}</span>
            </button>
          </div>
        </div>

        {/* Report Preview */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Report Output
          </h2>

          {loading ? (
            <div className="space-y-4 animate-pulse py-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>
          ) : reportData ? (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-green-700 dark:text-green-300 text-sm">
                  Report generated successfully
                </p>
                <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                  {reportData.data?.grades?.length ||
                    reportData.data?.data?.length ||
                    reportData.data?.length ||
                    0}{" "}
                  records found
                </p>
              </div>

              <button
                onClick={() => downloadReport("json")}
                className="w-full btn btn-secondary flex items-center space-x-2"
              >
                <Download size={20} />
                <span>Download JSON</span>
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>No report generated yet</p>
              <p className="text-sm mt-2">
                Generate a report to see the output
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ADMIN GRADES REPORT */}
      {reportData && reportData.type === "admin-grades" && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              All Grades Report
            </h2>
            <div className="text-sm text-gray-500">
              Total: {reportData.data.data?.length} grades
            </div>
          </div>

          {reportData.data.data?.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-3 px-4 font-medium dark:text-white">
                        Student
                      </th>
                      <th className="text-left py-3 px-4 font-medium dark:text-white">
                        Course
                      </th>
                      <th className="text-left py-3 px-4 font-medium dark:text-white">
                        Grade / 100%
                      </th>
                      <th className="text-left py-3 px-4 font-medium dark:text-white">
                        Semester
                      </th>
                      <th className="text-left py-3 px-4 font-medium dark:text-white">
                        Instructor
                      </th>
                      <th className="text-left py-3 px-4 font-medium dark:text-white">
                        Date Graded
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.data.data.map((grade, index) => (
                      <tr
                        key={grade._id}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium dark:text-white">
                            {grade.student?.user?.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {grade.student?.studentId}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium dark:text-white">
                            {grade.course?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {grade.course?.code}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeColor(grade.grade)}`}
                          >
                            {grade.grade}
                          </span>
                          {grade.percentage !== undefined && (
                            <span className="ml-2 text-sm dark:text-white">
                              ({grade.percentage})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm dark:text-white">{grade.semester}</td>
                        <td className="py-3 px-4 text-sm dark:text-white/80">
                          {grade.gradedBy?.name || "N/A"}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500 dark:text-white">
                          {new Date(grade.gradedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {reportData.data.pagination && (
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-sm text-gray-500">
                    Page {reportData.data.pagination.page} of{" "}
                    {reportData.data.pagination.pages}
                  </div>
                  <div className="flex space-x-2">
                    <button className="btn btn-sm btn-secondary">
                      Previous
                    </button>
                    <button className="btn btn-sm btn-secondary">Next</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
              <p>No grades found for the selected filters</p>
              <p className="text-sm mt-2">Try adjusting your filter criteria</p>
            </div>
          )}
        </div>
      )}

      {/* TEACHER GRADES REPORT */}
      {reportData && reportData.type === "teacher-grades" && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Course Grades Report
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total Courses: {reportData.data.courses?.length || 0}
            </div>
          </div>
          <div className="space-y-6">
            {reportData.data.courses?.length > 0 ? (
              reportData.data.courses.map((courseData) => (
                <div
                  key={courseData.course._id}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                >
                  <div className="mb-4 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {courseData.course.code} - {courseData.course.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Students: {courseData.students.length}
                      </p>
                    </div>
                    {(courseData.course.year || courseData.course.semester) && (
                      <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                        <div className="font-medium">
                          {courseData.course.year && <span>{courseData.course.year}</span>}
                          {courseData.course.year && courseData.course.semester && <span>, </span>}
                          {courseData.course.semester && <span>{courseData.course.semester}</span>}
                        </div>
                        <div>
                          Credits: {courseData.course.credits || 0}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-600">
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                            Name
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                            Student ID
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                            Grade / 100%
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                            Credits
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {courseData.students.map((studentData) => (
                          <tr
                            key={studentData.student._id}
                            className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <td className="py-3 px-4 text-gray-900 dark:text-white">
                              {studentData.user.name}
                            </td>
                            <td className="py-3 px-4 font-mono text-sm text-gray-900 dark:text-white">
                              {studentData.student.studentId}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeColor(studentData.grade.grade)}`}
                                >
                                  {studentData.grade.grade}
                                </span>
                                {studentData.grade.percentage !== undefined && (
                                  <span className="text-sm text-gray-600 dark:text-gray-200">
                                    ({studentData.grade.percentage})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-900 dark:text-white">
                              {courseData.course.credits || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                <p>No course grades found</p>
                <p className="text-sm mt-2">
                  Try adjusting your filter criteria or ensure grades have been submitted
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STUDENT GRADES REPORT */}
      {reportData && reportData.type === "student-grades" && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            My Grade Report
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Cumulative GPA
                </p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {reportData.data.gpa}
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">
                  Courses Completed
                </p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                  {reportData.data.grades.length}
                </p>
              </div>
            </div>

            {reportData.data.grades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-2 px-3 font-medium">
                        Course
                      </th>
                      <th className="text-left py-2 px-3 font-medium">Grade</th>
                      <th className="text-left py-2 px-3 font-medium">
                        Credits
                      </th>
                      <th className="text-left py-2 px-3 font-medium">
                        Semester
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.data.grades.map((grade, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-gray-700"
                      >
                        <td className="py-2 px-3">
                          <div className="font-medium">
                            {grade.course?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {grade.course?.code}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getGradeColor(grade.grade)}`}
                          >
                            {grade.grade}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {grade.course?.credits || 0}
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-500">
                          {grade.semester}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                <p>No grades available yet</p>
                <p className="text-sm mt-2">
                  Your grades will appear here once submitted by instructors
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
