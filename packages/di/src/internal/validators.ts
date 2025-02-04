import type { TLifecycle } from "../types";

export function validateLifecycle(
    lifecycle: string | null | undefined,
): lifecycle is TLifecycle {
    return (
        lifecycle === "singleton" ||
        lifecycle === "lazy" ||
        lifecycle === "scope" ||
        lifecycle === "transient"
    );
}

export function validateName(name: string): boolean {
    return name.length > 0 && name.trim() == name;
}
