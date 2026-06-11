const express = require("express");
const Course = require("../models/Course");
const Student = require("../models/Student");
const User = require("../models/User");
const Activity = require("../models/Activity");
const Department = require("../models/Department");
const { auth, authorize } = require("../middleware/auth");

const router = express.Router();

// Add this middleware to log all requests to courses routes
router.use((req, res, next) => {
  console.log(`🟢 COURSES ROUTE: ${req.method} ${req.path}`);
  console.log(`🟢 Headers:`, req.headers.authorization ? "Authorization present" : "No authorization");
  next();
});

// TEST ROUTE: Check database connection
router.get("/test-db", async (req, res) => {
  try {
    console.log("🟢 TEST-DB: Starting test...");
    
    const courseCount = await Course.countDocuments();
    console.log("🟢 TEST-DB: Course count:", courseCount);
    
    const userCount = await User.countDocuments();
    console.log("🟢 TEST-DB: User count:", userCount);
    
    const sampleCourse = await Course.findOne();
    console.log("🟢 TEST-DB: Sample course exists:", !!sampleCourse);
    
    res.json({
      success: true,
      data: {
        courseCount,
        userCount,
        sampleCourse: sampleCourse ? "Exists" : "No courses"
      }
    });
    
  } catch (error) {
    console.error("❌ TEST-DB ERROR:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TEST ROUTE: Check authentication
router.get("/test-auth", auth, authorize("teacher"), (req, res) => {
  console.log("🟢 TEST-AUTH: Route reached successfully");
  console.log("🟢 TEST-AUTH: User ID:", req.user._id);
  console.log("🟢 TEST-AUTH: User Name:", req.user.name);
  console.log("🟢 TEST-AUTH: User Role:", req.user.role);
  
  res.json({
    success: true,
    message: "Authentication working",
    user: {
      id: req.user._id,
      name: req.user.name,
      role: req.user.role
    }
  });
});

// Add this at the top of your routes/courses.js
// PUBLIC TEST ROUTE - No authentication required
router.get("/public-test", async (req, res) => {
  try {
    console.log("🟢 PUBLIC-TEST: Route reached");
    console.log("🟢 PUBLIC-TEST: Testing database connection...");
    
    const courseCount = await Course.countDocuments();
    console.log("🟢 PUBLIC-TEST: Course count:", courseCount);
    
    const courses = await Course.find().limit(3);
    console.log("🟢 PUBLIC-TEST: Sample courses:", courses.length);
    
    res.json({
      success: true,
      message: "Public test route working",
      courseCount,
      sampleCourses: courses.map(c => ({ name: c.name, code: c.code }))
    });
    
  } catch (error) {
    console.error("❌ PUBLIC-TEST ERROR:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add this route to check user role
router.get("/check-my-role", auth, async (req, res) => {
  try {
    console.log("🟢 CHECK-MY-ROLE: Route reached");
    console.log("🟢 CHECK-MY-ROLE: User ID:", req.user._id);
    console.log("🟢 CHECK-MY-ROLE: User Name:", req.user.name);
    console.log("🟢 CHECK-MY-ROLE: User Role:", req.user.role);
    console.log("🟢 CHECK-MY-ROLE: Is teacher?", req.user.role === "teacher");
    
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role,
        isTeacher: req.user.role === "teacher"
      }
    });
    
  } catch (error) {
    console.error("❌ CHECK-MY-ROLE ERROR:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all courses with pagination and search
router.get("/", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const courses = await Course.find(query)
      .populate("teacher", "name email")
      .populate("department", "name code")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Course.countDocuments(query);

    res.json({
      success: true,
      data: courses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// ─── Named routes MUST come before /:id wildcard ────────────────────────────

// @desc    Get courses assigned to the logged-in teacher
// @route   GET /api/courses/teacher-courses
// @access  Private (Teacher)
router.get("/teacher-courses", auth, authorize("teacher"), async (req, res) => {
  try {
    const courses = await Course.find({ teacher: req.user._id }).populate(
      "teacher",
      "name email"
    ).populate("department","name code");

    res.json({
      success: true,
      data: courses,
      message:
        courses.length === 0
          ? "No courses assigned yet"
          : "Courses retrieved successfully",
    });
  } catch (error) {
    console.error("Teacher courses error:", error.message);
    res.status(500).json({
      success: false,
      message: "Database error: " + error.message,
    });
  }
});

// @desc    Get all departments
// @route   GET /api/courses/departments
// @access  Private
router.get("/departments", auth, async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true }).select("_id name code description").sort({ name: 1 });
    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching departments: " + error.message });
  }
});

// @desc    Create a department
// @route   POST /api/courses/departments
// @access  Private (Admin)
router.post("/departments", auth, authorize("admin"), async (req, res) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Department name is required" });
    }
    const existing = await Department.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, "i") } });
    if (existing) {
      return res.status(400).json({ success: false, message: "Department with this name already exists" });
    }
    const department = await Department.create({
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : undefined,
      description: description ? description.trim() : undefined,
    });
    try {
      await Activity.create({
        type: "department_created",
        description: `Created department: ${department.name}`,
        user: req.user ? req.user.name : "Admin",
      });
    } catch (e) { /* ignore */ }
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating department: " + error.message });
  }
});

// @desc    Delete a department
// @route   DELETE /api/courses/departments/:id
// @access  Private (Admin)
router.delete("/departments/:id", auth, authorize("admin"), async (req, res) => {
  try {
    const dept = await Department.findByIdAndDelete(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: "Department not found" });
    res.json({ success: true, message: "Department deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting department: " + error.message });
  }
});

