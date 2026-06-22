import { getRBACService, resetRBACService } from "../rbacService";
import * as source from "../../../config/sources/source";
import * as fileMod from "../file";

jest.mock("../../../config/sources/source");
jest.mock("../file");
jest.mock("../../../utils/logger/logger", () => ({
  logger: jest.fn(),
  verbose: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const mockGetConfigItem = source.getEnvConfigItem as jest.MockedFunction<typeof source.getEnvConfigItem>;
const mockGetFileRBACService = fileMod.getFileRBACService as jest.MockedFunction<typeof fileMod.getFileRBACService>;

describe("getRBACService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRBACService();
  });

  it("should return the file RBAC service by default", () => {
    const fakeService = { getRolesForUser: jest.fn() };
    mockGetConfigItem.mockReturnValue("file");
    mockGetFileRBACService.mockReturnValue(fakeService);

    const service = getRBACService();

    expect(service).toBe(fakeService);
    expect(mockGetFileRBACService).toHaveBeenCalled();
  });

  it("should return the file RBAC service when RBAC_IMPL is 'file'", () => {
    const fakeService = { getRolesForUser: jest.fn() };
    mockGetConfigItem.mockReturnValue("file");
    mockGetFileRBACService.mockReturnValue(fakeService);

    const service = getRBACService();

    expect(service).toBe(fakeService);
  });

  it("should throw an error for unsupported RBAC implementation", () => {
    mockGetConfigItem.mockReturnValue("unsupported");

    expect(() => getRBACService()).toThrow("Unsupported RBAC implementation: unsupported");
  });

  it("should cache the service instance on subsequent calls", () => {
    const fakeService = { getRolesForUser: jest.fn() };
    mockGetConfigItem.mockReturnValue("file");
    mockGetFileRBACService.mockReturnValue(fakeService);

    const first = getRBACService();
    const second = getRBACService();

    expect(first).toBe(second);
    expect(mockGetFileRBACService).toHaveBeenCalledTimes(1);
  });

  it("should create a new instance after reset", () => {
    const fakeService1 = { getRolesForUser: jest.fn() };
    const fakeService2 = { getRolesForUser: jest.fn() };
    mockGetConfigItem.mockReturnValue("file");
    mockGetFileRBACService.mockReturnValueOnce(fakeService1).mockReturnValueOnce(fakeService2);

    const first = getRBACService();
    resetRBACService();
    const second = getRBACService();

    expect(first).toBe(fakeService1);
    expect(second).toBe(fakeService2);
    expect(mockGetFileRBACService).toHaveBeenCalledTimes(2);
  });
});
