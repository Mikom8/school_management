const express = require("express");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Check whether an email is already registered
router.get("/check-email", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const email = String(req.query.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email }).select("_id");

    res.json({
      success: true,
      exists: Boolean(user),
      message: user ? "Email already registered" : "Email is available",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get all teachers
router.get("/teachers", auth, async (req, res) => {
  try {
    const teachers = await User.find({ role: "teacher" }).select("name email");
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users (admin only)
router.get("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
