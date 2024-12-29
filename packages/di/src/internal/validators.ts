import type { TLifecycle } from "../types";

export const validateLifecycle = (
    lifecycle: string | null | undefined,
): lifecycle is TLifecycle => {
    return (
        lifecycle === "singleton" ||
        lifecycle === "lazy" ||
        lifecycle === "transient"
    );
};
