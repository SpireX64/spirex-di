import { ID_SEP, makeEntryId } from "./utils";

describe("internal/utils", () => {
    test("makeEntryId", () => {
        const type = "asd";
        const typeNum = 123;
        const name = "foo";

        expect(makeEntryId(type)).toStrictEqual(type);
        expect(makeEntryId(type, name)).toStrictEqual(
            `${type}${ID_SEP}${name}`,
        );
        expect(makeEntryId(typeNum)).toStrictEqual(typeNum.toString());
        expect(makeEntryId(typeNum, name)).toStrictEqual(
            `${typeNum.toString()}${ID_SEP}${name}`,
        );
    });
});
