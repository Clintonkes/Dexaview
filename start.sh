#!/bin/sh
set -e
echo "[start] starting nginx on port 8080..."
cp /etc/nginx/nginx.conf.template /etc/nginx/conf.d/default.conf
nginx -t
exec nginx -g "daemon off;"
