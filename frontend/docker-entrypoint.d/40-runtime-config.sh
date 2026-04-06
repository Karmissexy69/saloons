#!/bin/sh
set -eu

cat <<EOF >/usr/share/nginx/html/app-config.js
window.__APP_CONFIG__ = {
  API_BASE_URL: "${API_BASE_URL}"
};
EOF
