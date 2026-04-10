import { RBACService } from "./rbacService";
import { getRBACConfig } from "../../config/configMapping";
import { verbose } from "../../utils/logger/logger";

class FileRBACService implements RBACService {
  async getRolesForUser(username: string): Promise<string[]> {
    const config = getRBACConfig();
    const entry = config.rbac.find((entry) => entry.user === username);
    if (!entry) {
      verbose(`No RBAC entry found for user: ${username}`);
      return [];
    }
    return entry.roles ?? [];
  }
}

export const getFileRBACService = (): RBACService => new FileRBACService();
