export function catchError(procedure: () => unknown): Error | undefined {
    try {
        procedure();
    } catch (e) {
        if (e instanceof Error) return e;
    }
    return undefined;
}

export async function catchErrorAsync(
    procedure: () => Promise<unknown>,
): Promise<Error | undefined> {
    try {
        await procedure();
    } catch (e) {
        if (e instanceof Error) return e;
    }
    return undefined;
}
