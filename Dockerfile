# Stage 1: Builder
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY shared/package.json ./shared/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build all packages
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner

# Add tini for better signal handling
RUN apk add --no-cache tini

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copy root workspace files and only necessary workspace package.json files
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/

# Install only production dependencies for the server (and its workspace dependencies)
# We use --workspace=server to target only the backend
RUN npm ci --omit=dev --workspace=server && npm cache clean --force

# Copy the built artifacts from the builder stage
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Set ownership to non-root user
RUN chown -R expressjs:nodejs /app

USER expressjs

# Expose the port Cloud Run will use
EXPOSE 8080

# Use tini to manage the process
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/dist/index.js"]
