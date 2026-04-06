# Multi-stage build for Angular application

# Stage 1: Build the Angular application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application for production
RUN npm run build -- --configuration production

# Stage 2: Serve with nginx. Stable Alpine lags zlib/libpng fixes; pull patched packages from edge main
# (zlib >= 1.3.2, libpng >= 1.6.56) until the nginx base image’s release branch includes them.
FROM nginx:1.29-alpine

RUN apk update && apk upgrade --no-cache \
    && apk add --upgrade --no-cache \
        -X https://dl-cdn.alpinelinux.org/alpine/edge/main \
        zlib libpng \
    && rm -rf /var/cache/apk/* \
    && mkdir -p \
        /var/cache/nginx/client_temp \
        /var/cache/nginx/proxy_temp \
        /var/cache/nginx/fastcgi_temp \
        /var/run/nginx \
        /tmp/nginx/client_temp \
        /tmp/nginx/proxy_temp \
    && chown -R nginx:nginx /var/cache/nginx /var/run/nginx /tmp/nginx \
    && chgrp -R 0 /var/cache/nginx /var/run/nginx /tmp/nginx \
    && chmod -R g=u /var/cache/nginx /var/run/nginx /tmp/nginx

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/dist/ai-monitoring-ui/browser /usr/share/nginx/html

# COPY leaves root-owned files; nginx worker must read them (incl. OpenShift random UID + group 0)
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chgrp -R 0 /usr/share/nginx/html \
    && chmod -R g=u /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
