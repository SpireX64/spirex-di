import type {
    IInstanceResolver,
    TProvider,
    TScopeID,
    TTypeMapBase,
} from "./types";
import { DIScope } from "./DIScope";
import { Registrar } from "./internal/Registrar";
import { InstanceActivator } from "./internal/InstanceActivator";

export class DIContainer<TypeMap extends TTypeMapBase>
    implements IInstanceResolver<TypeMap>
{
    private readonly _registrar: Registrar<TypeMap>;
    private readonly _activator: InstanceActivator<TypeMap>;

    private readonly _scopes = new Map<TScopeID, DIScope<TypeMap>>();
    private readonly _globalScope: DIScope<TypeMap>;

    public constructor(
        registrar: Registrar<TypeMap>,
        activator: InstanceActivator<TypeMap>,
    ) {
        this._registrar = registrar;
        this._activator = activator;
        this._globalScope = new DIScope(
            Symbol("global"),
            this._registrar,
            this._activator,
        );
    }

    public scope(id: TScopeID): DIScope<TypeMap> {
        let scope = this._scopes.get(id);
        if (!scope)
            this._scopes.set(
                id,
                (scope = new DIScope(
                    id,
                    this._registrar,
                    this._activator,
                    this._globalScope,
                )),
            );
        return scope;
    }

    public get<Key extends keyof TypeMap>(
        key: Key,
        name?: string | undefined,
    ): TypeMap[Key] {
        return this._globalScope.get(key, name);
    }

    public getAll<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): readonly TypeMap[Key][] {
        return this._globalScope.getAll(type, name);
    }

    public getProvider<Key extends keyof TypeMap>(
        type: Key,
        name?: string | undefined,
    ): TProvider<TypeMap[Key]> {
        return this._globalScope.getProvider(type, name);
    }
}
