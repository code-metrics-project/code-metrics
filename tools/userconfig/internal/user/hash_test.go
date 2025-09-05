package user

import (
	"encoding/json"
	"testing"
)

func TestBuildUserConfig_Admin(t *testing.T) {
	username := "admin"
	password := "admin"
	salt := "0c62b823eb5b9699ff48c1d0c93816d0"

	expectedJSON := `[
  {
    "name": "admin",
    "password": "1253509b718dbbeafa4e028afc9a5f667fe17881fdd222e31559ae452029c3a0fe24075565673a9d9ccfd4564bf1a2b9374243ee19b9846256a9b0e260ea0bc0",
    "salt": "0c62b823eb5b9699ff48c1d0c93816d0"
  }
]`

	user := BuildUserConfig(username, password, salt)

	actualJSONBytes, err := json.MarshalIndent([]User{user}, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal user config: %v", err)
	}

	actualJSON := string(actualJSONBytes)

	if actualJSON != expectedJSON {
		t.Errorf("Hash mismatch.\nExpected:\n%s\n\nGot:\n%s", expectedJSON, actualJSON)
	}
}

func TestBuildUserConfig_EmptyPassword(t *testing.T) {
	user := BuildUserConfig("admin", "", "0c62b823eb5b9699ff48c1d0c93816d0")
	if user.Password == "" {
		t.Error("Expected hash even for empty password, got empty string")
	}
}

func TestBuildUserConfig_EmptyUsername(t *testing.T) {
	user := BuildUserConfig("", "password", "0c62b823eb5b9699ff48c1d0c93816d0")
	if user.Name != "" {
		t.Errorf("Expected empty username, got: %s", user.Name)
	}
}

func TestBuildUserConfig_EmptySalt(t *testing.T) {
	user := BuildUserConfig("admin", "password", "")
	if user.Password == "" {
		t.Error("Expected hash with empty salt, got empty string")
	}
}

func TestBuildUserConfig_DeterministicHash(t *testing.T) {
	salt := "abc123"
	user1 := BuildUserConfig("admin", "password", salt)
	user2 := BuildUserConfig("admin", "password", salt)

	if user1.Password != user2.Password {
		t.Error("Expected same hash for identical input")
	}
}

func TestBuildUserConfig_DifferentSalt(t *testing.T) {
	user1 := BuildUserConfig("admin", "password", "salt1")
	user2 := BuildUserConfig("admin", "password", "salt2")

	if user1.Password == user2.Password {
		t.Error("Expected different hash for different salt")
	}
}

func TestBuildUserConfig_UnicodePassword(t *testing.T) {
	user := BuildUserConfig("admin", "pässwörd£€", "abc123")
	if user.Password == "" {
		t.Error("Expected valid hash for unicode password")
	}
}
