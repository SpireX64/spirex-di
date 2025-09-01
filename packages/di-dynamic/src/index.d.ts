import type {
    TTypeMapBase,
    DIModule,
    IContainerMiddleware,
    IModuleTypeEntryBinder,
} from "@spirex/di";

/**
 * Delegate function for defining bindings in a dynamic module.
 * It receives a binder for registering dependencies and the JS module
 * which will be available after loading.
 *
 * @template TypeMap - Map of types provided by the module.
 * @template JSModule - The type of the underlying JavaScript module.
 * @param binder - Binder used to register type entries for the module.
 * @param module - The actual JavaScript module after dynamic import.
 */
export type DIDynamicModuleDelegate<TypeMap extends TTypeMapBase, JSModule> = (
    binder: IModuleTypeEntryBinder<TypeMap>,
    module: Readonly<JSModule>,
) => void;

/**
 * Function that asynchronously imports a JavaScript module.
 *
 * @template JSModule - The type of the imported JavaScript module.
 * @returns A promise-like object resolving to the imported module.
 */
export type DIDynamicModuleImport<JSModule> = () => PromiseLike<JSModule>;

/**
 * Definition of a dynamic module for the dependency injection container.
 * Dynamic modules are loaded asynchronously and can define bindings
 * before the actual module is available.
 *
 * @template TypeMap - Map of types provided by the module.
 * @template JSModule - The type of the underlying JavaScript module.
 */
export type DIDynamicModule<
    TypeMap extends TTypeMapBase,
    JSModule,
> = DIModule<TypeMap> & {
    /** The kind of module — always "dynamic" */
    readonly type: "dynamic";

    readonly isLoaded: boolean

    /** The function that asynchronously loads module. */
    loadAsync(): Promise<void>
};

/**
 * Factory for defining a dynamic module, preserving type inference for the imported JS module.
 *
 * @template JSModule - Type of the module being dynamically imported.
 */
export type TDynamicModuleDeclaration<JSModule> = {
    /**
     * Finalizes a dynamic module definition using the provided delegate.
     *
     * @template TypeMap - Map of types provided by this module.
     * @param delegate - Function to register bindings using the loaded module.
     * @returns The dynamic module definition.
     */
    create<TypeMap extends TTypeMapBase>(
        delegate: DIDynamicModuleDelegate<TypeMap, JSModule>,
    ): DIDynamicModule<TypeMap, JSModule>;
};

/**
 * Creates a dynamic module declaration.
 *
 * @template JSModule - Type of the dynamically imported module.
 * @param moduleId - Unique identifier of the module.
 * @param importFunc - Function that asynchronously imports the JS module.
 * @returns A declaration object with a `create()` method for defining the module.
 */
export declare function dynamicModule<JSModule>(
    moduleId: string,
    importFunc: DIDynamicModuleImport<JSModule>,
): TDynamicModuleDeclaration<JSModule>;

export declare const DynamicModules: IContainerMiddleware;
