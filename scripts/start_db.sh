#!/usr/bin/env bash

cd "$( git rev-parse --show-toplevel )"

if [[ "clean" == "$1" ]]; then
  echo "Removing existing DB..."
  docker compose -f compose/docker-compose.yaml --project-directory . down
  docker volume rm code-metrics_metrics-mongo
fi

set -e
docker compose -f compose/docker-compose.yaml --project-directory . up db