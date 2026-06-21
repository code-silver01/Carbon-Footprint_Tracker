# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and config
COPY . .

# Accept API URL at build time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the Vite application for production
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine AS runner

# Copy custom Nginx configuration
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built assets to Nginx's serve directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Cloud Run uses PORT environment variable, Nginx needs to be configured to use it
# We'll use a template approach or simple sed in entrypoint, but for standard 80 it's fine locally
# We will expose 8080 as standard for Cloud Run non-root Nginx
EXPOSE 8080

# Configure Nginx to run on 8080 and handle SPA routing
RUN sed -i 's/listen  *80;/listen 8080;/g' /etc/nginx/conf.d/default.conf && \
    sed -i 's/location \/ {/location \/ {\n        try_files $uri $uri\/ \/index.html;/g' /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
