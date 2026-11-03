# ---- build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY nest-cli.json tsconfig.json tsconfig.build.json prisma7.config.ts ./
COPY src ./src
RUN npx prisma generate
RUN npm run build

# ---- runtime stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 5000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
