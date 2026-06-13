const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// CORS — allow local dev and production frontend
const allowedOrigins = [
  "http://localhost:5173",   // Vite dev server
  "http://localhost:4173",   // Vite preview
  "http://localhost:3000",
  process.env.FRONTEND_URL,  // Set this on Render to your deployed frontend URL
].filter(Boolean);           // Remove undefined entries

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);
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
        serverSelectionTimeoutMS: 10000, // Increased timeout
      }
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Database connection error:", error.message);
    console.log("⚠️  Server will continue running, but database operations will fail");
    // Don't exit - let server run for testing
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
app.use("/api/assignments", require("./routes/assignments"));

// Default route provided
app.get("/", (req, res) => {
  res.json({ message: "School Management API is running!" });
});

// Ping endpoint for UptimeRobot and Self-Ping
app.get("/api/ping", (req, res) => {
  res.status(200).json({ status: "ok", message: "Pong - Server is awake" });
});

const PORT = process.env.PORT || 5000;

// Connect to database and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
    
    // --- Render Free Tier Keep-Awake ---
    // Render instances sleep after 15 mins of inactivity.
    // This script pings the server every 14 minutes.
    const pingInterval = 14 * 60 * 1000; // 14 minutes
    setInterval(async () => {
      try {
        // Use deployed BACKEND_URL if available, otherwise local
        const url = process.env.BACKEND_URL || `http://localhost:${PORT}`;
        // Using native fetch (available in Node 18+)
        const response = await fetch(`${url}/api/ping`);
        if (response.ok) {
          console.log(`[Keep-Awake] Self-ping successful at ${new Date().toISOString()}`);
        }
      } catch (err) {
        console.error(`[Keep-Awake] Self-ping failed:`, err.message);
      }
    }, pingInterval);
  });
});
