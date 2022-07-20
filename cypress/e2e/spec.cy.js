import { ROOT_URL } from "../constants";

describe("elimination happy path", () => {
    it("loads the main page", () => {
        cy.visit(ROOT_URL);
        cy.get("h1").contains("Let's choose!");
        cy.get("h4").contains("For people who want to eat...");
        cy.get("button").contains("Elimination").click();
    });

    it("navigates the elimination landing page", () => {
        cy.visit(ROOT_URL);
        cy.get("button").contains("Elimination").click();

        cy.get("#newRoom").click();
        cy.contains("Room ID:");
    });
});