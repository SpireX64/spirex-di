import { describe, test, expect, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { diBuilder } from "@spirex/di";
import { AngularAdapter } from "./index";

describe("Angular Adapter", () => {
    afterEach(() => TestBed.resetTestingModule());

    test("WHEN: Use middleware in builder", () => {
        // Arrange --------
        var builder = diBuilder();

        // Act --------
        builder.use(AngularAdapter()).build();

        // Assert -----
        expect(builder.has("ngAdapter")).is.true;
    });
});
