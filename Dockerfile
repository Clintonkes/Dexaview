FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN ls -la dist/

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf.template
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8080

# Override the nginx entrypoint entirely — no init scripts, no envsubst pass.
# start.sh safely substitutes only the listen port and launches nginx.
ENTRYPOINT []
CMD ["/start.sh"]
