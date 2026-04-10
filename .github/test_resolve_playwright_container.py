import importlib.util
import pathlib
import tempfile
import unittest


MODULE_PATH = pathlib.Path(__file__).with_name("resolve_playwright_container.py")
SPEC = importlib.util.spec_from_file_location("resolve_playwright_container", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Could not load resolver module from {MODULE_PATH}")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ResolvePlaywrightContainerTests(unittest.TestCase):
    def test_load_json_accepts_trailing_commas(self) -> None:
        with tempfile.NamedTemporaryFile("w+", encoding="utf-8") as handle:
            handle.write(
                '{\n'
                '  "workspaces": {\n'
                '    "": {\n'
                '      "devDependencies": {\n'
                '        "@playwright/test": "^1.58.2",\n'
                '      },\n'
                '    },\n'
                '  },\n'
                '  "packages": {\n'
                '    "@playwright/test@1.59.0": [\n'
                '      "@playwright/test@1.59.0",\n'
                '      "",\n'
                '      {},\n'
                '      "sha512-test",\n'
                '    ],\n'
                '  },\n'
                '}\n'
            )
            handle.flush()

            parsed = MODULE.load_json(handle.name)

        self.assertEqual(
            parsed["packages"]["@playwright/test@1.59.0"][0],
            "@playwright/test@1.59.0",
        )

    def test_prefers_resolved_bun_lock_version(self) -> None:
        package_json = {
            "devDependencies": {
                "@playwright/test": "^1.59.0",
            }
        }
        bun_lock = {
            "workspaces": {
                "": {
                    "devDependencies": {
                        "@playwright/test": "^1.58.2",
                    }
                }
            },
            "packages": {
                "@playwright/test@1.59.0": [
                    "@playwright/test@1.59.0",
                    "",
                    {},
                    "sha512-test",
                ]
            },
        }

        self.assertEqual(MODULE.resolve_playwright_version(package_json, bun_lock), "1.59.0")

    def test_supports_direct_packages_entry(self) -> None:
        package_json = {
            "devDependencies": {
                "@playwright/test": "^1.59.0",
            }
        }
        bun_lock = {
            "packages": {
                "@playwright/test": [
                    "@playwright/test@1.60.1",
                    "",
                    {},
                    "sha512-test",
                ]
            }
        }

        self.assertEqual(MODULE.resolve_playwright_version(package_json, bun_lock), "1.60.1")

    def test_falls_back_to_declared_package_json_version(self) -> None:
        package_json = {
            "devDependencies": {
                "@playwright/test": "^1.61.0",
            }
        }
        bun_lock = {
            "workspaces": {
                "": {
                    "devDependencies": {
                        "@playwright/test": "^1.58.2",
                    }
                }
            },
            "packages": {},
        }

        self.assertEqual(MODULE.resolve_playwright_version(package_json, bun_lock), "1.61.0")

    def test_builds_noble_image_tag(self) -> None:
        self.assertEqual(
            MODULE.build_playwright_image("1.59.0"),
            "mcr.microsoft.com/playwright:v1.59.0-noble",
        )


if __name__ == "__main__":
    unittest.main()
