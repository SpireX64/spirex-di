import { Registrar } from "./Registrar";
import type { TTypeEntry } from "../types";
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

    test("Find one of entries with same type", () => {
        type TypeMap = { val: number };

        // Arrange --------
        const map = makeEntriesMap(
            makeInstanceEntryMock<TypeMap>("val", 1),
            makeInstanceEntryMock<TypeMap>("val", 2),
        );
        const registrar = new Registrar(map);

        // Act -------
        const entry = registrar.findTypeEntry("val");

        // Assert --------
        expect(entry).not.toBeNull();
    });

    test("Find all of entries with same type (no entries)", () => {
        type TypeMap = { val: number };

        // Arrange --------
        const registrar = new Registrar(makeEntriesMap<TypeMap>());

        // Act ------------
        const entries = registrar.findAllTypeEntries("val");

        // Assert ---------
        expect(entries).toHaveLength(0);
    });

    test("Find all of entries with same type (one entry)", () => {
        type TypeMap = { val: number };

        // Arrange --------
        const expectedEntry = makeInstanceEntryMock<TypeMap>("val", 42);
        const registrar = new Registrar(makeEntriesMap<TypeMap>(expectedEntry));

        // Act ------------
        const entries = registrar.findAllTypeEntries("val");

        // Assert ---------
        expect(entries).toHaveLength(1);
        expect(entries).toContain(expectedEntry);
    });

    test("Find all of entries with same type", () => {
        type TypeMap = { val1: number; val2: string };

        // Arrange --------
        const map = makeEntriesMap(
            makeInstanceEntryMock<TypeMap>("val1", 1),
            makeInstanceEntryMock<TypeMap>("val1", 2),
            makeInstanceEntryMock<TypeMap>("val1", 3),
            makeInstanceEntryMock<TypeMap>("val2", "foo"),
        );
        const registrar = new Registrar(map);

        // Act -------
        const entries = registrar.findAllTypeEntries("val1");

        // Assert --------
        expect(entries).toHaveLength(3);
    });

    test("Iterate through all entries", () => {
        type TypeMap = { val1: string; val2: number };

        // Arrange
        const expectedEntries = [
            makeInstanceEntryMock<TypeMap>("val1", "Hello"),
            makeInstanceEntryMock<TypeMap>("val2", 1),
            makeInstanceEntryMock<TypeMap>("val2", 2),
            makeInstanceEntryMock<TypeMap>("val2", 42, "foo"),
        ];
        const map = makeEntriesMap(...expectedEntries);

        const registrar = new Registrar(map);

        // Act ----------
        const entries: TTypeEntry<TypeMap, keyof TypeMap>[] = [];
        registrar.forEach((e) => entries.push(e));

        // Assert -------
        expect(entries).toEqual(expect.arrayContaining(expectedEntries));
    });
});
