import { InjectionToken } from "@angular/core";

export function AngularAdapter() {
    return {
        name: AngularAdapter.name,
        onPreBuild: (builder) => {
            var tokens = builder
                .findAll(() => true)
                .reduce((dict, entry) => {
                    dict[entry.type] = new InjectionToken(entry.$id);
                    return dict;
                }, {});

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
