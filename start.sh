#!/bin/sh
set -e

PORT="${PORT:-8080}"
echo "[start] nginx will listen on port $PORT"

sed "s/NGINX_PORT/$PORT/g" /etc/nginx/nginx.conf.template \
    > /etc/nginx/conf.d/default.conf

echo "[start] generated config:"
cat /etc/nginx/conf.d/default.conf

echo "[start] testing nginx config..."
nginx -t

echo "[start] starting nginx..."
exec nginx -g "daemon off;"
