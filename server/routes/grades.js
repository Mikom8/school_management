const express = require("express");
const mongoose = require("mongoose");
const Grade = require("../models/Grade");
const Course = require("../models/Course");
const Student = require("../models/Student");
const User = require("../models/User");
const { auth, authorize } = require("../middleware/auth"); // Add authorize import
const { body, validationResult } = require("express-validator");

const router = express.Router();

// ... rest of the grades.js code

// @desc    Get student's grades (for student)
// @route   GET /api/grades/my-grades
// @access  Private (Student)
router.get("/my-grades", auth, authorize("student"), async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

    const grades = await Grade.find({ student: student._id })
      .populate({
        path: "course",
        select: "name code credits",
        populate: { path: "teacher", select: "name" },
      })
      .populate("gradedBy", "name")
      .sort({ semester: -1, createdAt: -1 });

    // Calculate GPA
    const gpa = calculateGPA(grades);

    res.json({
      success: true,
      data: {
        student: {
          name: req.user.name,
          studentId: student.studentId,
          grade: student.grade,
          course: student.course,
        },
        grades,
        gpa,
        totalCredits: grades.reduce(
          (sum, grade) => sum + (grade.course?.credits || 0),
          0,
        ),
      },
    });
  } catch (error) {
    console.error("Get my grades error:", error);
    console.error(error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching grades",
    });
  }
});

// @desc    Get grades for teacher's courses
// @route   GET /api/grades/teacher-grades
// @access  Private (Teacher)
router.get("/teacher-grades", auth, authorize("teacher"), async (req, res) => {
  try {
    const { courseId, semester } = req.query;

    // Get courses taught by this teacher
    const courses = await Course.find({ teacher: req.user._id });
    const teacherCourseIds = courses.map((c) => c._id.toString());

    let gradesQuery = {
      course: { $in: courses.map((c) => c._id) },
    };

    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course ID",
        });
      }

      if (!teacherCourseIds.includes(courseId)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view grades for this course",
        });
      }

      gradesQuery.course = courseId;
    }
    if (semester) {
      gradesQuery.semester = semester;
    }

    const grades = await Grade.find(gradesQuery)
      .populate({
        path: "student",
        populate: {
          path: "user",
          select: "name email",
        },
      })
      .populate("course", "name code")
      .sort({ "student.user.name": 1, semester: -1 });

    // Group by course and student for easier display
    const groupedGrades = {};
    grades.forEach((grade) => {
      if (!grade.course || !grade.student) return;

      const courseKey = grade.course._id.toString();
      if (!groupedGrades[courseKey]) {
        groupedGrades[courseKey] = {
          course: grade.course,
          students: [],
        };
      }

      const studentEntry = groupedGrades[courseKey].students.find(
        (s) => s.student._id.toString() === grade.student._id.toString(),
      );

      if (!studentEntry) {
        groupedGrades[courseKey].students.push({
          student: grade.student,
          user: grade.student.user,
          grade: grade,
        });
      }
    });

    res.json({
      success: true,
      data: {
        courses: Object.values(groupedGrades),
        teacher: {
          name: req.user.name,
          totalCourses: courses.length,
        },
      },
    });
  } catch (error) {
    console.error("Get teacher grades error:", error);
    console.error(error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching teacher grades",
    });
  }
});

// @desc    Add or update grade
// @route   POST /api/grades
// @access  Private (Teacher, Admin)
router.post(
  "/",
  [
    auth,
    authorize("teacher", "admin"),
    body("studentId").notEmpty().withMessage("Student ID is required"),
    body("courseId").notEmpty().withMessage("Course ID is required"),
    body("grade")
      .isIn(["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"])
      .withMessage("Invalid grade"),
    body("semester").notEmpty().withMessage("Semester is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { studentId, courseId, grade, semester, comments } = req.body;

      // Verify student exists
      const student = await Student.findOne({ studentId }).populate("user");
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      // Verify course exists and teacher has access
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Check if teacher teaches this course
      if (
        req.user.role === "teacher" &&
        (!course.teacher ||
          course.teacher.toString() !== req.user._id.toString())
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to grade this course",
        });
      }

      // Check if existing grade exists
      const existingGrade = await Grade.findOne({
        student: student._id,
        course: courseId,
        semester,
      });

      let result;
      if (existingGrade) {
        // Update existing grade
        result = await Grade.findByIdAndUpdate(
          existingGrade._id,
          {
            grade,
            comments,
            gradedBy: req.user._id,
            gradedAt: new Date(),
          },
          { new: true },
        );
      } else {
        // Create new grade
        result = await Grade.create({
          student: student._id,
          course: courseId,
          grade,
          semester,
          comments,
          gradedBy: req.user._id,
        });
      }

      await result.populate("course", "name code credits");
      await result.populate({
        path: "student",
        populate: {
          path: "user",
          select: "name",
        },
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Grade submission error:", error);
      console.error(error.stack);
      res.status(500).json({
        success: false,
        message: error.message || "Error submitting grade",
      });
    }
  },
);

// @desc    Get all grades (for admin)
// @route   GET /api/grades
// @access  Private (Admin)
router.get("/", auth, authorize("admin"), async (req, res) => {
  try {
    const { page = 1, limit = 20, studentId, courseId, semester } = req.query;

    const query = {};
    if (studentId) {
      const student = await Student.findOne({ studentId });
      if (student) query.student = student._id;
    }
    if (courseId) query.course = courseId;
    if (semester) query.semester = semester;

    const grades = await Grade.find(query)
      .populate({
        path: "student",
        populate: {
          path: "user",
          select: "name email",
        },
      })
      .populate("course", "name code")
      .populate("gradedBy", "name")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Grade.countDocuments(query);

    res.json({
      success: true,
      data: grades,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all grades error:", error);
    console.error(error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching grades",
    });
  }
});

// Helper function to calculate GPA
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

module.exports = router;
