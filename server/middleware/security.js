const rateLimit = require("express-rate-limit");

/**
 * Escapes regex special characters to prevent Regular Expression Denial of Service (ReDoS) and syntax errors.
 * @param {string} text 
 * @returns {string} Escaped string safe for RegExp creation
 */
const escapeRegex = (text = "") => {
  return String(text).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

/**
 * Custom middleware to sanitize incoming data against NoSQL Injection attacks.
 * Replaces leading '$' characters in keys or objects to prevent operator injection (e.g. { "$gt": "" }).
 */
const mongoSanitize = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const cleanObj = {};
    for (const key of Object.keys(obj)) {
      // Omit or sanitize keys starting with '$'
      const cleanKey = key.replace(/^\$/, "");
      const value = obj[key];

      if (typeof value === "object" && value !== null) {
        cleanObj[cleanKey] = sanitize(value);
      } else {
        cleanObj[cleanKey] = value;
      }
    }
    return cleanObj;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
};

/**
 * Global rate limiter: Max 300 requests per 15 minutes per IP address.
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

/**
 * Strict Auth rate limiter: Max 15 requests per 15 minutes per IP address for login/auth routes.
 * Protects against brute-force password guessing attacks.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please wait 15 minutes before trying again.",
  },
});

module.exports = {
  escapeRegex,
  mongoSanitize,
  globalLimiter,
  authLimiter,
};
