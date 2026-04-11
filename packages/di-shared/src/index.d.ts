import type {
    AnyTypeMap,
    IContainerScope,
    ITypesResolver,
} from "@spirex/di";

export type DIResolveMethod = keyof ITypesResolver<AnyTypeMap>;

/**
 * Methods that may appear in {@link DISharedUsageContext} when `warn` is on.
 * Excludes `types`: accessing `Shared.types` only exposes the type-key enum and does not resolve dependencies, so it never emits a warning.
 */
export type DISharedWarnMethod = Exclude<DIResolveMethod, "types">;

export type DISharedUsageContext = {
    readonly method: DISharedWarnMethod;
    /** Requested type key for the resolution call. */
    readonly type: string;
    /** Human-readable message including `[spirex/di-shared]` prefix. */
    readonly message: string;
    readonly name?: string;
};

export type DISharedOptions<TypeMap extends AnyTypeMap = AnyTypeMap> = {
    /** 
     * When `true`, emit warnings for resolutions through `Shared`.
     * @default false
     */
    warn?: boolean;

    /** Type keys to exclude from warnings. */
    warnIgnore?: readonly (keyof TypeMap)[];

    /** 
     * Custom warning sink
     * @default `console.warn` when available
     */
    warnLog?: (context: DISharedUsageContext) => void;
};

export type DIShared<TypeMap extends AnyTypeMap = AnyTypeMap> = ITypesResolver<TypeMap> & {
    /** Attach any built scope (root or child). */
    attach(scope: IContainerScope<any>): void;

    /** Whether the container is attached to the shared instance.*/
    readonly isAttached: boolean;
};


export declare function diShared<TypeMap extends AnyTypeMap = AnyTypeMap>(
    options?: DISharedOptions<TypeMap>,
): DIShared<TypeMap>;