// @desc    Update a department
// @route   PUT /api/courses/departments/:id
// @access  Private (Admin)
router.put("/departments/:id", auth, authorize("admin"), async (req, res) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Department name is required" });
    }
    const dept = await Department.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), code: code ? code.trim().toUpperCase() : undefined, description: description ? description.trim() : undefined },
      { new: true, runValidators: true }
    );
    if (!dept) return res.status(404).json({ success: false, message: "Department not found" });
    res.json({ success: true, data: dept });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating department: " + error.message });
  }
});

// @desc    Get courses enrolled by the logged-in student
// @route   GET /api/courses/my-courses
// @access  Private (Student)
router.get("/my-courses", auth, authorize("student"), async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found",
      });
    }

    // Strategy 1: Courses where student is in enrolledStudents array
    // Strategy 2: Courses whose name matches the student's registered course string
    // We union both so students always see relevant courses regardless of
    // whether formal enrollment was done via the Course.enrolledStudents array.
    const query = {
      $or: [
        { enrolledStudents: student._id },
      ],
    };

    if (student.department && student.grade && student.semester) {
      query.$or.push({
        department: student.department,
        year: student.grade,
        semester: student.semester,
      });
    }

    const courses = await Course.find(query)
      .populate("teacher", "name email")
      .select("name code description credits schedule teacher enrolledStudents maxStudents isActive department");
      
    // Map to include department info in selection if present
    const mapped = await Promise.all(courses.map(async (c) => {
      const course = c.toObject();
      if (course.department) {
        const dep = await Department.findById(course.department).select("name code");
        course.department = dep || course.department;
      }
      return course;
    }));

    res.json({
      success: true,
      data: mapped || courses,
    });
  } catch (error) {
    console.error("Get student courses error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching student courses: " + error.message,
    });
  }
});

// @desc    Create course (for teachers, auto-assigns self as teacher)
// @route   POST /api/courses/teacher-create
// @access  Private (Teacher)
router.post("/teacher-create", auth, authorize("teacher"), async (req, res) => {
  try {
    const courseData = {
      ...req.body,
      teacher: req.user._id,
    };

    const course = new Course(courseData);
    await course.save();
    await course.populate("teacher", "name email");

    // Log activity
    try {
      await Activity.create({
        type: "course_added",
        description: `Created course: ${course.code} - ${course.name}`,
        user: req.user.name,
      });
    } catch (err) {
      console.error("Activity log error:", err);
    }

    res.status(201).json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(400).json({
      success: false,
      message: "Error creating course",
      error: error.message,
    });
  }
});

