import sys
import os
import json
import unittest
from unittest.mock import patch, MagicMock

# Add .github to sys.path to import generate_matrix
sys.path.append(os.path.dirname(__file__))
import generate_matrix

class TestGenerateMatrix(unittest.TestCase):

    def test_desktop_matrix_tag(self):
        """Test desktop matrix generation for tags (build all)."""
        vars_json = {}
        matrix = generate_matrix.generate_desktop_matrix(vars_json, is_tag=True)
        self.assertEqual(len(matrix), 3)
        self.assertEqual(matrix[0]["platform"], "win")
        self.assertEqual(matrix[1]["platform"], "mac")
        self.assertEqual(matrix[2]["platform"], "linux")

    def test_desktop_matrix_changed(self):
        """Test desktop matrix generation when desktop files changed (build linux only)."""
        vars_json = {"desktopComponents": 1}
        matrix = generate_matrix.generate_desktop_matrix(vars_json, is_tag=False)
        self.assertEqual(len(matrix), 1)
        self.assertEqual(matrix[0]["platform"], "linux")

    def test_desktop_matrix_none(self):
        """Test desktop matrix when nothing changed."""
        vars_json = {"desktopComponents": 0}
        matrix = generate_matrix.generate_desktop_matrix(vars_json, is_tag=False)
        self.assertEqual(len(matrix), 0)

    def test_docker_matrix_repo_owner_case(self):
        """Test that repo owner is lowercased in build args."""
        vars_json = {"backendComponents": 1}
        # Repo owner "DeloitteDigitalUK" should become "deloittedigitaluk"
        matrix = generate_matrix.generate_docker_matrix(vars_json, is_tag=False, repo_owner="DeloitteDigitalUK")
        
        self.assertEqual(len(matrix), 1)
        self.assertEqual(matrix[0]["name"], "api")
        self.assertIn("ghcr.io/deloittedigitaluk/", matrix[0]["buildArgs"])

    def test_docker_matrix_backend_change(self):
        """Test backend change triggers api image."""
        vars_json = {"backendComponents": 1}
        matrix = generate_matrix.generate_docker_matrix(vars_json, is_tag=False, repo_owner="owner")
        self.assertEqual(len(matrix), 1)
        self.assertEqual(matrix[0]["name"], "api")

    def test_docker_matrix_ui_change(self):
        """Test ui change triggers ui image."""
        vars_json = {"uiComponents": 1}
        matrix = generate_matrix.generate_docker_matrix(vars_json, is_tag=False, repo_owner="owner")
        self.assertEqual(len(matrix), 1)
        self.assertEqual(matrix[0]["name"], "ui")
        self.assertEqual(matrix[0]["cacheMode"], "min")

    def test_docker_matrix_docker_change_triggers_all(self):
        """Test dockerComponents change triggers all images."""
        vars_json = {"dockerComponents": 1}
        matrix = generate_matrix.generate_docker_matrix(vars_json, is_tag=False, repo_owner="owner")
        
        # Expect api, ui, mocks, promosite, ml, docs. Jenkins is conditional on examples or docker_jenkins.
        # Check should_build logic for jenkins: if should_build("jenkins") -> true if dockerComponents=1.
        # Checks: backend, ui, mocks, jenkins, promosite, machinelearning, docs.
        # Total should be 7.
        names = [m["name"] for m in matrix]
        self.assertIn("api", names)
        self.assertIn("ui", names)
        self.assertIn("mocks", names)
        self.assertIn("jenkins", names)
        self.assertIn("promosite", names)
        self.assertIn("machinelearning", names)
        self.assertIn("docs", names)
        self.assertEqual(len(matrix), 7)

    def test_docker_matrix_jenkins_triggers(self):
        """Test specific jenkins triggers."""
        # 1. docker_jenkinsComponents
        vars_json = {"docker_jenkinsComponents": 1}
        matrix = generate_matrix.generate_docker_matrix(vars_json, is_tag=False, repo_owner="owner")
        names = [m["name"] for m in matrix]
        self.assertIn("jenkins", names)

        # 2. examplesComponents
        vars_json = {"examplesComponents": 1}
        matrix = generate_matrix.generate_docker_matrix(vars_json, is_tag=False, repo_owner="owner")
        names = [m["name"] for m in matrix]
        self.assertIn("jenkins", names)

    def test_docker_matrix_kill_switch(self):
        """Test global kill switch for docker builds."""
        # Even if backend changes, kill switch should prevent build
        vars_json = {"backendComponents": 1, "run_docker_buildsComponents": 0}
        matrix = generate_matrix.generate_docker_matrix(vars_json, is_tag=False, repo_owner="owner")
        self.assertEqual(len(matrix), 0)

        # Confirm 1 works (or absence works)
        vars_json = {"backendComponents": 1, "run_docker_buildsComponents": 1}
        matrix = generate_matrix.generate_docker_matrix(vars_json, is_tag=False, repo_owner="owner")
        self.assertEqual(len(matrix), 1)

    def test_docker_matrix_kill_switch_jenkins(self):
        """Test global kill switch specifically for Jenkins leak."""
        # Jenkins usually runs if examplesComponents OR docker_jenkinsComponents is 1.
        # Ensure kill switch stops it.
        
        # Scenario 1: examples triggered
        vars_json = {"examplesComponents": 1, "run_docker_buildsComponents": 0}
        matrix = generate_matrix.generate_docker_matrix(vars_json, is_tag=False, repo_owner="owner")
        self.assertEqual(len(matrix), 0)

        # Scenario 2: docker_jenkins triggers
        vars_json = {"docker_jenkinsComponents": 1, "run_docker_buildsComponents": 0}
        matrix = generate_matrix.generate_docker_matrix(vars_json, is_tag=False, repo_owner="owner")
        self.assertEqual(len(matrix), 0)

    def test_main_cli_docker(self):
        """Test the main entry point for docker type."""
        vars_input = json.dumps({"uiComponents": 1})
        with patch.dict(os.environ, {"GITHUB_REF": "refs/heads/main", "GITHUB_REPOSITORY_OWNER": "TestOwner"}), \
             patch("sys.stdout", new_callable=MagicMock) as mock_stdout, \
             patch("sys.argv", ["script", "--type", "docker", "--vars", vars_input]):
            
            generate_matrix.main()
            
            # Check output
            output = "".join(call.args[0] for call in mock_stdout.write.call_args_list)
            data = json.loads(output)
            self.assertEqual(len(data), 1)
            self.assertEqual(data[0]["name"], "ui")

if __name__ == "__main__":
    unittest.main()
