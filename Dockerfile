# Build Stage
FROM node:22-slim AS builder

WORKDIR /app

# Install dependencies for building
COPY package.json yarn.lock* package-lock.json* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; \
    fi

# Copy source code and build
COPY . .
RUN npm run build

# Production Stage
FROM node:22-slim

# Install system dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxshmfence1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production dependencies only
COPY package.json yarn.lock* package-lock.json* ./
RUN if [ -f yarn.lock ]; then yarn install --production --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci --only=production; \
    else npm install --only=production; \
    fi

# Copy built app from builder stage
COPY --from=builder /app/dist ./dist
# Copy other necessary assets (templates, views, etc.)
COPY --from=builder /app/src/templates ./src/templates
COPY --from=builder /app/src/views ./src/views
# Copy service account key if it exists (or handle via volumes/secrets)
# COPY --from=builder /app/serviceAccountKey.json ./serviceAccountKey.json

# Environment variables
ENV NODE_ENV=production
ENV PORT=8000

# Expose port
EXPOSE 8000

# Start the application
CMD ["node", "dist/index.js"]
