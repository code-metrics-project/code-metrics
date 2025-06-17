import { authenticate } from "../authenticate";
import { Request, Response } from "express";
import path from "path";

beforeAll(async () => {
  process.env.ACCESS_TOKEN_SECRET = "secret";
  process.env.AUTHENTICATOR_IMPL = "file";
  process.env.CONFIG_DIR = path.join(__dirname, "test-data");
});

describe('the authenticate route', () => {
  it('should respond with an access token if the user is authenticated', async () => {
    const req = {
      body: {
        username: 'admin',
        password: 'admin',
      },
    } as Request;
    const res = {
      status: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;

    await authenticate(req, res);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken : expect.any(String) })
    );
  });

  it('should respond with 401 if authentication fails', async () => {
    const req = {
      body: {
        username: 'admin',
        password: 'badpassword',
      },
    } as Request;
    const res = {
      status: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;

    await authenticate(req, res);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith();
  });
});
