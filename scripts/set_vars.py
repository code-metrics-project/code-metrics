#!/usr/bin/env python3
import json, os, subprocess
from typing import Dict, List

# ---- Config ----
SERVICE_DIRS: List[str] = [
    ".github", "machinelearning", "helm", "ui", "backend", "threatmodel", "examples", "mocks", "desktop"
]
FOLD_RULES: List[str] = [
    "mocks:backend",            # example: if mocks changes, OR into backend
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
def main() -> None:
    base = git_base_ref()

    # Build the set of "sources" to examine: all service dirs + every lhs in FOLD_RULES
    sources = set(SERVICE_DIRS)
    for rule in FOLD_RULES:
        src = rule.split(":")[0]
        sources.add(src)

    # Raw changes per normalized key
    values: Dict[str, int] = {}
    for d in sorted(sources):
        values[norm(d)] = dir_changed(base, d)

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

    out_path = os.environ.get("GITHUB_OUTPUT")
    if not out_path:
        raise RuntimeError("GITHUB_OUTPUT not set")
    with open(out_path, "a", encoding="utf-8") as fh:
        fh.write("vars=" + json.dumps(out, separators=(",", ":")) + "\n")

if __name__ == "__main__":
    main()
