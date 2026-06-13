# ──────────────────────────────────────────────
#  Stage 1: Install production dependencies only
# ──────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy manifest files first (better layer caching)
COPY package.json package-lock.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev

# ──────────────────────────────────────────────
#  Stage 2: Final runtime image
# ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Remove .env from the image (secrets come via env vars at runtime)
RUN rm -f .env

# Set ownership to non-root user
RUN chown -R appuser:appgroup /app

USER appuser

# Expose the backend port
EXPOSE 5000

# Health check — ensures the container is marked unhealthy if the API goes down
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/ || exit 1

# Start the server
CMD ["node", "server.js"]
