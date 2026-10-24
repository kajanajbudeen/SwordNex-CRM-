# ==============================================================================
# SwordNex AI CRM - Server Dockerfile
# Hardened multi-stage production build (Non-root user, Prisma client, Healthcheck)
# ==============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install full dependencies for building
RUN npm ci

# Copy server source code and compile TypeScript + Prisma client
COPY . .
RUN npx prisma generate
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled JavaScript, Prisma schema, and generated Prisma engines
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create upload directory and assign ownership to non-root node user
RUN mkdir -p /app/uploads && chown -R node:node /app

# Switch to non-root user for principle of least privilege
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "dist/index.js"]
