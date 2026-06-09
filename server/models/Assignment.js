const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["assignment", "handout"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dueDate: {
      type: Date,
      required: function () {
        return this.type === "assignment";
      },
    },
    files: [
      {
        name: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
        },
        type: {
          type: String,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    downloads: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
assignmentSchema.index({ course: 1, createdAt: -1 });
assignmentSchema.index({ teacher: 1 });
assignmentSchema.index({ type: 1 });

module.exports = mongoose.model("Assignment", assignmentSchema);
