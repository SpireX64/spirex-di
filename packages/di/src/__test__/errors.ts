export function catchError(procedure: () => void): Error | undefined {
    try {
        procedure();
    } catch (e) {
        if (e instanceof Error) return e;
    }
    return undefined;
}
