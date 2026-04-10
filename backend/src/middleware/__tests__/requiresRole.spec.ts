import { Request, Response } from "express";
import { requiresRole } from "../requiresRole";
import { AuthenticatedRequest } from "../validateJWT";

jest.mock("../../utils/responses", () => ({
  forbidden: jest.fn(),
}));
jest.mock("../../utils/logger/logger", () => ({
  logger: jest.fn(),
  verbose: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import { forbidden } from "../../utils/responses";

const mockForbidden = forbidden as jest.MockedFunction<typeof forbidden>;

describe("requiresRole middleware", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    nextFn = jest.fn();
  });

  it("should call next() when user has the required role", () => {
    mockRequest.user = { name: "alice", roles: ["admin", "viewer"] };

    const middleware = requiresRole("admin");
    middleware(mockRequest as Request, mockResponse as Response, nextFn);

    expect(nextFn).toHaveBeenCalled();
    expect(mockForbidden).not.toHaveBeenCalled();
  });

  it("should return 403 when user does not have the required role", () => {
    mockRequest.user = { name: "bob", roles: ["viewer"] };

    const middleware = requiresRole("admin");
    middleware(mockRequest as Request, mockResponse as Response, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(mockForbidden).toHaveBeenCalledWith(mockResponse);
  });

  it("should return 403 when user has no roles", () => {
    mockRequest.user = { name: "bob", roles: undefined };

    const middleware = requiresRole("admin");
    middleware(mockRequest as Request, mockResponse as Response, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(mockForbidden).toHaveBeenCalledWith(mockResponse);
  });

  it("should return 403 when user has an empty roles array", () => {
    mockRequest.user = { name: "bob", roles: [] };

    const middleware = requiresRole("admin");
    middleware(mockRequest as Request, mockResponse as Response, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(mockForbidden).toHaveBeenCalledWith(mockResponse);
  });

  it("should return 403 when req.user is undefined", () => {
    mockRequest.user = undefined;

    const middleware = requiresRole("admin");
    middleware(mockRequest as Request, mockResponse as Response, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(mockForbidden).toHaveBeenCalledWith(mockResponse);
  });

  it("should check roles case-sensitively", () => {
    mockRequest.user = { name: "alice", roles: ["Admin"] };

    const middleware = requiresRole("admin");
    middleware(mockRequest as Request, mockResponse as Response, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(mockForbidden).toHaveBeenCalledWith(mockResponse);
  });

  it("should allow access when user has multiple roles including the required one", () => {
    mockRequest.user = { name: "alice", roles: ["viewer", "editor", "admin"] };

    const middleware = requiresRole("editor");
    middleware(mockRequest as Request, mockResponse as Response, nextFn);

    expect(nextFn).toHaveBeenCalled();
    expect(mockForbidden).not.toHaveBeenCalled();
  });
});
