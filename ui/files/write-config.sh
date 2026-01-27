cat > /usr/share/nginx/html/config.json <<EOF
{
  "apiBaseUrl": "${API_BASE_URL}",
  "auth": {
    "required": true
  }
}
EOF
