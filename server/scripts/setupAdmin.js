const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

const createInitialUsers = async () => {
  try {
    // Connect to database
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/school_management",
    );
    console.log("Connected to MongoDB");

    // ── Upsert superadmin (don't wipe everything) ──────────────────────────
    const superEmail = "superadmin@gmial.com";
    let superadmin = await User.findOne({ email: superEmail });

    if (superadmin) {
      // Update password & role in case they changed
      superadmin.password = "superadmin";
      superadmin.role = "superadmin";
      superadmin.isActive = true;
      await superadmin.save();
      console.log("✅ Superadmin updated:", superEmail);
    } else {
      superadmin = await User.create({
        name: "Super Administrator",
        email: superEmail,
        password: "superadmin",
        role: "superadmin",
      });
      console.log("✅ Superadmin created:", superEmail);
    }

    // ── Create / update demo admin ──────────────────────────────────────────
    const adminEmail = "admin@school.com";
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      adminUser = await User.create({
        name: "System Administrator",
        email: adminEmail,
        password: "password",
        role: "admin",
      });
      console.log("✅ Admin user created:", adminEmail);
    } else {
      console.log("ℹ️  Admin already exists:", adminEmail);
    }

    // ── Create / update demo teacher ───────────────────────────────────────
    const teacherEmail = "teacher@school.com";
    let teacherUser = await User.findOne({ email: teacherEmail });
    if (!teacherUser) {
      teacherUser = await User.create({
        name: "John Teacher",
        email: teacherEmail,
        password: "password",
        role: "teacher",
      });
      console.log("✅ Teacher user created:", teacherEmail);
    } else {
      console.log("ℹ️  Teacher already exists:", teacherEmail);
    }

    // ── Create / update demo student ───────────────────────────────────────
    const studentEmail = "student@school.com";
    let studentUser = await User.findOne({ email: studentEmail });
    if (!studentUser) {
      studentUser = await User.create({
        name: "Sarah Student",
        email: studentEmail,
        password: "password",
        role: "student",
      });
      console.log("✅ Student user created:", studentEmail);
    } else {
      console.log("ℹ️  Student already exists:", studentEmail);
    }

    console.log("\n=== Login Credentials ===");
    console.log("Superadmin: superadmin@gmial.com / superadmin");
    console.log("Admin:      admin@school.com     / password");
    console.log("Teacher:    teacher@school.com   / password");
    console.log("Student:    student@school.com   / password");
    console.log("========================\n");

    process.exit(0);
  } catch (error) {
    console.error("Error creating initial users:", error);
    process.exit(1);
  }
};

createInitialUsers();
