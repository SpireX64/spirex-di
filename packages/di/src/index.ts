import type { TTypeMapBase, TContainerBuilderDefaults } from "./types";
import { DIContainerBuilder } from "./DIContainerBuilder";
import type { TAnyDIModule, TDynamicImportDelegate } from "./modules/types";
import { dynamicModuleFactory } from "./modules/dynamicModuleFactory";
import { staticModuleFactory } from "./modules/staticModuleFactory";

export {
    type TAnyDIModule,
    type TDynamicImportDelegate,
    staticModuleFactory,
    dynamicModuleFactory,
    DIContainerBuilder,
};

export type * from "./modules/types";
export type * from "./types";
export type * from "./middleware";

export {
    isInstanceTypeEntry,
    isFactoryTypeEntry,
    compareLifecycles,
    checkIsDisposable,
    checkIsPhantomInstance,
    unwrapPhantom,
} from "./utils";

export namespace DI {
    export const builder = <TypeMap extends TTypeMapBase>(
        defaults?: TContainerBuilderDefaults,
    ) => new DIContainerBuilder<TypeMap>(defaults);

    export function module(
        name: string,
    ): ReturnType<typeof staticModuleFactory>;

    export function module<ESModule>(
        name: string,
        importDelegate: TDynamicImportDelegate<ESModule>,
    ): ReturnType<typeof dynamicModuleFactory<ESModule>>;

    export function module<ESModule>(
        name: string,
        importDelegate?: TDynamicImportDelegate<ESModule>,
    ) {
        return importDelegate
            ? dynamicModuleFactory(name, importDelegate)
            : staticModuleFactory(name);
    }
}
