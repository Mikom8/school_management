const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/school_management",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        family: 4, // Force IPv4 (fixes ReplicaSetNoPrimary on some Wi-Fi networks)
        serverSelectionTimeoutMS: 5000, 
      }
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/students", require("./routes/students"));
app.use("/api/teachers", require("./routes/teachers"));
app.use("/api/courses", require("./routes/courses"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/schedule", require("./routes/schedule"));
app.use("/api/grades", require("./routes/grades"));
app.use("/api/users", require("./routes/users"));
app.use("/api/notifications", require("./routes/notifications"));

// Default route provided
app.get("/", (req, res) => {
  res.json({ message: "School Management API is running!" });
});

const PORT = process.env.PORT || 5000;

// Connect to database and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
  });
});
