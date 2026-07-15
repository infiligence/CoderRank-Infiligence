# ── Build stage: compile the Vue SPA ─────────────────────────────────────────
FROM node:16 AS build
WORKDIR /app

# Install dependencies (cached unless package files change)
COPY package.json package-lock.json* ./
RUN npm install

# Build the production bundle (Firebase config is baked in from src/firebase.js)
COPY . .
RUN npm run build

# ── Serve stage: static files via nginx ──────────────────────────────────────
FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
