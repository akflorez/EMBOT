# Dockerfile for Cally Frontend (Vite) - Redeploy Trigger v2
# Stage 1: Build
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN ls -la dist && [ -f dist/index.html ] || (echo "Build failed to produce index.html" && exit 1)

# Stage 2: Production Server
FROM nginx:stable-alpine
# Copy built files
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist /usr/share/nginx/html
# Custom Nginx config to handle SPA routing and Proxy
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
