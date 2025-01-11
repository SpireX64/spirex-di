import type { TEntryId } from "../types";

export const ID_SEP = "$";

export function makeEntryId(
    type: string | symbol | number,
    name?: string | undefined,
): TEntryId {
    return name ? type.toString() + ID_SEP + name : type.toString();
}
