#!/bin/sh
set -e

PORT_TO_USE="${PORT:-8080}"

echo "[start] nginx will listen on port ${PORT_TO_USE}"
sed "s/__NGINX_PORT__/${PORT_TO_USE}/g" /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf
echo "[start] generated config:"
cat /etc/nginx/conf.d/default.conf
echo "[start] testing nginx config..."
nginx -t
echo "[start] starting nginx..."
exec nginx -g "daemon off;"
