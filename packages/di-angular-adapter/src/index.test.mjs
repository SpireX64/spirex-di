import { describe, test, expect, afterEach } from "vitest";
import { InjectionToken } from "@angular/core";
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

    describe("Get injection tokens", () => {
        test("WHEN: container empty", () => {
            // Arrange ---------
            var container = diBuilder().use(AngularAdapter()).build();

            var adapter = container.get("angularAdapter");

            // Act -------------
            var tokens = adapter.tokens;

            // Assert ----------
            expect(tokens).instanceOf(Object);
            expect(tokens).is.frozen;
            expect(tokens).is.empty;
        });

        test("WHEN: container with bindings", () => {
            // Arrange -----
            var container = diBuilder()
                .bindInstance("keyInstance", 42)
                .bindFactory("keyFactory", (r) => r.get("keyInstance") + 10)
                .use(AngularAdapter())
                .build();

            var adapter = container.get("angularAdapter");

            // Act ---------
            var tokens = adapter.tokens;

            // Assert ------
            expect(tokens).instanceOf(Object);
            expect(tokens).is.frozen;
            expect(tokens.keyInstance).instanceOf(InjectionToken);
            expect(tokens.keyFactory).instanceOf(InjectionToken);
        });
    });

    describe("Providers", () => {
        describe("Providers for root", () => {});

        describe("Providers for scope", () => {});
    });
});
