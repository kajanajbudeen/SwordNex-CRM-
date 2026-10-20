# ==============================================================================
# SwordNex AI CRM - Server Dockerfile
# Multi-stage production build
# ==============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copy server package definitions
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy server source code and compile
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
RUN npm ci --only=production

# Copy compiled files and prisma generated client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 5000

CMD ["node", "dist/index.js"]
