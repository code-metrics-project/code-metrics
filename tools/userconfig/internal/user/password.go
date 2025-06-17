package user

import (
	"fmt"
	"os"

	"golang.org/x/term"
)

func ReadPassword(username string) string {
	fmt.Printf("Set password for %s: ", username)

	// Read password with input hidden
	bytePassword, err := term.ReadPassword(int(os.Stdin.Fd()))
	if err != nil {
		fmt.Fprintln(os.Stderr, "\nError reading password:", err)
		os.Exit(1)
	}

	fmt.Println() // move to next line after input
	return string(bytePassword)
}
