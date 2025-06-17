# Utility to generate users configuration

Generates JSON configuration for the `users.json` file.

Usage:

    userconfig --username <username> --salt <salt>

If a username and salt are provided, the tool prompts for a password, if no username and salt are provided, the tool prompts for both:

```shell
$ userconfig -u jane -s somesaltvalue

Set password for jane:
```

Once you type the password, the configuration is generated as follows:

```json
{
  "name": "jane",
  "password": "0f7dee0b90c2e0c1342393153b319d79c421da0ec10248b90a24ea7b78265dc4480d0434fecd3d3b75e7ab7ad221a1f15290ba8b76cd3385ad28e847ecec69ac",
  "salt": "somesaltvalue"
}
```

To run without building, you can use the following command:

```shell
$ go run main.go
```
