const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const { mongoSanitize, globalLimiter, authLimiter } = require("./middleware/security");

const app = express();

// Disable x-powered-by header to prevent server technology fingerprinting
app.disable("x-powered-by");

// 1. Security HTTP Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Set to false if serving mixed content assets or inline scripts during dev
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// 2. CORS — allow local dev and production frontend
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

// 3. Payload size limiting to prevent Denial of Service (DoS)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 4. NoSQL Injection protection middleware
app.use(mongoSanitize);

// 5. Global API Rate Limiter
app.use("/api/", globalLimiter);

// 6. Strict Authentication Rate Limiter (Brute-force protection on login/register)
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

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
app.use("/api/superadmin", require("./routes/superadmin"));
app.use("/api/search", require("./routes/search"));

// Default route provided
app.get("/", (req, res) => {
  res.json({ message: "School Management API is running securely!" });
});

// Ping endpoint for UptimeRobot and Self-Ping
app.get("/api/ping", (req, res) => {
  res.status(200).json({ status: "ok", message: "Pong - Server is awake" });
});

// Centralized Safe Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("🔒 SECURE ERROR HANDLER caught an error:", err.message);

  // Handle CORS errors
  if (err.message && err.message.startsWith("CORS:")) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  // Handle Express JSON syntax errors
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON body format",
    });
  }

  // Standardized error response hiding stack traces in production
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

const PORT = process.env.PORT || 5000;

// Connect to database and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running securely on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);

    // --- Render Free Tier Keep-Awake ---
    const pingInterval = 14 * 60 * 1000; // 14 minutes
    setInterval(async () => {
      try {
        const url = process.env.BACKEND_URL || `http://localhost:${PORT}`;
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
