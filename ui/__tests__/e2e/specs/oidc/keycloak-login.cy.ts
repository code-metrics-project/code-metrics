import { Paths } from "../../../../src/router/paths";

describe("Keycloak OIDC Authentication", () => {
  it("Should authenticate with Keycloak and redirect back to the app", { defaultCommandTimeout: 10000 }, () => {
    // Assumes OIDC authentication with Keycloak is enabled
    // It navigates through the Keycloak login flow
    cy.visit(Paths.Login);

    // The app should redirect to Keycloak
    cy.origin("http://localhost:8086", () => {
      // Fill out the Keycloak login form
      cy.get("#username").type("admin");
      cy.get("#password").type("admin");
      cy.get("#kc-login").click();
    });

    // After successful authentication, we should be redirected back to our app
    cy.url().should("include", "localhost:3001");
    cy.contains("CodeMetrics");

    // Verify we've been redirected back to the app
    cy.url().should("include", "localhost:3001", { timeout: 10000 });

    // Check if we can access protected resources
    cy.visit(Paths.Home);
    cy.contains("CodeMetrics", { timeout: 10000 }).should("be.visible");
    cy.checkFooter();
  });
});
