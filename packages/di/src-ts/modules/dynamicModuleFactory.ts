import type {
    TDynamicBuilderDelegate,
    TDynamicDIModule,
    TDynamicImportDelegate,
} from "./types";
import type { TTypeMapBase } from "../types";
import { Errors } from "../errors";

export function dynamicModuleFactory<JSModule>(
    name: string,
    importDelegate: TDynamicImportDelegate<JSModule>,
) {
    const trimmedName = name.trim();
    if (trimmedName.length === 0 || trimmedName.length != name.length)
        throw new Error(Errors.InvalidModuleName(name));
    return {
        create: <TypeMap extends TTypeMapBase>(
            builderDelegate: TDynamicBuilderDelegate<TypeMap, JSModule>,
        ): TDynamicDIModule<TypeMap, JSModule> => {
            return Object.freeze({
                type: "dynamic",
                name: trimmedName,
                importDelegate,
                builderDelegate,
            });
        },
    };
}
