import {
    TDynamicBuilderDelegate,
    TDynamicDIModule,
    TDynamicImportDelegate,
} from "./types";
import { TTypeMapBase } from "../types";

export function dynamicModuleFactory<JSModule>(
    name: string,
    importDelegate: TDynamicImportDelegate<JSModule>,
) {
    return {
        create: <TypeMap extends TTypeMapBase>(
            builderDelegate: TDynamicBuilderDelegate<TypeMap, JSModule>,
        ): TDynamicDIModule<TypeMap, JSModule> => {
            return Object.freeze({
                type: "dynamic",
                name,
                importDelegate,
                builderDelegate,
            });
        },
    };
}
