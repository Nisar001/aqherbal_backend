# Production Dockerfile for aqherbal_backend
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# Install dependencies (production only)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

# Environment
ENV NODE_ENV=production
EXPOSE 5000

# Default command
CMD ["node", "src/server.js"]
