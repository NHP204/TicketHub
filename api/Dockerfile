# Stage 1: cài dependency production (bcrypt là native addon nên cần toolchain nếu không có prebuild).
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: image chạy, chỉ chứa node_modules production và mã nguồn.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node docs ./docs
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node seeds ./seeds
USER node
EXPOSE 4000
CMD ["node", "src/server.js"]
