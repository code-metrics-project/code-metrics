module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  moduleNameMapper: {
    "^@aws-sdk/client-cognito-identity-provider$": "<rootDir>/test/mocks/cognitoIdentityProvider.mock.ts",
  },
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
};
