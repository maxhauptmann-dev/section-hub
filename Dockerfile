## ── Stage 1: Build ──
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl python3 py3-pillow
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force
COPY . .
RUN npm run build

## ── Stage 2: Production ──
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Copy only what's needed at runtime
COPY --from=builder /app/package.json /app/package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/app/sections ./app/sections
COPY --from=builder /app/start-server.cjs ./start-server.cjs
COPY --from=builder /app/start-server.js ./start-server.js
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/public ./public

EXPOSE 8080

CMD ["sh", "-c", "npm run setup && HOST=0.0.0.0 PORT=8080 node server.js"]
