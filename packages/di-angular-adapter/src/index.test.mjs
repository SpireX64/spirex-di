import { describe, test, expect, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { diBuilder } from "@spirex/di";
import { AngularAdapter } from "./index";

describe("Angular Adapter", () => {
    afterEach(() => TestBed.resetTestingModule());

    describe("Apply Middleware", () => {
        test("WHEN: Use middleware in container builder", () => {
            // Arrange --------
            var builder = diBuilder();

            // Act --------
            builder.use(AngularAdapter()).build();

            // Assert -----
            expect(builder.has("angularAdapter")).is.true;
        });

        test("WHEN: Resolve angular adapter", () => {
            // Arrange -------
            var container = diBuilder().use(AngularAdapter()).build();

            // Act -----------
            var adapter = container.get("angularAdapter");

            // Assert --------
            expect(adapter).instanceOf(Object);
            expect(adapter).is.frozen;
        });
    });
});
