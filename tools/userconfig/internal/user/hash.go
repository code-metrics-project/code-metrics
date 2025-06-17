package user

import (
	"crypto/sha256"
	"encoding/hex"

	"golang.org/x/crypto/pbkdf2"
)

type User struct {
	Name     string `json:"name"`
	Password string `json:"password"`
	Salt     string `json:"salt"`
}

func BuildUserConfig(username, password, salt string) User {
	hash := pbkdf2.Key([]byte(password), []byte(salt), 100_000, 64, sha256.New)
	return User{
		Name:     username,
		Password: hex.EncodeToString(hash),
		Salt:     salt,
	}
}
