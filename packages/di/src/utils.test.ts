import { TTypeEntry, TTypeEntryBase } from "./types";
import { makeFactoryEntryMock, makeInstanceEntryMock } from "./__test__/mocks";
import { isFactoryTypeEntry, isInstanceTypeEntry } from "./utils";

type TUnknownTypeEntry = TTypeEntry<
    TTypeEntryBase<unknown>,
    keyof TTypeEntryBase<unknown>
>;

describe("utils", () => {
    test.each([
        [undefined, false],
        [null, false],
        [{}, false],
        [makeFactoryEntryMock("key", () => "value"), false],
        [makeInstanceEntryMock("key", "value"), true],
    ])(
        "isInstanceTypeEntry(%s)=%s",
        (
            entry: TUnknownTypeEntry | object | null | undefined,
            expected: boolean,
        ) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            expect(isInstanceTypeEntry(entry)).toBe(expected);
        },
    );

    test.each([
        [undefined, false],
        [null, false],
        [{}, false],
        [makeInstanceEntryMock("key", "value"), false],
        [makeFactoryEntryMock("key", () => "value"), true],
    ])(
        "isFactoryTypeEntry(%s)=%s",
        (
            entry: TUnknownTypeEntry | object | null | undefined,
            expected: boolean,
        ) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            expect(isFactoryTypeEntry(entry)).toBe(expected);
        },
    );
});
