#!/bin/bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
TMP_DIR=$(mktemp -d)
trap 'rm -rf "${TMP_DIR}"' EXIT

WORKFLOWS_DIR="${TMP_DIR}/workflows"
MANIFEST_FILE="${TMP_DIR}/github_action_versions.yaml"

mkdir -p "${WORKFLOWS_DIR}"

cat > "${WORKFLOWS_DIR}/workflow.yaml" <<'EOF'
jobs:
  test:
    steps:
      - uses: actions/checkout@v4
      - uses: actions/github-script@v7.0.1
      - uses: astral-sh/setup-uv@v5
      - uses: DeloitteDigitalUK/github-release-copier@9451bf8602b8bbef9805366050e21bb679ee95a5
EOF

cat > "${WORKFLOWS_DIR}/workflow.yml" <<'EOF'
jobs:
  notify:
    steps:
      - uses: slackapi/slack-github-action@v1.27.0
      - uses: actions/setup-go@v4
EOF

cat > "${MANIFEST_FILE}" <<'EOF'
actions:
  - name: actions/checkout
    version: v6
  - name: actions/github-script
    version: v8
  - name: actions/setup-go
    version: v6
  - name: astral-sh/setup-uv
    version: v8.0.0
  - name: slackapi/slack-github-action
    version: v3
EOF

WORKFLOW_DIR="${WORKFLOWS_DIR}" ACTIONS_FILE="${MANIFEST_FILE}" bash "${SCRIPT_DIR}/update_github_actions.sh" >/dev/null

grep -F -q 'actions/checkout@v6' "${WORKFLOWS_DIR}/workflow.yaml"
grep -F -q 'actions/github-script@v8' "${WORKFLOWS_DIR}/workflow.yaml"
grep -F -q 'astral-sh/setup-uv@v8.0.0' "${WORKFLOWS_DIR}/workflow.yaml"
grep -F -q 'slackapi/slack-github-action@v3' "${WORKFLOWS_DIR}/workflow.yml"
grep -F -q 'actions/setup-go@v6' "${WORKFLOWS_DIR}/workflow.yml"

if grep -F -q 'actions/github-script@v8.0.1' "${WORKFLOWS_DIR}/workflow.yaml"; then
    echo "github-script version replacement left a stale suffix"
    exit 1
fi

grep -F -q 'DeloitteDigitalUK/github-release-copier@9451bf8602b8bbef9805366050e21bb679ee95a5' "${WORKFLOWS_DIR}/workflow.yaml"

echo "update_github_actions.sh test passed"#!/bin/bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
TMP_DIR=$(mktemp -d)
trap 'rm -rf "${TMP_DIR}"' EXIT

WORKFLOWS_DIR="${TMP_DIR}/workflows"
MANIFEST_FILE="${TMP_DIR}/github_action_versions.yaml"

mkdir -p "${WORKFLOWS_DIR}"

cat > "${WORKFLOWS_DIR}/workflow.yaml" <<'EOF'
jobs:
  test:
    steps:
      - uses: actions/checkout@v4
      - uses: actions/github-script@v7.0.1
      - uses: astral-sh/setup-uv@v5
      - uses: DeloitteDigitalUK/github-release-copier@9451bf8602b8bbef9805366050e21bb679ee95a5
EOF

cat > "${WORKFLOWS_DIR}/workflow.yml" <<'EOF'
jobs:
  notify:
    steps:
      - uses: slackapi/slack-github-action@v1.27.0
      - uses: actions/setup-go@v4
EOF

cat > "${MANIFEST_FILE}" <<'EOF'
actions:
  - name: actions/checkout
    version: v6
  - name: actions/github-script
    version: v8
  - name: actions/setup-go
    version: v6
  - name: astral-sh/setup-uv
    version: v8
  - name: slackapi/slack-github-action
    version: v3
EOF

WORKFLOW_DIR="${WORKFLOWS_DIR}" ACTIONS_FILE="${MANIFEST_FILE}" bash "${SCRIPT_DIR}/update_github_actions.sh" >/dev/null

grep -F -q 'actions/checkout@v6' "${WORKFLOWS_DIR}/workflow.yaml"
grep -F -q 'actions/github-script@v8' "${WORKFLOWS_DIR}/workflow.yaml"
grep -F -q 'astral-sh/setup-uv@v8' "${WORKFLOWS_DIR}/workflow.yaml"
grep -F -q 'slackapi/slack-github-action@v3' "${WORKFLOWS_DIR}/workflow.yml"
grep -F -q 'actions/setup-go@v6' "${WORKFLOWS_DIR}/workflow.yml"

if grep -F -q 'actions/github-script@v8.0.1' "${WORKFLOWS_DIR}/workflow.yaml"; then
    echo "github-script version replacement left a stale suffix"
    exit 1
fi

grep -F -q 'DeloitteDigitalUK/github-release-copier@9451bf8602b8bbef9805366050e21bb679ee95a5' "${WORKFLOWS_DIR}/workflow.yaml"

echo "update_github_actions.sh test passed"
