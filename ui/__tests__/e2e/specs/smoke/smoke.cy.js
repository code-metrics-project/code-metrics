describe("Smoke Tests", () => {
  it("should run smoke test", () => {
    cy.visit("/");
    cy.get("body").should("be.visible");
  });
});
