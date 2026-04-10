#!/usr/bin/env python3

import argparse
import json
import re
from pathlib import Path
from typing import Any


SEMVER_RE = re.compile(r"(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)")


def extract_semver(value: str | None) -> str | None:
    if not value:
        return None
    match = SEMVER_RE.search(value)
    return match.group(1) if match else None


def strip_trailing_commas(text: str) -> str:
    result: list[str] = []
    in_string = False
    escape = False
    index = 0

    while index < len(text):
        char = text[index]

        if in_string:
            result.append(char)
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            index += 1
            continue

        if char == '"':
            in_string = True
            result.append(char)
            index += 1
            continue

        if char == ",":
            lookahead = index + 1
            while lookahead < len(text) and text[lookahead] in " \t\r\n":
                lookahead += 1
            if lookahead < len(text) and text[lookahead] in "]}":
                index += 1
                continue

        result.append(char)
        index += 1

    return "".join(result)


def load_json(path: str) -> Any:
    text = Path(path).read_text(encoding="utf-8")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return json.loads(strip_trailing_commas(text))


def get_declared_playwright_version(package_json: dict[str, Any], bun_lock: dict[str, Any]) -> str | None:
    for section in ("devDependencies", "dependencies"):
        version = extract_semver(package_json.get(section, {}).get("@playwright/test"))
        if version:
            return version

    workspace = bun_lock.get("workspaces", {}).get("", {})
    for section in ("devDependencies", "dependencies"):
        version = extract_semver(workspace.get(section, {}).get("@playwright/test"))
        if version:
            return version

    return None


def get_resolved_playwright_version(bun_lock: dict[str, Any]) -> str | None:
    packages = bun_lock.get("packages", {})

    direct_entry = packages.get("@playwright/test")
    if isinstance(direct_entry, list) and direct_entry:
        version = extract_semver(direct_entry[0])
        if version:
            return version

    for package_key, package_value in packages.items():
        if package_key.startswith("@playwright/test@"):
            version = extract_semver(package_key)
            if version:
                return version

        if isinstance(package_value, list) and package_value:
            nested_name = package_value[0]
            if isinstance(nested_name, str) and nested_name.startswith("@playwright/test@"):
                version = extract_semver(nested_name)
                if version:
                    return version

    return None


def resolve_playwright_version(package_json: dict[str, Any], bun_lock: dict[str, Any]) -> str:
    version = get_resolved_playwright_version(bun_lock)
    if version:
        return version

    version = get_declared_playwright_version(package_json, bun_lock)
    if version:
        return version

    raise ValueError("Could not determine @playwright/test version from frontend/package.json or frontend/bun.lock")


def build_playwright_image(version: str) -> str:
    return f"mcr.microsoft.com/playwright:v{version}-noble"


def main() -> None:
    parser = argparse.ArgumentParser(description="Resolve the Playwright container image from frontend dependency metadata.")
    parser.add_argument("package_json", help="Path to frontend/package.json")
    parser.add_argument("bun_lock", help="Path to frontend/bun.lock")
    parser.add_argument(
        "--field",
        choices=("version", "image", "json"),
        default="image",
        help="Choose whether to print the resolved version, image, or both as JSON.",
    )
    args = parser.parse_args()

    package_json = load_json(args.package_json)
    bun_lock = load_json(args.bun_lock)

    version = resolve_playwright_version(package_json, bun_lock)
    image = build_playwright_image(version)

    if args.field == "version":
        print(version)
    elif args.field == "json":
        print(json.dumps({"version": version, "image": image}))
    else:
        print(image)


if __name__ == "__main__":
    main()
