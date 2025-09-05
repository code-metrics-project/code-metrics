package cmd

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/pflag"
	"github.com/spf13/viper"
	"userconfig/internal/user"
)

func Execute() {
	// Define CLI flags
	pflag.StringP("username", "u", "", "Username")
	pflag.StringP("salt", "s", "", "Salt")
	pflag.BoolP("help", "h", false, "Show help message")
	pflag.Parse()

	viper.BindPFlags(pflag.CommandLine)

	if viper.GetBool("help") {
		printHelp()
		os.Exit(0)
	}

	username := viper.GetString("username")
	salt := viper.GetString("salt")

	// If no args, prompt interactively
	if username == "" && salt == "" && pflag.NFlag() == 0 {
		reader := bufio.NewReader(os.Stdin)

		fmt.Print("Enter username: ")
		username, _ = reader.ReadString('\n')
		username = strings.TrimSpace(username)

		fmt.Print("Enter salt: ")
		salt, _ = reader.ReadString('\n')
		salt = strings.TrimSpace(salt)
	}

	// Still missing args? Show error
	if username == "" || salt == "" {
		fmt.Fprintln(os.Stderr, "Missing required arguments.")
		printHelp()
		os.Exit(1)
	}

	password := user.ReadPassword(username)
	usr := user.BuildUserConfig(username, password, salt)

	output, err := json.MarshalIndent([]user.User{usr}, "", "  ")
	if err != nil {
		fmt.Fprintln(os.Stderr, "Error marshaling JSON:", err)
		os.Exit(1)
	}

	fmt.Println(string(output))
}

func printHelp() {
	fmt.Println(`Usage:
  userconfig --username <username> --salt <salt>

Options:
  -u, --username   Username
  -s, --salt       Salt value
  -h, --help       Show this help message

If no arguments are provided, you will be prompted interactively.`)
}
