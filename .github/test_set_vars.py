import sys
import os
import json
import unittest
from unittest.mock import patch, MagicMock

# Add .github to sys.path to import set_vars
sys.path.append(os.path.dirname(__file__))
import set_vars

class TestSetVars(unittest.TestCase):
    
    def setUp(self):
        # Env vars patcher
        self.env_patcher = patch.dict(os.environ, {
            "GITHUB_OUTPUT": "dummy_output", 
            "GITHUB_REF": "refs/heads/feature", 
            "GITHUB_REF_NAME": "feature"
        })
        self.env_patcher.start()
        
        # Git patchers
        self.base_patcher = patch('set_vars.git_base_ref', return_value="origin/main")
        self.mock_base = self.base_patcher.start()
        
        self.changed_patcher = patch('set_vars.dir_changed')
        self.mock_changed = self.changed_patcher.start()

        # Config patcher
        self.test_config = {
            "service_dirs": {
                "auth": ["backend/src/auth"],
                "backend": ["backend", ":!backend/.dockerignore"],
                "ui": ["ui", ":!ui/.dockerignore"],
                "docker_backend": ["docker/Dockerfile.backend", "backend/.dockerignore"],
                ".github": [".github"]
            },
            "fold_rules": {
                ".github": ["auth", "backend", "docker_backend"],
                "backend": ["ui"] # simplified for testing
            }
        }
        # Patch the module-level config variables directly
        self.config_service_dirs_patcher = patch.object(set_vars, 'SERVICE_DIRS', self.test_config["service_dirs"])
        self.config_fold_rules_patcher = patch.object(set_vars, 'FOLD_RULES', self.test_config["fold_rules"])
        self.config_service_dirs_patcher.start()
        self.config_fold_rules_patcher.start()
        
    def tearDown(self):
        self.env_patcher.stop()
        self.base_patcher.stop()
        self.changed_patcher.stop()
        self.config_service_dirs_patcher.stop()
        self.config_fold_rules_patcher.stop()

    def test_service_dirs_mapping(self):
        """Verify that 'auth' is present in configuration."""
        self.assertIn("auth", set_vars.SERVICE_DIRS)
        self.assertIn("auth", set_vars.FOLD_RULES[".github"])

    def test_auth_only_changed(self):
        """
        Test case: Only backend/src/auth changes.
        Should trigger authComponents=1.
        """
        def side_effect(base, paths):
            # paths is a list of strings
            if "backend/src/auth" in paths:
                return 1
            return 0
        self.mock_changed.side_effect = side_effect

        with patch("builtins.open", new_callable=MagicMock) as mock_file:
            set_vars.main([])
            
            handle = mock_file.return_value.__enter__.return_value
            write_call = handle.write.call_args[0][0]
            self.assertIn("vars=", write_call)
            json_str = write_call.replace("vars=", "").strip()
            data = json.loads(json_str)
            
            self.assertEqual(data.get("authComponents"), 1)
            # auth is a subset of backend logic usually, but here we test explicit triggers
            # defined in our mock config. In real config auth is separate from backend.
            
    def test_backend_changed_but_not_auth(self):
        """
        Test case: backend changes.
        """
        def side_effect(base, paths):
            if "backend" in paths:
                return 1
            return 0
        self.mock_changed.side_effect = side_effect

        with patch("builtins.open", new_callable=MagicMock) as mock_file:
            set_vars.main([])
            
            handle = mock_file.return_value.__enter__.return_value
            write_call = handle.write.call_args[0][0]
            json_str = write_call.replace("vars=", "").strip()
            data = json.loads(json_str)
            
            self.assertEqual(data.get("backendComponents"), 1)
            self.assertEqual(data.get("authComponents"), 0)

    def test_granular_docker_triggers(self):
        """
        Test case: Only docker/Dockerfile.backend changes.
        Should trigger docker_backendComponents, but NOT backendComponents (code).
        """
        def side_effect(base, paths):
            # Check if strictly "docker/Dockerfile.backend" is in the allowed paths for this query
            if "docker/Dockerfile.backend" in paths:
                return 1
            return 0
        self.mock_changed.side_effect = side_effect

        with patch("builtins.open", new_callable=MagicMock) as mock_file:
            set_vars.main([])
            
            handle = mock_file.return_value.__enter__.return_value
            write_call = handle.write.call_args[0][0]
            json_str = write_call.replace("vars=", "").strip()
            data = json.loads(json_str)
            
            self.assertEqual(data.get("docker_backendComponents"), 1)
            self.assertEqual(data.get("backendComponents"), 0)

    def test_dockerignore_exclusion(self):
        """
        Test case: backend/.dockerignore changes.
        Should trigger docker_backendComponents, but NOT backendComponents.
        """
        def side_effect(base, paths):
            # In our mock config:
            # backend: ["backend", ":!backend/.dockerignore"]
            # docker_backend: ["docker/Dockerfile.backend", "backend/.dockerignore"]
            
            # If set_vars asks for 'backend', it sends ["backend", ":!backend/.dockerignore"].
            # If the underlying git diff (mocked) says "yes changes" only if we ask for .dockerignore...
            
            # This is tricky to mock simply because 'dir_changed' delegates to git.
            # We simulate the git behavior:
            # If list contains ":!backend/.dockerignore", it EXCLUDES it.
            # If list contains "backend/.dockerignore", it INCLUDES it.
            
            # Scenario: only .dockerignore changed.
            has_explicit_include = "backend/.dockerignore" in paths
            
            # If we exclude it, we shouldn't see a change (assuming only .dockerignore changed)
            has_exclude = ":!backend/.dockerignore" in paths
            if has_exclude:
                return 0
            
            if has_explicit_include:
                return 1
                
            return 0
            
        self.mock_changed.side_effect = side_effect

        with patch("builtins.open", new_callable=MagicMock) as mock_file:
            set_vars.main([])
            json_str = mock_file.return_value.__enter__.return_value.write.call_args[0][0].replace("vars=", "").strip()
            data = json.loads(json_str)
            
            self.assertEqual(data.get("docker_backendComponents"), 1)
            self.assertEqual(data.get("backendComponents"), 0)

    def test_github_base_ref_priority(self):
        """Verify GITHUB_BASE_REF is prioritized."""
        # Unpatch the mock so we can test the real function logic with subprocess mocks
        self.base_patcher.stop()
        
        with patch.dict(os.environ, {"GITHUB_BASE_REF": "release-1.0"}), \
             patch('set_vars.sh') as mock_sh:
             
            # 1. Candidate origin/release-1.0 succeeds
            mock_sh.side_effect = [
                MagicMock(returncode=0, stdout="origin/release-1.0"), # git rev-parse origin/release-1.0
            ]
            
            ref = set_vars.git_base_ref()
            self.assertEqual(ref, "origin/release-1.0")

            # 2. Candidate origin/release-1.0 fails, local release-1.0 succeeds
            mock_sh.reset_mock()
            mock_sh.side_effect = [
                MagicMock(returncode=1), # origin/release-1.0 fails
                MagicMock(returncode=0, stdout="release-1.0"), # local succeeds
            ]
            ref = set_vars.git_base_ref()
            self.assertEqual(ref, "release-1.0")

        # Re-start patcher for other tests
        self.mock_base = self.base_patcher.start()

    def test_github_folder_triggers_all(self):
        """
        Test case: .github changes.
        Should trigger everything in fold rules.
        """
        def side_effect(base, paths):
            if ".github" in paths:
                return 1
            return 0
        self.mock_changed.side_effect = side_effect

        with patch("builtins.open", new_callable=MagicMock) as mock_file:
            set_vars.main([])
            
            handle = mock_file.return_value.__enter__.return_value
            write_call = handle.write.call_args[0][0]
            json_str = write_call.replace("vars=", "").strip()
            data = json.loads(json_str)
            
            self.assertEqual(data.get("authComponents"), 1)
            self.assertEqual(data.get("backendComponents"), 1)
            self.assertEqual(data.get("docker_backendComponents"), 1)

    def test_overrides(self):
        """Verify --set override works for auth."""
        self.mock_changed.return_value = 0 # No changes by default

        with patch("builtins.open", new_callable=MagicMock) as mock_file:
            # Override auth to true
            set_vars.main(["--set", "auth=true"])
            
            handle = mock_file.return_value.__enter__.return_value
            write_call = handle.write.call_args[0][0]
            data = json.loads(write_call.replace("vars=", "").strip())
            
            self.assertEqual(data.get("authComponents"), 1)
            self.assertEqual(data.get("backendComponents"), 0)

    def test_all_flag(self):
        """Verify --all flag sets all components to 1."""
        self.mock_changed.return_value = 0 # No changes by default

        with patch("builtins.open", new_callable=MagicMock) as mock_file:
            set_vars.main(["--all"])
            
            handle = mock_file.return_value.__enter__.return_value
            write_call = handle.write.call_args[0][0]
            data = json.loads(write_call.replace("vars=", "").strip())
            
            # Verify every service directory has a corresponding component set to 1
            for service in self.test_config["service_dirs"]:
                key = f"{set_vars.norm(service)}Components"
                self.assertEqual(data.get(key), 1, f"Expected {key} to be 1")

if __name__ == "__main__":
    unittest.main()
