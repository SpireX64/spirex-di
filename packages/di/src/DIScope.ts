import type { TScopeID } from "./types";

export class DIScope {
    private readonly _id: TScopeID;

    public constructor(id: TScopeID) {
        this._id = id;
    }

    public get id(): TScopeID {
        return this._id;
    }
}
