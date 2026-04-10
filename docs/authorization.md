# Authorization (RBAC)

CodeMetrics supports role-based access control (RBAC) to restrict access to certain features based on the roles assigned to a user.

## Roles

| Role    | Description                                                                 |
| ------- | --------------------------------------------------------------------------- |
| `admin` | Access to the [Administration Portal](./admin_portal.md), including service token management |

Users without any roles assigned can still log in and use the standard CodeMetrics features.

## Configuring RBAC

RBAC is configured using a file named `rbac.yaml` in your config directory.

### Example

```yaml
rbac:
  - user: alice@example.com
    roles: [ "admin" ]
  - user: bob@example.com
    roles: []
```

- **`user`** — the username or email address of the user, as it appears in your authentication provider.
- **`roles`** — a list of roles to assign to the user. Use an empty list (`[]`) to grant no roles.

Copy the example file `config/examples/rbac.yaml` to your config directory to get started.

> [!NOTE]
> If no `rbac.yaml` file is present, all users will have no roles assigned. Features that require a role (such as the Administration Portal) will be inaccessible.
