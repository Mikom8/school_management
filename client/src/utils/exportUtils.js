import * as XLSX from "xlsx";

/**
 * Transforms report data into flat spreadsheet rows based on report type/structure.
 * @param {Object|Array} reportData 
 * @param {string} reportType 
 * @returns {Array<Object>} Flat array of row objects
 */
export const formatReportDataForExcel = (reportData, reportType = "") => {
  if (!reportData) return [];

  // 1. Admin Grades Report
  if (reportData.type === "admin-grades" || (reportData.data && Array.isArray(reportData.data.data))) {
    const gradesList = reportData.data?.data || reportData.data || [];
    return gradesList.map((item) => ({
      "Student Name": item.student?.user?.name || "N/A",
      "Student ID": item.student?.studentId || "N/A",
      "Course Code": item.course?.code || "N/A",
      "Course Name": item.course?.name || "N/A",
      "Grade": item.grade || "N/A",
      "Percentage": item.percentage !== undefined ? `${item.percentage}%` : "N/A",
      "Semester": item.semester || "N/A",
      "Instructor": item.gradedBy?.name || "N/A",
      "Date Graded": item.gradedAt ? new Date(item.gradedAt).toLocaleDateString() : "N/A",
    }));
  }

  // 2. Teacher Grades Report
  if (reportData.type === "teacher-grades" || (reportData.data && Array.isArray(reportData.data.courses))) {
    const coursesList = reportData.data?.courses || [];
    const rows = [];
    coursesList.forEach((courseObj) => {
      const course = courseObj.course || {};
      const students = courseObj.students || [];
      students.forEach((studentObj) => {
        rows.push({
          "Course Code": course.code || "N/A",
          "Course Name": course.name || "N/A",
          "Academic Year": course.year || "N/A",
          "Semester": course.semester || "N/A",
          "Credits": course.credits || 0,
          "Student Name": studentObj.user?.name || "N/A",
          "Student ID": studentObj.student?.studentId || "N/A",
          "Grade": studentObj.grade?.grade || "N/A",
          "Percentage": studentObj.grade?.percentage !== undefined ? `${studentObj.grade.percentage}%` : "N/A",
        });
      });
    });
    return rows;
  }

  // 3. Student Grades Report (from Reports.jsx or GradeReport.jsx)
  if (reportData.type === "student-grades" || reportData.grades || (reportData.data && Array.isArray(reportData.data.grades))) {
    const gradesList = reportData.data?.grades || reportData.grades || [];
    const studentInfo = reportData.student || reportData.data?.student || {};
    const gpa = reportData.gpa || reportData.data?.gpa || "N/A";

    return gradesList.map((item) => ({
      "Student ID": studentInfo.studentId || "N/A",
      "Student Name": studentInfo.user?.name || studentInfo.name || "N/A",
      "Course Code": item.course?.code || "N/A",
      "Course Name": item.course?.name || "N/A",
      "Credits": item.course?.credits || 0,
      "Grade": item.grade || "N/A",
      "Percentage": item.percentage !== undefined ? `${item.percentage}%` : "N/A",
      "Semester": item.semester || "N/A",
      "Cumulative GPA": gpa,
      "Comments": item.comments || "",
      "Instructor": item.course?.teacher?.name || "N/A",
      "Date Graded": item.gradedAt ? new Date(item.gradedAt).toLocaleDateString() : "N/A",
    }));
  }

  // 4. Attendance Report
  if (reportData.details || (reportData.data && reportData.data.details)) {
    const details = reportData.details || reportData.data?.details || [];
    return details.map((item) => ({
      "Student ID": item.studentId || "N/A",
      "Student Name": item.studentName || "N/A",
      "Days Present": item.present || 0,
      "Days Absent": item.absent || 0,
      "Attendance Percentage": item.percentage !== undefined ? `${item.percentage}%` : "N/A",
    }));
  }

  // 5. Student Performance Report
  if (reportData.courseGrades || (reportData.data && reportData.data.courseGrades)) {
    const courseGrades = reportData.courseGrades || reportData.data?.courseGrades || [];
    const student = reportData.student || reportData.data?.student || {};
    const perf = reportData.academicPerformance || reportData.data?.academicPerformance || {};

    return courseGrades.map((item) => ({
      "Student ID": student.studentId || "N/A",
      "Student Name": student.name || "N/A",
      "Academic Grade": student.grade || "N/A",
      "Course Code": item.courseCode || "N/A",
      "Course Name": item.courseName || "N/A",
      "Credits": item.credits || 0,
      "Grade": item.grade || "N/A",
      "Semester": item.semester || "N/A",
      "Cumulative GPA": perf.cumulativeGPA || "N/A",
      "Completed Credits": perf.completedCredits || 0,
    }));
  }

  // Generic fallback if reportData is an array
  const rawArray = Array.isArray(reportData)
    ? reportData
    : Array.isArray(reportData.data)
      ? reportData.data
      : null;

  if (rawArray) {
    return rawArray.map((row) => {
      const formatted = {};
      Object.keys(row).forEach((key) => {
        if (typeof row[key] === "object" && row[key] !== null) {
          formatted[key] = row[key].name || row[key].title || JSON.stringify(row[key]);
        } else {
          formatted[key] = row[key];
        }
      });
      return formatted;
    });
  }

  // Single object fallback
  return [reportData];
};

/**
 * Generates and downloads an Excel file (.xlsx) from report data.
 * @param {Object|Array} reportData 
 * @param {string} filename 
 * @param {string} reportType 
 */
export const downloadExcelReport = (reportData, filename = "report.xlsx", reportType = "") => {
  try {
    const rows = formatReportDataForExcel(reportData, reportType);

    if (!rows || rows.length === 0) {
      alert("No data available to export.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-adjust column widths based on longest content
    const colWidths = Object.keys(rows[0] || {}).map((key) => {
      const maxLen = Math.max(
        key.length,
        ...rows.map((row) => String(row[key] || "").length)
      );
      return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
    });
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    const sheetName = reportType ? `${reportType.substring(0, 25)} Report` : "Report";
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const fullFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
    XLSX.writeFile(workbook, fullFilename);
  } catch (error) {
    console.error("Error generating Excel report:", error);
    alert("Failed to export Excel file: " + error.message);
  }
};
