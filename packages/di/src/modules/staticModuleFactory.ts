import type { TStaticBuilderDelegate, TStaticDIModule } from "./types";
import type { TTypeMapBase } from "../types";
import { Errors } from "../errors";

export function staticModuleFactory(name: string) {
    const trimmedName = name.trim();
    if (trimmedName.length === 0 || trimmedName.length != name.length)
        throw new Error(Errors.InvalidModuleName(name));
    return {
        create: <TypeMap extends TTypeMapBase>(
            builderDelegate: TStaticBuilderDelegate<TypeMap>,
        ): TStaticDIModule<TypeMap> => {
            return {
                name: trimmedName,
                type: "static",
                builderDelegate,
            };
        },
    };
}
