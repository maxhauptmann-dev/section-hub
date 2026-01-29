FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 8080

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force

COPY . .

RUN npm run build

ENV PORT=8080
ENV HOST=0.0.0.0

CMD ["sh", "-c", "npm run setup && HOST=0.0.0.0 PORT=8080 npx react-router-serve ./build/server/index.js"]
