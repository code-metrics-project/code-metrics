# LDAP Authentication

## Introduction

CodeMetrics supports using an LDAP registry for user authentication. This is a back-end authentication mechanism, where the CodeMetrics backend queries an LDAP store to authenticate the user.

## Configuration

Set the environment variable:

```
AUTHENTICATOR_IMPL=ldap
```

There are two supported methods of LDAP authentication:
1. Bind with Admin Account, search for user and if found attempt to bind as user
2. Attempt to bind with specified user account

Then configure the following environment variables as needed

Set the following environment variables for BOTH Methods:
```
LDAP_URI='ldap://localhost:1389'
LDAP_USER_SEARCH_BASE='ou=users,dc=example,dc=org'
LDAP_ROOT_DN='dc=example,dc=org'
LDAP_USERNAME_ATTRIBUTE='uid'
LDAP_TLS=false
```

To use method 1 (admin bind)
```
LDAP_ADMIN_AUTH=true
LDAP_BIND_DN='cn=admin,dc=example,dc=org'
LDAP_BIND_PASSWORD='admin'
```

To use method 2 (user bind)
```
LDAP_ADMIN_AUTH=false
```
