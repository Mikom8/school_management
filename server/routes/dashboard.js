// routes/dashboard.js - Update this file
const express = require("express");
const User = require("../models/User");
const Student = require("../models/Student");
const Course = require("../models/Course");
const Grade = require("../models/Grade");
const Department = require("../models/Department");
const { auth } = require("../middleware/auth");
const { cacheMiddleware } = require("../middleware/cache");

const router = express.Router();

// Get dashboard stats with 5 minutes cache
router.get("/", auth, cacheMiddleware(300), async (req, res) => {
  try {
    const userRole = req.user.role;
    let dashboardData = {};

    if (userRole === "admin") {
      // Admin dashboard stats
      const totalStudents = await Student.countDocuments();
      const totalTeachers = await User.countDocuments({ role: "teacher" });
      const totalDepartments = await Department.countDocuments();

      dashboardData = {
        students: totalStudents,
        teachers: totalTeachers,
        departments: totalDepartments,
        attendance: 94, // Mock data for demo
      };
    } else if (userRole === "teacher") {
      // Teacher dashboard stats
      const teacherCourses = await Course.find({ teacher: req.user._id })
        .populate('department', '_id name');
      
      let studentsCount = 0;
      if (teacherCourses.length > 0) {
        const uniqueStudentIds = new Set();
        
        for (const course of teacherCourses) {
          // Method 1: Match by course string (name or code)
          const courseNameRegex = new RegExp("^" + course.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + "$", "i");
          const courseCodeRegex = new RegExp("^" + course.code.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + "$", "i");
          
          const query1 = {
            $or: [
              { course: courseNameRegex },
              { course: courseCodeRegex }
            ]
          };
          
          const students1 = await Student.find(query1).select('_id');
          students1.forEach(s => uniqueStudentIds.add(s._id.toString()));
          
          // Method 2: Match by department + year + semester
          if (course.department && course.year && course.semester) {
            const query2 = {
              department: course.department._id || course.department,
              grade: course.year,
              semester: course.semester
            };
            
            const students2 = await Student.find(query2).select('_id');
            students2.forEach(s => uniqueStudentIds.add(s._id.toString()));
          }
        }
        
        studentsCount = uniqueStudentIds.size;
      }

      dashboardData = {
        courses: teacherCourses.length,
        students: studentsCount,
        assignments: 0, // Mock data
        attendance: 92, // Mock data
      };
    } else if (userRole === "student") {
      // Student dashboard stats
      const student = await Student.findOne({ user: req.user._id });
      if (student) {
        const enrolledCourses = await Course.countDocuments({ enrolledStudents: student._id });
        
        // Calculate GPA from grades
        const grades = await Grade.find({ student: student._id })
          .populate("course", "credits");
        
        let totalPoints = 0;
        let totalCredits = 0;
        const gradePoints = {
          'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
          'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0
        };

        grades.forEach(grade => {
          const credits = grade.course?.credits || 0;
          const points = gradePoints[grade.grade] || 0;
          totalPoints += points * credits;
          totalCredits += credits;
        });

        const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";

        dashboardData = {
          courses: enrolledCourses,
          gpa: gpa,
          assignments: 2, // Mock data
          attendance: 95, // Mock data
        };
      } else {
        dashboardData = {
          courses: 0,
          gpa: "0.00",
          assignments: 0,
          attendance: 0,
        };
      }
    }

    res.json(dashboardData);
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get enrollment trend data for charts (last 12 months)
router.get("/enrollment-trend", auth, async (req, res) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const trend = await Student.aggregate([
      {
        $match: {
          enrollmentDate: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$enrollmentDate" },
            month: { $month: "$enrollmentDate" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Build a full 12-month series (fill months with 0 if no enrollments)
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const now = new Date();
    const result = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1; // 1-indexed

      const found = trend.find(
        (t) => t._id.year === year && t._id.month === month
      );

      result.push({
        name: months[month - 1],
        students: found ? found.count : 0,
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Enrollment trend error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get recent activity log
router.get("/recent-activity", auth, async (req, res) => {
  try {
    const activities = await require("../models/Activity").find()
      .sort({ createdAt: -1 })
      .limit(15);
      
    res.json({ success: true, data: activities });
  } catch (error) {
    console.error("Recent activity error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
