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

    // Clear existing users (optional)
    await User.deleteMany({});
    console.log("Cleared existing users");

    // Create admin user
    const adminUser = await User.create({
      name: "System Administrator",
      email: "admin@school.com",
      password: "password",
      role: "admin",
    });
    console.log("Admin user created:", adminUser.email);

    // Create teacher user
    const teacherUser = await User.create({
      name: "John Teacher",
      email: "teacher@school.com",
      password: "password",
      role: "teacher",
    });
    console.log("Teacher user created:", teacherUser.email);

    // Create student user
    const studentUser = await User.create({
      name: "Sarah Student",
      email: "student@school.com",
      password: "password",
      role: "student",
    });
    console.log("Student user created:", studentUser.email);

    console.log("\n=== Login Credentials ===");
    console.log("Admin: admin@school.com / password");
    console.log("Teacher: teacher@school.com / password");
    console.log("Student: student@school.com / password");
    console.log("========================\n");

    process.exit(0);
  } catch (error) {
    console.error("Error creating initial users:", error);
    process.exit(1);
  }
};

createInitialUsers();
