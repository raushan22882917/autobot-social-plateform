FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared ./packages/shared
COPY services/api ./services/api
RUN npm ci --workspace=@autobot360/api --workspace=@autobot360/shared 2>/dev/null || npm install
RUN npm run build --workspace=@autobot360/shared

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY package.json package-lock.json* ./
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/node_modules ./node_modules
COPY services/api ./services/api
# tsx runs TypeScript directly (same as local `npm run dev` for api)
RUN npm install tsx --no-save
EXPOSE 8080
CMD ["npx", "tsx", "services/api/src/index.ts"]
