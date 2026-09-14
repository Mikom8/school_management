const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const User = require("../models/User");
const Course = require("../models/Course");
const { auth } = require("../middleware/auth");
const { escapeRegex } = require("../middleware/security");

// @route   GET /api/search
// @desc    Global search for students, teachers, and courses
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim() : "";
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: { students: [], teachers: [], courses: [] },
      });
    }

    const regex = new RegExp(escapeRegex(q), "i");

    // 1. Search Students by name or studentId
    const students = await Student.find({
      $or: [{ name: regex }, { studentId: regex }],
    })
      .populate("user", "name email")
      .populate("department", "name")
      .limit(6);

    // 2. Search Teachers by name or email
    const teachers = await User.find({
      role: "teacher",
      $or: [{ name: regex }, { email: regex }],
    })
      .populate("department", "name")
      .limit(6);

    // 3. Search Courses by name or code
    const courses = await Course.find({
      $or: [{ name: regex }, { code: regex }],
    })
      .populate("teacher", "name")
      .populate("department", "name")
      .limit(6);

    res.json({
      success: true,
      data: {
        students: students.map((s) => ({
          id: s._id,
          name: s.name || s.user?.name || "N/A",
          studentId: s.studentId,
          grade: s.grade,
          department: s.department?.name || "",
        })),
        teachers: teachers.map((t) => ({
          id: t._id,
          name: t.name,
          email: t.email,
          department: t.department?.name || "",
        })),
        courses: courses.map((c) => ({
          id: c._id,
          name: c.name,
          code: c.code,
          teacherName: c.teacher?.name || "",
          department: c.department?.name || "",
        })),
      },
    });
  } catch (error) {
    console.error("Global search error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during search",
    });
  }
});

module.exports = router;
