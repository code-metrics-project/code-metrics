import { logger } from "../../utils/logger/logger";
import { getEnvConfigItem } from "../../config/sources/source";
import { getFileRBACService } from "./file";

export type RBACService = {
  /**
   * Get the roles assigned to a user.
   * @param username the user's identity (as it appears in the JWT subject)
   * @returns the roles assigned to the user, or an empty array if the user has no roles
   */
  getRolesForUser(username: string): Promise<string[]>;
};

const DEFAULT_RBAC_IMPL = "file";
let rbacService: RBACService;

/**
 * Determine the {@link RBACService} to use.
 */
export const getRBACService = (): RBACService => {
  if (!rbacService) {
    const implName = getEnvConfigItem("RBAC_IMPL", DEFAULT_RBAC_IMPL);
    switch (implName) {
      case "file":
        rbacService = getFileRBACService();
        break;
      default:
        throw new Error(`Unsupported RBAC implementation: ${implName}`);
    }
    logger(`Using ${implName} RBAC service`);
  }
  return rbacService;
};

/**
 * Reset the RBAC service instance. Intended for testing only.
 */
export const resetRBACService = () => {
  rbacService = null;
};
