#!/usr/bin/env python3
import os
import json
import argparse
import sys

def get_bool_var(vars_json, key):
    val = vars_json.get(key, 0)
    return str(val) == "1" or val is True

def generate_docker_matrix(vars_json, is_tag, repo_owner):
    matrix = []
    
    # Helper to check if a component should build
    def should_build(component):
        if is_tag: return True
        if get_bool_var(vars_json, f"{component}Components"): return True
        if get_bool_var(vars_json, "dockerComponents"): return True
        if get_bool_var(vars_json, f"docker_{component}Components"): return True
        return False

    repo_url = f"ghcr.io/{repo_owner.lower()}/"

    # 1. API (backend)
    if should_build("backend"):
        matrix.append({
            "name": "api",
            "context": "./backend",
            "file": "docker/Dockerfile.backend",
            "imageName": "code-metrics-api",
            "buildArgs": f"RELEASE_TASK=release\nIMGREPO={repo_url}",
            "cacheMode": "max"
        })

    # 2. UI
    if should_build("ui"):
        matrix.append({
            "name": "ui",
            "context": "./ui",
            "file": "docker/Dockerfile.ui",
            "imageName": "code-metrics-ui",
            "buildArgs": f"IMGREPO={repo_url}",
            "cacheMode": "min"
        })

    # 3. Mocks
    if should_build("mocks"):
        matrix.append({
            "name": "mocks",
            "context": "./mocks",
            "file": "docker/Dockerfile.mocks",
            "imageName": "code-metrics-mocks",
            "buildArgs": f"IMGREPO={repo_url}",
            "cacheMode": "max"
        })

    # 4. Jenkins
    # Logic: examplesComponents OR docker_jenkinsComponents
    # should_build("jenkins") covers "docker_jenkinsComponents"
    # We also explicitly check examplesComponents
    if should_build("jenkins") or get_bool_var(vars_json, "examplesComponents"):
        matrix.append({
            "name": "jenkins",
            "context": "./examples/jenkins",
            "file": "docker/Dockerfile.jenkins",
            "imageName": "demo-jenkins",
            "buildArgs": f"IMGREPO={repo_url}",
            "cacheMode": "max",
            "isJenkins": True
        })

    # 5. Promosite
    if should_build("promosite"):
        matrix.append({
            "name": "promosite",
            "context": ".",
            "file": "docker/Dockerfile.promosite",
            "imageName": "code-metrics-promosite",
            "buildArgs": f"IMGREPO={repo_url}",
            "cacheMode": "none"
        })

    # 6. Machine Learning
    if should_build("machinelearning"):
        matrix.append({
            "name": "machinelearning",
            "context": "./machinelearning",
            "file": "docker/Dockerfile.machinelearning",
            "imageName": "code-metrics-machinelearning",
            "buildArgs": f"IMGREPO={repo_url}",
            "cacheMode": "none"
        })

    # 7. Docs
    if should_build("docs"):
        matrix.append({
            "name": "docs",
            "context": ".",
            "file": "docker/Dockerfile.docs",
            "imageName": "code-metrics-docs",
            "buildArgs": f"DOCSDIR=docs\nIMGREPO={repo_url}",
            "cacheMode": "none"
        })

    return matrix

def generate_desktop_matrix(vars_json, is_tag):
    if is_tag:
        return [
            {"os":"windows-latest","platform":"win","buildScript":"dist:win"},
            {"os":"macos-latest","platform":"mac","buildScript":"dist:mac"},
            {"os":"ubuntu-latest","platform":"linux","buildScript":"dist:linux"}
        ]
    elif get_bool_var(vars_json, "desktopComponents"):
        return [
            {"os":"ubuntu-latest","platform":"linux","buildScript":"dist:linux"}
        ]
    return []

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--vars", required=True, help="Input vars JSON")
    parser.add_argument("--type", required=True, choices=["docker", "desktop"])
    args = parser.parse_args()

    try:
        vars_json = json.loads(args.vars)
    except json.JSONDecodeError:
        print("Error: Invalid JSON passed to --vars", file=sys.stderr)
        sys.exit(1)

    # Context
    is_tag = os.environ.get("GITHUB_REF", "").startswith("refs/tags/")
    repo_owner = os.environ.get("GITHUB_REPOSITORY_OWNER", "")

    if args.type == "docker":
        matrix = generate_docker_matrix(vars_json, is_tag, repo_owner)
    else:
        matrix = generate_desktop_matrix(vars_json, is_tag)

    # Output just the matrix JSON
    print(json.dumps(matrix))

if __name__ == "__main__":
    main()
