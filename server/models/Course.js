// models/Course.js - Update the teacher field
const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
    },
    description: {
      type: String,
      required: false,
    },
    credits: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Changed from false to true
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: false,
    },
    year: {
      type: String,
      required: true,
      enum: ["Remedial", "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"],
    },
    semester: {
      type: String,
      required: true,
      enum: ["1st Semester", "2nd Semester"],
    },
    schedule: {
      days: [
        {
          type: String,
          enum: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
        },
      ],
      startTime: String,
      endTime: String,
      room: String,
    },
    enrolledStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Remove any existing unique index on code
courseSchema.index({ code: 1 }, { unique: false });

// Virtual for current enrollment count
courseSchema.virtual("currentEnrollment").get(function () {
  return this.enrolledStudents.length;
});

// Check if course is full
courseSchema.virtual("isFull").get(function () {
  return this.currentEnrollment >= this.maxStudents;
});

module.exports = mongoose.model("Course", courseSchema);
