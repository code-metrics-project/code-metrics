#!/usr/bin/env python3

import json, os, subprocess, argparse, sys
from typing import Dict, List

# ---- Config ----
SERVICE_DIRS: List[str] = [
    ".github",
    "backend",
    "desktop",
    "docker",
    "examples",
    "helm",
    "machinelearning",
    "mocks",
    "threatmodel",
    "ui"
]
FOLD_RULES: List[str] = [
    # if .github changes, trigger many components
    "github:docker:machinelearning:backend:ui:helm:threatmodel:examples:desktop",
    
    # if backend changes, trigger docker and mocks
    "backend:docker:mocks",

    # if mocks changes, trigger backend
    "mocks:backend",

    # if ui, mocks, or examples changes, trigger docker
    "ui:docker",
    "mocks:docker",
    "examples:docker",

    # Add more rules as needed, e.g.:
    # "someSource:backend:somethingElse",
]
EMIT_SOURCES = False  # if False, sources that only serve folding (e.g. 'mocks') aren’t emitted

# ---- Helpers ----
def sh(*args: str, check=True) -> subprocess.CompletedProcess:
    return subprocess.run(args, text=True, capture_output=True, check=check)

def git_base_ref() -> str:
    try:
        return sh("git", "describe", "--tags", "--abbrev=0").stdout.strip()
    except subprocess.CalledProcessError:
        return sh("git", "rev-list", "--max-parents=0", "HEAD").stdout.strip().splitlines()[-1]

def dir_changed(base_ref: str, path: str) -> int:
    # 0 = no changes, 1 = changed
    cp = subprocess.run(["git", "diff", "--quiet", f"{base_ref}...HEAD", f":(top,literal){path}"])
    return 0 if cp.returncode == 0 else 1

def norm(key: str) -> str:
    return key[1:] if key.startswith(".") else key

# ---- Compute ----

def parse_set_args(argv=None):
    parser = argparse.ArgumentParser(description="Set override values for components.")
    parser.add_argument('--set', action='append', default=[], metavar='KEY=VALUE',
                        help='Override a component value, e.g. --set helm=true')
    parser.add_argument('--verbose', action='store_true', help='Print output JSON to stdout')
    args, _ = parser.parse_known_args(argv)
    overrides = {}
    for item in args.set:
        if '=' not in item:
            print(f"Invalid --set argument: {item}", file=sys.stderr)
            continue
        key, value = item.split('=', 1)
        key = key.strip()
        value = value.strip().lower()
        if value in ('1', 'true', 'yes', 'on'):
            overrides[key] = 1
        elif value in ('0', 'false', 'no', 'off'):
            overrides[key] = 0
        else:
            try:
                overrides[key] = int(value)
            except Exception:
                print(f"Invalid value for --set {key}: {value}", file=sys.stderr)
    return overrides, args.verbose

def main(argv=None) -> None:
    overrides, verbose = parse_set_args(argv)
    base = git_base_ref()

    # Build mapping from normalized names to actual directory paths
    norm_to_dir = {}
    for d in SERVICE_DIRS:
        norm_to_dir[norm(d)] = d

    # Build the set of "sources" to examine (using normalized names)
    sources = set()
    for d in SERVICE_DIRS:
        sources.add(norm(d))
    for rule in FOLD_RULES:
        src = norm(rule.split(":")[0])
        sources.add(src)

    # Raw changes per normalized key
    values: Dict[str, int] = {}
    for normalized in sorted(sources):
        # Use the actual directory path if it exists, otherwise use normalized name
        actual_path = norm_to_dir.get(normalized, normalized)
        values[normalized] = dir_changed(base, actual_path)

    # Apply folding rules (OR logic)
    emit_keys = {norm(d) for d in SERVICE_DIRS}         # always emit these
    fold_sources = set()
    for rule in FOLD_RULES:
        parts = rule.split(":")
        src, dests = norm(parts[0]), [norm(p) for p in parts[1:]]
        fold_sources.add(src)
        src_val = values.get(src, 0)
        for dest in dests:
            emit_keys.add(dest)
            if src_val == 1:
                values[dest] = 1 if values.get(dest, 0) == 1 else 1  # OR

    if not EMIT_SOURCES:
        emit_keys -= fold_sources

    # Release vars
    ref = os.getenv("GITHUB_REF", "")
    ref_name = os.getenv("GITHUB_REF_NAME", "")
    if ref.startswith("refs/tags/"):
        tag, push, coverage = (ref_name or "unknown"), True, 90
    else:
        tag, push, coverage = "dev", False, 1

    # Build single JSON output
    out = {"tag": tag, "push": push, "coverageRetention": coverage}
    for k in sorted(emit_keys):
        out[f"{k}Components"] = int(values.get(k, 0))

    # Apply overrides from --set
    for k, v in overrides.items():
        out[f"{k}Components"] = int(v)

    if verbose:
        print(json.dumps(out, indent=2, sort_keys=True))

    out_path = os.environ.get("GITHUB_OUTPUT")
    if not out_path:
        raise RuntimeError("GITHUB_OUTPUT not set")
    with open(out_path, "a", encoding="utf-8") as fh:
        fh.write("vars=" + json.dumps(out, separators=(",", ":")) + "\n")

if __name__ == "__main__":
    main()
