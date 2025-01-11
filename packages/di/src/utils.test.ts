import type { TLifecycle, TTypeEntry, TTypeEntryBase } from "./types";
import { makeFactoryEntryMock, makeInstanceEntryMock } from "./__test__/mocks";
import {
    checkIsDisposable,
    compareLifecycles,
    isFactoryTypeEntry,
    isInstanceTypeEntry,
} from "./utils";

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

    test.each([
        ["singleton", "singleton", 0],
        ["singleton", "lazy", 1],
        ["singleton", "scope", 1],
        ["singleton", "transient", 1],
        ["lazy", "singleton", -1],
        ["lazy", "lazy", 0],
        ["lazy", "scope", 1],
        ["lazy", "transient", 1],
        ["scope", "singleton", -1],
        ["scope", "lazy", -1],
        ["scope", "scope", 0],
        ["scope", "transient", 1],
        ["transient", "singleton", -1],
        ["transient", "lazy", -1],
        ["transient", "scope", -1],
        ["transient", "transient", 0],
    ] as ReadonlyArray<[TLifecycle, TLifecycle, number]>)(
        "Compare lifecycles %s & %s",
        (lc1, lc2, expectedComparation) => {
            expect(Math.sign(compareLifecycles(lc1, lc2))).toBe(
                expectedComparation,
            );
        },
    );

    test.each([
        [null, false],
        [undefined, false],
        [NaN, false],
        [Number.MAX_SAFE_INTEGER, false],
        [[42], false],
        [{}, false],
        [{ dispose: 123 }, false],
        [{ dispose: () => {} }, true],
    ])("checkIsDisposable(%s) == %s", (ref: unknown, expected) => {
        expect(checkIsDisposable(ref)).toBe(expected);
    });
});
