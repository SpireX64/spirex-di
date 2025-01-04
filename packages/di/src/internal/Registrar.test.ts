import { Registrar } from "./Registrar";
import {
    makeEntriesMap,
    makeFactoryEntryMock,
    makeInstanceEntryMock,
} from "../__test__/mocks";

describe("Registrar", () => {
    test("Check is registrar has type", () => {
        type TypeMap = { val1: string; val2: number };
        const map = makeEntriesMap(
            makeInstanceEntryMock<TypeMap>("val1", "Hello"),
        );

        // Act ------------
        const registrar = new Registrar(map);

        // Assert ---------
        expect(registrar.hasType("val1")).toBeTruthy();
        expect(registrar.hasType("val2")).toBeFalsy();
    });

    test("Get entry from registrar", () => {
        type TypeMap = { val1: string; val2: number; val3: object };
        const map = makeEntriesMap(
            makeInstanceEntryMock<TypeMap>("val1", "Hello"),
            makeFactoryEntryMock<TypeMap>("val2", () => 42),
        );
        const registrar = new Registrar(map);

        // Act ------------
        const entry1 = registrar.findTypeEntry("val1");
        const entry2 = registrar.findTypeEntry("val2");
        const entry3 = registrar.findTypeEntry("val3");

        // Assert ---------
        expect(entry1).not.toBeNull();
        expect(entry2).not.toBeNull();
        expect(entry3).toBeNull();
    });
});
