describe('OIDC auth provider', () => {
  beforeEach(() => {
    delete process.env.OIDC_REDIRECT_URI;
    jest.resetModules();
  });

  it('should determine the redirect URI from the request', async () => {
    process.env.UI_BASE_URL = 'https://anotherexample.com';
    const { testables } = await require("../oidc");

    const result = testables.determineRedirectUri();
    expect(result.toString()).toEqual('https://anotherexample.com/login/callback');
  });

  it('should determine the redirect URI from the environment variable', async () => {
    process.env.OIDC_REDIRECT_URI = 'https://example.com/login/callback';
    const { testables } = await require("../oidc");

    const result = testables.determineRedirectUri();
    expect(result.toString()).toEqual('https://example.com/login/callback');
  });
});
