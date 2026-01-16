import { InjectionToken } from "@angular/core";

export var named = (token, name) => 
    token.named && token.named[name] || token

export function allOf(token, name) {
    if (name) token = named(token, name);
    return token.multi || token;
}

function collectTypesDataFromBuilder(builder) {
    var typesDataMap = new Map();

    builder.find(entry => {
        var data = typesDataMap.get(entry.type);
        if (!data) {
            data = { type: entry.type, names: new Set(), scoped: new Set() };
            typesDataMap.set(entry.type, data);
        }

        var isScoped = entry.factory && entry.lifecycle === "scope"

        if (entry.name) {
            data.names.add(entry.name);
            if (isScoped) data.scoped.add(entry.name);
        } else {
            data.base = true;
            data.scopedBase = isScoped
        }
    })

    return typesDataMap;
}

function createToken(type, multi, name) {
    if (name) type += ':' + name;
    return new InjectionToken(multi ? type + '[]' : type)
}

var ngProvider = "ng-P";
var ngScoped = "ng-S";

function bindProviders(builder, type, singleToken, multiToken, scoped, name) {
    var originName = name ? type+':'+name : type
    var bindingOptions =  { name: originName, ifConflict: 'append', lifecycle: scoped ? 'scope' :'lazy' }
    builder
        .bindFactory(
            ngProvider,
            r => ({ provide: singleToken, useFactory: r.providerOf(type, name) }),
            bindingOptions,
        )
        .bindFactory(
            ngProvider,
            r => ({ provide: multiToken, useFactory: () => r.getAll(type, name) }),
            bindingOptions,
        )
        .bindAlias(ngProvider, ngProvider, {
            ifConflict: 'append',
            originName,
        })

    if (scoped)
        builder.bindAlias(ngProvider, ngProvider, {
            ifConflict: 'append',
            originName,
            name: ngScoped,
        })
}

export function AngularBridge() {
    return {
        name: AngularBridge.name,
        onPreBuild: (builder) => {
            var tokens = {}
            collectTypesDataFromBuilder(builder).forEach((info, type) => {
                var primaryToken = createToken(type);
                var primaryMultiToken = createToken(type, true)
                
                if (info.base) {
                    bindProviders(builder, type, primaryToken, primaryMultiToken, info.scopedBase)
                }

                var namedTokens = {};
                info.names.forEach(name => {
                    var namedToken = createToken(type, false, name)
                    var namedMultiToken = createToken(type, true, name)
                    bindProviders(builder, type, namedToken, namedMultiToken, info.scoped.has(name), name);
                    namedTokens[name] = Object.assign(namedToken, { multi: namedMultiToken })
                });

                tokens[type] = Object.assign(primaryToken, {
                    multi: primaryMultiToken,
                    named: namedTokens,
                })
            })

            builder
                .bindFactory('AngularBridge', r => {
                    return { 
                        tokens: Object.freeze(tokens),
                        providersForRoot: () => r.getAll(ngProvider),
                        providersForScope: (id) => r.scope(id, { isolated: true }).getAll(ngProvider, ngScoped),
                    }
                })
        },
    };
}
