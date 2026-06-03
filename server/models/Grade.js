const mongoose = require("mongoose");

const gradeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
      required: true,
      enum: ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F", "NG"],
    },
    semester: {
      type: String,
      required: true,
    },
    comments: {
      type: String,
      trim: true,
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    gradedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one grade per student per course per semester
gradeSchema.index({ student: 1, course: 1, semester: 1 }, { unique: true });

// Helper function to calculate letter grade from percentage
gradeSchema.statics.calculateLetterGrade = function(percentage) {
  if (percentage >= 95) return { grade: 'A+', points: 4.0, description: 'Outstanding (rare)' };
  if (percentage >= 85) return { grade: 'A', points: 4.0, description: 'Excellent' };
  if (percentage >= 80) return { grade: 'A-', points: 3.7, description: 'Very Good' };
  if (percentage >= 75) return { grade: 'B+', points: 3.3, description: 'Good' };
  if (percentage >= 70) return { grade: 'B', points: 3.0, description: 'Good' };
  if (percentage >= 65) return { grade: 'B-', points: 2.7, description: 'Above Average' };
  if (percentage >= 60) return { grade: 'C+', points: 2.3, description: 'Satisfactory' };
  if (percentage >= 50) return { grade: 'C', points: 2.0, description: 'Minimum Competency' };
  if (percentage >= 45) return { grade: 'C-', points: 1.7, description: 'Marginal Pass' };
  if (percentage >= 40) return { grade: 'D', points: 1.0, description: 'Poor Performance' };
  return { grade: 'F', points: 0.0, description: 'Fail' };
};

module.exports = mongoose.model("Grade", gradeSchema);
