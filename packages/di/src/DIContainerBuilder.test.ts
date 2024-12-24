import { DIContainerBuilder } from "./DIContainerBuilder";

describe("DIContainerBuilder", () => {
    test("Create builder instance", () => {
        const builder = new DIContainerBuilder();

        expect(builder).toBeInstanceOf(DIContainerBuilder);
    });
});
