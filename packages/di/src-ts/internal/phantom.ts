import { TProvider, TTypeEntry, TTypeMapBase } from "../types";
import { TPhantomState } from "./types";

function getRealInstance<TypeMap extends TTypeMapBase, T extends keyof TypeMap>(
    state: TPhantomState<TypeMap, T>,
): TypeMap[T] {
    return state.ref ?? (state.ref = state.provider());
}

export const PHANTOM_SYMBOL = Symbol("PHANTOM");

/* istanbul ignore next */
export function makePhantomInstance<
    TypeMap extends TTypeMapBase,
    T extends keyof TypeMap,
>(entry: TTypeEntry<TypeMap, T>, provider: TProvider<TypeMap[T]>): TypeMap[T] {
    const state: TPhantomState<TypeMap, T> = {
        entry,
        provider,
        ref: null,
    };

    const proxy = new Proxy(state, {
        get(
            state: TPhantomState<TypeMap, T>,
            property: string | symbol,
        ): unknown {
            const instance = getRealInstance(state);
            if (property === PHANTOM_SYMBOL) return instance;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            return instance[property];
        },
        set(
            state: TPhantomState<TypeMap, T>,
            property: string | symbol,
            newValue: unknown,
        ): boolean {
            const instance = getRealInstance(state);
            if (typeof instance !== "object") return false;
            if (Object.isFrozen(instance)) return false;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            if (!(property in instance || Object.isExtensible(instance)))
                return false;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            instance[property] = newValue;
            return true;
        },
        has(
            state: TPhantomState<TypeMap, T>,
            property: string | symbol,
        ): boolean {
            if (property === PHANTOM_SYMBOL) return true;
            const instance = getRealInstance(state);
            if (!instance || typeof instance !== "object") return false;
            return property in instance;
        },
        ownKeys(state: TPhantomState<TypeMap, T>): ArrayLike<string | symbol> {
            const instance = getRealInstance(state);
            if (!instance || typeof instance !== "object") return ["kek"];
            return Object.getOwnPropertyNames(instance);
        },
    });

    return proxy as TypeMap[T];
}
