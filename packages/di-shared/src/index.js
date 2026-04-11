var ERROR_SHARED_NOT_ATTACHED =
    "No container scope attached. Call Shared.attach(scope) before resolving.";

var ERROR_PROVIDER_BEFORE_ATTACH =
    "Provider invoked before Shared.attach(scope).";

/** @param {Record<string, unknown> | undefined} options */
export function diShared(options) {
    if (options === undefined) options = {};

    var warnEnabled = options.warn === true;
    var warnIgnore = options.warnIgnore ? options.warnIgnore.slice() : [];
    var userWarnLog = options.warnLog;

    /** @param {{ message: string }} ctx */
    function defaultWarnLog(ctx) {
        if (
            typeof console !== "undefined" &&
            console &&
            typeof console.warn === "function"
        ) {
            console.warn(ctx.message);
        }
    }

    var effectiveWarnLog = userWarnLog || defaultWarnLog;

    /** @type {import('@spirex/di').IContainerScope<any> | null} */
    var scope = null;

    function assertAttached() {
        if (scope === null) {
            throw new Error(ERROR_SHARED_NOT_ATTACHED);
        }
        return scope;
    }

    /**
     * @param {string} typeKey
     */
    function shouldIgnoreType(typeKey) {
        return warnIgnore.indexOf(String(typeKey)) !== -1;
    }

    /**
     * @param {'get'|'maybe'|'getAll'|'providerOf'|'phantomOf'} method
     * @param {string} typeKey
     * @param {string | undefined} name
     */
    function emitWarn(method, typeKey, name) {
        if (!warnEnabled) return;
        if (shouldIgnoreType(typeKey)) return;

        var typeStr = String(typeKey);
        var suffix =
            "(" +
            typeStr +
            (name !== undefined && name !== ""
                ? ", " + String(name)
                : "") +
            ")";
        var message =
            "[spirex/di-shared] Resolution via Shared." +
            method +
            suffix +
            " — global Shared resolver was used. Prefer scoped injection where possible.";

        var ctx = {
            method: method,
            type: typeStr,
            message: message,
        };
        if (name !== undefined) ctx.name = name;

        effectiveWarnLog(ctx);
    }

    var api = {
        attach: function attach(s) {
            scope = s;
        },
        get: function get(type, name) {
            var sc = assertAttached();
            var result = sc.get(type, name);
            emitWarn("get", String(type), name);
            return result;
        },
        maybe: function maybe(type, name) {
            var sc = assertAttached();
            var result = sc.maybe(type, name);
            if (result !== undefined) {
                emitWarn("maybe", String(type), name);
            }
            return result;
        },
        getAll: function getAll(type, name) {
            var sc = assertAttached();
            var result = sc.getAll(type, name);
            emitWarn("getAll", String(type), name);
            return result;
        },
        providerOf: function providerOf(type, name) {
            var typeKey = type;
            var nameKey = name;
            var providerFuncName = "get" + String(typeKey);
            return {
                [providerFuncName]: function () {
                    if (scope === null) {
                        throw new Error(ERROR_PROVIDER_BEFORE_ATTACH);
                    }
                    var sc = scope;
                    var provider = sc.providerOf(typeKey, nameKey);
                    var result = provider();
                    emitWarn("providerOf", String(typeKey), nameKey);
                    return result;
                },
            }[providerFuncName];
        },
        phantomOf: function phantomOf(type, name) {
            var sc = assertAttached();
            var result = sc.phantomOf(type, name);
            emitWarn("phantomOf", String(type), name);
            return result;
        },
    };

    Object.defineProperty(api, "isAttached", {
        configurable: true,
        enumerable: true,
        get: function () {
            return scope !== null;
        },
    });

    Object.defineProperty(api, "types", {
        configurable: true,
        enumerable: true,
        get: function () {
            var sc = assertAttached();
            return sc.types;
        },
    });

    return api;
}
