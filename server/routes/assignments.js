const express = require("express");
const Assignment = require("../models/Assignment");
const Course = require("../models/Course");
const { auth, authorize } = require("../middleware/auth");

const router = express.Router();

// @desc    Get Transloadit signature (for frontend authentication)
// @route   GET /api/assignments/signature
// @access  Private (Teacher)
router.get("/signature", auth, authorize("teacher"), (req, res) => {
  try {
    const crypto = require("crypto");
    const signature = crypto
      .createHmac("sha384", process.env.TRANSLOADIT_SECRET)
      .update(Buffer.from(JSON.stringify({}), "utf-8"))
      .digest("hex");

    res.json({
      success: true,
      data: {
        key: process.env.TRANSLOADIT_KEY,
        signature: signature,
        // Additional metadata to pass to Transloadit
        params: {
          auth: {
            key: process.env.TRANSLOADIT_KEY,
            expires: new Date(Date.now() + 3600000).toISOString(), // 1 hour
          },
          template_id: process.env.TRANSLOADIT_TEMPLATE_ID || undefined,
        },
      },
    });
  } catch (error) {
    console.error("Signature generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate signature",
    });
  }
});

// @desc    Webhook endpoint for Transloadit to notify upload completion
// @route   POST /api/assignments/webhook
// @access  Public (called by Transloadit)
router.post("/webhook", express.json(), async (req, res) => {
  try {
    console.log("📥 Transloadit webhook received:", req.body);

    // Transloadit sends the upload result here
    const { transloadit, fields } = req.body;

    // Verify this is from Transloadit (optional but recommended)
    const crypto = require("crypto");
    const signature = req.headers["transloadit-signature"];
    
    if (signature) {
      const payload = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac("sha384", process.env.TRANSLOADIT_SECRET)
        .update(Buffer.from(payload, "utf-8"))
        .digest("hex");

      if (signature !== `sha384:${expectedSignature}`) {
        return res.status(403).json({ error: "Invalid signature" });
      }
    }

    // Extract uploaded files from Transloadit response
    const uploadedFiles = [];
    
    if (transloadit && transloadit.results) {
      // Transloadit results contain the uploaded files
      Object.keys(transloadit.results).forEach((stepName) => {
        const stepResults = transloadit.results[stepName];
        if (Array.isArray(stepResults)) {
          stepResults.forEach((file) => {
            uploadedFiles.push({
              name: file.name,
              url: file.ssl_url || file.url,
              size: file.size,
              type: file.mime,
            });
          });
        }
      });
    }

    // Extract metadata from fields (sent from frontend)
    const metadata = JSON.parse(fields.metadata || "{}");

    // Create assignment in database
    const assignment = await Assignment.create({
      type: metadata.type,
      title: metadata.title,
      description: metadata.description,
      course: metadata.course,
      teacher: metadata.teacher,
      dueDate: metadata.dueDate,
      files: uploadedFiles,
    });

    await assignment.populate("course", "name code");
    await assignment.populate("teacher", "name email");

    console.log("✅ Assignment created:", assignment._id);

    res.json({ ok: true, assignment_id: assignment._id });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(500).json({ error: error.message });
  }
});

// @desc    Create assignment (metadata only, files handled by webhook)
// @route   POST /api/assignments
// @access  Private (Teacher)
router.post("/", auth, authorize("teacher"), async (req, res) => {
  try {
    const { type, title, description, course, dueDate, files } = req.body;

    // Validate required fields
    if (!type || !title || !course) {
      return res.status(400).json({
        success: false,
        message: "Type, title, and course are required",
      });
    }

    if (type === "assignment" && !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Due date is required for assignments",
      });
    }

    // Create assignment
    const assignment = await Assignment.create({
      type,
      title,
      description,
      course,
      teacher: req.user._id,
      dueDate,
      files: files || [],
    });

    await assignment.populate("course", "name code");
    await assignment.populate("teacher", "name email");

    res.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    console.error("Create assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create assignment",
      error: error.message,
    });
  }
});

// @desc    Get all assignments
// @route   GET /api/assignments
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const { course, type, page = 1, limit = 20 } = req.query;

    let query = { isActive: true };

    // Filter by course if specified
    if (course) {
      query.course = course;
    }

    // Filter by type if specified
    if (type) {
      query.type = type;
    }

    // Role-based filtering
    if (req.user.role === "teacher") {
      query.teacher = req.user._id;
    } else if (req.user.role === "student") {
      // Students can only see assignments from their enrolled courses
      // Get student's courses first
      const Student = require("../models/Student");
      const student = await Student.findOne({ user: req.user._id });
      
      if (student && student.department) {
        const courses = await Course.find({
          department: student.department,
          year: student.grade,
          semester: student.semester,
        }).select("_id");
        
        query.course = { $in: courses.map((c) => c._id) };
      }
    }

    const skip = (page - 1) * limit;

    const assignments = await Assignment.find(query)
      .populate("course", "name code")
      .populate("teacher", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Assignment.countDocuments(query);

    res.json({
      success: true,
      data: assignments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get assignments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch assignments",
      error: error.message,
    });
  }
});

// @desc    Get single assignment
// @route   GET /api/assignments/:id
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate("course", "name code")
      .populate("teacher", "name email");

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    console.error("Get assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch assignment",
      error: error.message,
    });
  }
});

// @desc    Update assignment
// @route   PUT /api/assignments/:id
// @access  Private (Teacher - own assignments only)
router.put("/:id", auth, authorize("teacher"), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Check if teacher owns this assignment
    if (assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this assignment",
      });
    }

    const { type, title, description, dueDate } = req.body;

    if (title) assignment.title = title;
    if (description !== undefined) assignment.description = description;
    if (type) assignment.type = type;
    if (dueDate !== undefined) assignment.dueDate = dueDate;

    await assignment.save();
    await assignment.populate("course", "name code");
    await assignment.populate("teacher", "name email");

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    console.error("Update assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update assignment",
      error: error.message,
    });
  }
});

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private (Teacher - own assignments only)
router.delete("/:id", auth, authorize("teacher"), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Check if teacher owns this assignment
    if (assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this assignment",
      });
    }

    // Soft delete
    assignment.isActive = false;
    await assignment.save();

    // Note: Files remain in Backblaze (optional: implement cleanup)

    res.json({
      success: true,
      message: "Assignment deleted successfully",
    });
  } catch (error) {
    console.error("Delete assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete assignment",
      error: error.message,
    });
  }
});

// @desc    Track download (increment counter)
// @route   POST /api/assignments/:id/download
// @access  Private (Student)
router.post("/:id/download", auth, async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 1 } },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    res.json({
      success: true,
      message: "Download tracked",
    });
  } catch (error) {
    console.error("Track download error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track download",
    });
  }
});

module.exports = router;
