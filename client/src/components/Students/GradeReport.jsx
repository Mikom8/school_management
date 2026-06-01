// src/components/student/GradeReport.jsx
import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  BookOpen,
  Award,
  TrendingUp,
  Calendar,
  Loader,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import SkeletonLoading from "../Common/SkeletonLoading";

const GradeReport = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [gpa, setGpa] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchGradeReport();
  }, []);

  // In GradeReport.jsx
  const fetchGradeReport = async () => {
    try {
      setLoading(true);
      setError("");

      // Use consistent endpoint pattern
      const response = await axios.get("/grades/my-grades"); // No /api/ prefix

      if (response.data.success) {
        setGrades(response.data.data.grades || []);
        setStudentInfo(response.data.data.student);
        setGpa(response.data.data.gpa || "0.00");
      }
    } catch (error) {
      console.error("Error fetching grade report:", error);
      setError("Failed to load grade report");
    } finally {
      setLoading(false);
    }
  };

  const downloadGradeReport = () => {
    const reportData = {
      student: studentInfo,
      grades: grades,
      gpa: gpa,
      generatedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `grade_report_${studentInfo?.studentId}_${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    try {
      // This would call a backend endpoint to generate PDF
      // For now, we'll use the JSON download
      downloadGradeReport();
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case "A":
      case "A-":
        return "text-green-600 bg-green-50 dark:bg-green-900/20";
      case "B+":
      case "B":
      case "B-":
        return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
      case "C+":
      case "C":
      case "C-":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      case "D+":
      case "D":
        return "text-orange-600 bg-orange-50 dark:bg-orange-900/20";
      case "F":
        return "text-red-600 bg-red-50 dark:bg-red-900/20";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  const calculateSemesterGPA = (semesterGrades) => {
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

    semesterGrades.forEach((grade) => {
      const credits = grade.course?.credits || 0;
      const points = gradePoints[grade.grade] || 0;
      totalPoints += points * credits;
      totalCredits += credits;
    });

    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
  };

  const groupGradesBySemester = (grades) => {
    const grouped = {};
    grades.forEach((grade) => {
      if (!grouped[grade.semester]) {
        grouped[grade.semester] = [];
      }
      grouped[grade.semester].push(grade);
    });
    return grouped;
  };

  if (loading) {
    return <SkeletonLoading />;
  }

  if (error) {
    return (
      <div className="space-y-6 font-saira">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              My Grade Report
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Error loading grade report
            </p>
          </div>
        </div>
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <button onClick={fetchGradeReport} className="btn btn-primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const semesterGroups = groupGradesBySemester(grades);

  return (
    <div className="space-y-6 font-saira">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            My Grade Report
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Academic performance and course grades
          </p>
        </div>
        <div className="flex space-x-3 mt-4 lg:mt-0">
          <button
            onClick={downloadGradeReport}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <Download size={18} />
            <span>Download JSON</span>
          </button>
          <button
            onClick={downloadPDF}
            className="btn btn-primary flex items-center space-x-2"
          >
            <FileText size={18} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Student Summary */}
      {studentInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                <Award className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Cumulative GPA
                </p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {gpa}
                </p>
              </div>
            </div>
          </div>

          <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                <BookOpen
                  className="text-green-600 dark:text-green-400"
                  size={24}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Courses Taken
                </p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                  {grades.length}
                </p>
              </div>
            </div>
          </div>

          <div className="card bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                <TrendingUp
                  className="text-purple-600 dark:text-purple-400"
                  size={24}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Academic Year
                </p>
                <p className="text-lg font-bold text-purple-800 dark:text-purple-200">
                  {studentInfo.grade}
                </p>
              </div>
            </div>
          </div>

          <div className="card bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-lg">
                <FileText
                  className="text-orange-600 dark:text-orange-400"
                  size={24}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  Student ID
                </p>
                <p className="text-lg font-bold text-orange-800 dark:text-orange-200">
                  {studentInfo.studentId}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grades by Semester */}
      {Object.keys(semesterGroups).length > 0 ? (
        Object.entries(semesterGroups).map(([semester, semesterGrades]) => {
          const semesterGPA = calculateSemesterGPA(semesterGrades);

          return (
            <div key={semester} className="card">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                    <Calendar size={20} />
                    <span>{semester}</span>
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Semester GPA:
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {semesterGPA}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Courses: {semesterGrades.length}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                        Course Code
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                        Course Name
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                        Credits
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                        Grade
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                        Instructor
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                        Date Graded
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {semesterGrades.map((grade, index) => (
                      <tr
                        key={grade._id}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-sm font-medium">
                          {grade.course?.code}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {grade.course?.name}
                            </div>
                            {grade.comments && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {grade.comments}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {grade.course?.credits || 0}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeColor(
                              grade.grade,
                            )}`}
                          >
                            {grade.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {grade.teacher?.name || "N/A"}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(grade.gradedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      ) : (
        <div className="card text-center py-12">
          <BookOpen
            size={48}
            className="mx-auto mb-4 text-gray-400 dark:text-gray-500"
          />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Grades Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Your grade information will appear here once your instructors submit
            grades.
          </p>
        </div>
      )}

      {/* Grade Legend */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Grade Scale
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            {
              grade: "A (4.0)",
              color:
                "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
            },
            {
              grade: "A- (3.7)",
              color:
                "bg-green-50 text-green-700 dark:bg-green-900/10 dark:text-green-200",
            },
            {
              grade: "B+ (3.3)",
              color:
                "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
            },
            {
              grade: "B (3.0)",
              color:
                "bg-blue-50 text-blue-700 dark:bg-blue-900/10 dark:text-blue-200",
            },
            {
              grade: "C+ (2.3)",
              color:
                "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
            },
            {
              grade: "C (2.0)",
              color:
                "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/10 dark:text-yellow-200",
            },
            {
              grade: "D+ (1.3)",
              color:
                "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
            },
            {
              grade: "D (1.0)",
              color:
                "bg-orange-50 text-orange-700 dark:bg-orange-900/10 dark:text-orange-200",
            },
            {
              grade: "F (0.0)",
              color:
                "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
            },
          ].map((item, index) => (
            <div
              key={index}
              className={`text-center py-2 px-3 rounded-lg text-sm font-medium ${item.color}`}
            >
              {item.grade}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GradeReport;
