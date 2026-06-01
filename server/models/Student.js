const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    studentId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    course: {
      type: String,
      trim: true,
      required: false,
    },
    grade: {
      type: String,
      required: true,
      enum: [
        "Remedial",
        "1st Year Degree",
        "2nd Year Degree",
        "3rd Year Degree",
        "4th Year Degree",
        "5th Year Degree",
        "1st-3rd Year Diploma",
      ],
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    parentName: {
      type: String,
      required: true,
      trim: true,
    },
    parentContact: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
    },
    emergencyContact: {
      type: String,
      required: true,
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    department: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// BETTER Auto-generate student ID - More reliable version
studentSchema.pre("validate", async function (next) {
  if (this.isNew && !this.studentId) {
    try {
      // Find the highest student ID to avoid race conditions
      const lastStudent = await mongoose
        .model("Student")
        .findOne()
        .sort({ studentId: -1 })
        .select("studentId");

      let nextNumber = 1;
      if (lastStudent && lastStudent.studentId) {
        // Extract number from existing ID (e.g., "STU0001" -> 1)
        const lastNumber =
          parseInt(lastStudent.studentId.replace("STU", "")) || 0;
        nextNumber = lastNumber + 1;
      }

      this.studentId = `STU${String(nextNumber).padStart(4, "0")}`;
      next();
    } catch (error) {
      console.error("Error generating student ID:", error);
      // Fallback: Use timestamp-based ID
      this.studentId = `STU${Date.now().toString().slice(-6)}`;
      next();
    }
  } else {
    next();
  }
});

module.exports = mongoose.model("Student", studentSchema);
