import type { TStaticBuilderDelegate, TStaticDIModule } from "./types";
import type { TTypeMapBase } from "../types";

export function staticModuleFactory(name: string) {
    return {
        create: <TypeMap extends TTypeMapBase>(
            builderDelegate: TStaticBuilderDelegate<TypeMap>,
        ): TStaticDIModule<TypeMap> => ({
            name,
            type: "static",
            builderDelegate,
        }),
    };
}
