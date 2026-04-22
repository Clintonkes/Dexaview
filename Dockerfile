
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN ls -la dist/

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Store as a plain template — NOT in /etc/nginx/templates/ to avoid
# the nginx image's own envsubst pass which corrupts $uri and regex anchors.
COPY nginx.conf /etc/nginx/nginx.conf.template
EXPOSE 8080
# Substitute only ${PORT} with a safe fallback, then start nginx.
CMD ["/bin/sh", "-c", "export PORT=\"${PORT:-8080}\" && envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -t && nginx -g 'daemon off;'"]
