import { InjectionToken } from "@angular/core";

export function AngularAdapter() {
    return {
        name: AngularAdapter.name,
        onPreBuild: (builder) => {
            var tokens = {} 
            builder.find((entry) => {
                tokens[entry.type] = new InjectionToken(entry.$id);
            })

            builder.bindFactory(
                "angularAdapter",
                () => {
                    return Object.freeze({ tokens: Object.freeze(tokens) });
                },
                { lifecycle: "lazy" },
            );
        },
    };
}
