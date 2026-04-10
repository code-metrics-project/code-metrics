export type RBACUserRoles = {
  user: string;
  roles: string[];
};

export type RBACConfigWrapper = {
  rbac: RBACUserRoles[];
};
