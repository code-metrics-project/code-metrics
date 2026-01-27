#!/usr/bin/env python3
"""
Change detection script for GitHub Actions CI/CD.

REQUIREMENTS:
- Git checkout step must use 'fetch-depth: 0' to fetch full history
- This script compares the current branch against 'origin/main'
"""

import json, os, subprocess, argparse, sys
from typing import Dict, List

# ---- Config ----
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "change_detection_config.json")

def load_config():
    with open(CONFIG_FILE, "r") as f:
        return json.load(f)

config = load_config()
SERVICE_DIRS = config.get("service_dirs", {})
FOLD_RULES = config.get("fold_rules", {})

EMIT_SOURCES = False  # if False, sources that only serve folding (e.g. 'mocks') aren't emitted

# ---- Helpers ----
def sh(*args: str, check=True) -> subprocess.CompletedProcess:
    return subprocess.run(args, text=True, capture_output=True, check=check)

def git_base_ref() -> str:
    """
    Returns the base ref to compare against.
    Prioritizes GITHUB_BASE_REF (PR target) if available.
    Falls back to origin/main, then main, then master.
    """
    # 1. Try GITHUB_BASE_REF (PR target)
    # GITHUB_BASE_REF is just the branch name (e.g. "main"), so we prepend "origin/"
    base_ref = os.getenv("GITHUB_BASE_REF")
    if base_ref:
        candidate = f"origin/{base_ref}"
        result = sh("git", "rev-parse", "--verify", candidate, check=False)
        if result.returncode == 0:
            return candidate
        # If origin/base_ref doesn't fail, try local
        result = sh("git", "rev-parse", "--verify", base_ref, check=False)
        if result.returncode == 0:
            return base_ref

    # 2. Fallback to origin/main
    result = sh("git", "rev-parse", "--verify", "origin/main", check=False)
    if result.returncode == 0:
        return "origin/main"

    # 3. Fallback to main
    result = sh("git", "rev-parse", "--verify", "main", check=False)
    if result.returncode == 0:
        return "main"

    # Fallback to master
    result = sh("git", "rev-parse", "--verify", "master", check=False)
    if result.returncode == 0:
        return "master"

    # If nothing works, use first commit (shouldn't happen with fetch-depth: 0)
    print('WARNING: could not find base branch - falling back to first commit')
    return sh("git", "rev-list", "--max-parents=0", "HEAD").stdout.strip().splitlines()[-1]

def dir_changed(base_ref: str, paths: List[str]) -> int:
    # 0 = no changes, 1 = changed
    # We pass paths directly to git diff. 
    # Use -- to separate paths.
    cmd = ["git", "diff", "--quiet", f"{base_ref}...HEAD", "--"] + paths
    cp = subprocess.run(cmd)
    return 0 if cp.returncode == 0 else 1

def norm(key: str) -> str:
    return key[1:] if key.startswith(".") else key

# ---- Compute ----

def parse_set_args(argv=None):
    parser = argparse.ArgumentParser(description="Set override values for components.")
    parser.add_argument('--set', action='append', default=[], metavar='KEY=VALUE',
                        help='Override a component value, e.g. --set helm=true')
    parser.add_argument('--all', action='store_true',
                        help='Set all components to true')
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
    return overrides, args.verbose, args.all

def main(argv=None) -> None:
    overrides, verbose, all_components = parse_set_args(argv)
    base = git_base_ref()

    # Build the set of "sources" to examine (using normalized names)
    sources = set()
    for d in SERVICE_DIRS.keys():
        sources.add(norm(d))
    for src in FOLD_RULES.keys():
        sources.add(norm(src))

    # Raw changes per normalized key
    values: Dict[str, int] = {}
    
    # Map normalized names back to their path lists
    norm_to_paths = {}
    for k, paths in SERVICE_DIRS.items():
        norm_to_paths[norm(k)] = paths

    for normalized in sorted(sources):
        paths = norm_to_paths.get(normalized)
        if paths:
            values[normalized] = dir_changed(base, paths)
        else:
            # Source might be only in FOLD_RULES (e.g. if we had logical groups not in SERVICE_DIRS)
            values[normalized] = 0

    # Apply folding rules (OR logic)
    emit_keys = {norm(d) for d in SERVICE_DIRS.keys()}  # always emit these
    fold_sources = set()
    for src, dests in FOLD_RULES.items():
        src_normalized = norm(src)
        fold_sources.add(src_normalized)
        src_val = values.get(src_normalized, 0)
        for dest in dests:
            dest_normalized = norm(dest)
            emit_keys.add(dest_normalized)
            if src_val == 1:
                values[dest_normalized] = 1 if values.get(dest_normalized, 0) == 1 else 1  # OR

    # Only remove fold sources that are NOT service directories
    if not EMIT_SOURCES:
        service_dirs_normalized = {norm(d) for d in SERVICE_DIRS.keys()}
        fold_sources_only = fold_sources - service_dirs_normalized
        emit_keys -= fold_sources_only

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

    # Apply --all flag to set all components to true
    if all_components:
        for d in SERVICE_DIRS.keys():
            out[f"{norm(d)}Components"] = 1

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