// ─── Wildcard /:id routes LAST ───────────────────────────────────────────────

// Departments
// Get departments
router.get("/departments", auth, async (req, res) => {
  try {
    const deps = await Department.find().sort({ name: 1 });
    res.json({ success: true, data: deps });
  } catch (error) {
    console.error("Get departments error:", error);
    console.error(error.stack);
    res.status(500).json({ success: false, message: "Failed to retrieve departments" });
  }
});

// Create department (admin only)
router.post("/departments", auth, authorize("admin"), async (req, res) => {
  try {
    const { name, code, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Name is required" });
    const existing = await Department.findOne({ name });
    if (existing) return res.status(400).json({ success: false, message: "Department already exists" });
    const dept = await Department.create({ name, code, description });
    res.status(201).json({ success: true, data: dept });
  } catch (error) {
    console.error("Create department error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get course by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      "teacher",
      "name email"
    );
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Create course (admin / general)
router.post("/", auth, async (req, res) => {
  try {
    const course = new Course(req.body);
    await course.save();
    await course.populate("teacher", "name email");
    await course.populate("department", "name code");
    
    // Log activity
    try {
      await Activity.create({
        type: "course_added",
        description: `Created course: ${course.code} - ${course.name}`,
        user: req.user ? req.user.name : "Admin",
      });
    } catch (err) {
      console.error("Activity log error:", err);
    }
    
    res.status(201).json(course);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update course – only update provided fields, preserve teacher
router.put("/:id", auth, async (req, res) => {
  try {
    // Check if course exists first
    const existingCourse = await Course.findById(req.params.id);
    if (!existingCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Teachers can only edit their own courses
    if (req.user.role === "teacher" && existingCourse.teacher?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "You can only edit courses assigned to you" 
      });
    }

    const { teacher, ...updateData } = req.body;

    const updateFields = { ...updateData };
    const oldTeacher = existingCourse.teacher;
    
    // Only admins can change the teacher assignment
    if (teacher !== undefined && req.user.role === "admin") {
      updateFields.teacher = teacher;
    }

    const course = await Course.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    }).populate("teacher", "name email");
    await course.populate("department", "name code");

    // Log activity for course update
    try {
      await Activity.create({
        type: "course_updated",
        description: `Updated course: ${course.code} - ${course.name}`,
        user: req.user ? req.user.name : "Admin",
      });
    } catch (err) {
      console.error("Activity log error:", err);
    }

    // Log activity if teacher was assigned
    if (teacher !== undefined && teacher && oldTeacher?.toString() !== teacher.toString()) {
      try {
        const teacherUser = await User.findById(teacher);
        if (teacherUser) {
          await Activity.create({
            type: "teacher_updated",
            description: `Assigned ${teacherUser.name} to course: ${course.code} - ${course.name}`,
            user: req.user ? req.user.name : "Admin",
          });
        }
      } catch (err) {
        console.error("Activity log error:", err);
      }
    }

    res.json(course);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete course
router.delete("/:id", auth, async (req, res) => {
  try {
    // Check if course exists first
    const existingCourse = await Course.findById(req.params.id);
    if (!existingCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Teachers can only delete their own courses
    if (req.user.role === "teacher" && existingCourse.teacher?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "You can only delete courses assigned to you" 
      });
    }

    // Log activity before deletion
    try {
      await Activity.create({
        type: "course_deleted",
        description: `Deleted course: ${existingCourse.code} - ${existingCourse.name}`,
        user: req.user ? req.user.name : "Admin",
      });
    } catch (err) {
      console.error("Activity log error:", err);
    }

    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;

