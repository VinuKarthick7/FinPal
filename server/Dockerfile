# Dockerfile for FinPal Server (Node.js/Express)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
# Install ALL dependencies (including devDependencies) for build
RUN npm install

# Ensure uploads directory exists (even if empty)
RUN mkdir -p uploads
COPY . .
RUN npm run build

# Production image, copy only production deps and built files
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/uploads ./uploads
COPY .env.example .env
EXPOSE 5000
CMD ["node", "dist/index.js"]
