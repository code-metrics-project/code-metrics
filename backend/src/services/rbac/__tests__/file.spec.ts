import { getFileRBACService } from "../file";
import * as configMapping from "../../../config/configMapping";

jest.mock("../../../config/configMapping");
jest.mock("../../../utils/logger/logger", () => ({
  logger: jest.fn(),
  verbose: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const mockGetRBACConfig = configMapping.getRBACConfig as jest.MockedFunction<typeof configMapping.getRBACConfig>;

describe("FileRBACService", () => {
  let service: ReturnType<typeof getFileRBACService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = getFileRBACService();
  });

  describe("getRolesForUser", () => {
    it("should return roles for a known user", async () => {
      mockGetRBACConfig.mockReturnValue({
        rbac: [
          { user: "alice", roles: ["admin", "viewer"] },
          { user: "bob", roles: ["viewer"] },
        ],
      });

      const roles = await service.getRolesForUser("alice");

      expect(roles).toEqual(["admin", "viewer"]);
    });

    it("should return an empty array for an unknown user", async () => {
      mockGetRBACConfig.mockReturnValue({
        rbac: [{ user: "alice", roles: ["admin"] }],
      });

      const roles = await service.getRolesForUser("unknown");

      expect(roles).toEqual([]);
    });

    it("should return an empty array when rbac config is empty", async () => {
      mockGetRBACConfig.mockReturnValue({ rbac: [] });

      const roles = await service.getRolesForUser("alice");

      expect(roles).toEqual([]);
    });

    it("should return an empty array when user entry has no roles", async () => {
      mockGetRBACConfig.mockReturnValue({
        rbac: [{ user: "alice", roles: undefined }],
      });

      const roles = await service.getRolesForUser("alice");

      expect(roles).toEqual([]);
    });

    it("should match users case-sensitively", async () => {
      mockGetRBACConfig.mockReturnValue({
        rbac: [{ user: "Alice", roles: ["admin"] }],
      });

      const roles = await service.getRolesForUser("alice");

      expect(roles).toEqual([]);
    });

    it("should return the correct roles when multiple users exist", async () => {
      mockGetRBACConfig.mockReturnValue({
        rbac: [
          { user: "alice", roles: ["admin"] },
          { user: "bob", roles: ["viewer", "editor"] },
          { user: "charlie", roles: ["viewer"] },
        ],
      });

      const roles = await service.getRolesForUser("bob");

      expect(roles).toEqual(["viewer", "editor"]);
    });
  });
});
