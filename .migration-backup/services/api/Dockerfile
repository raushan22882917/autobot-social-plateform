FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared ./packages/shared
COPY services/api ./services/api
RUN npm ci --workspace=@autobot360/api --workspace=@autobot360/shared 2>/dev/null || npm install
RUN npm run build --workspace=@autobot360/shared
RUN npm run build --workspace=@autobot360/api

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=builder /app/services/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
EXPOSE 8080
CMD ["node", "dist/index.js"]
