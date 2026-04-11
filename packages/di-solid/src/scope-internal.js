/**
 * Builds the options object passed to `parent.scope(id, opt)` from props
 * (everything except `id`).
 *
 * @param {Record<string, unknown>} props
 * @returns {Record<string, unknown>}
 */
export function scopeOptionsFromProps(props) {
    var opt = {};
    for (var k in props) {
        if (k !== "id") opt[k] = props[k];
    }
    return opt;
}

/**
 * Ensures `ref.current` holds a live child scope, recreating it when missing or disposed.
 *
 * @param {{ scope: (id: string, opt: object) => object }} parent
 * @param {string} id
 * @param {Record<string, unknown>} opt
 * @param {{ current: object | null }} ref
 * @returns {object}
 */
export function ensureChildScopeRef(parent, id, opt, ref) {
    var rc = ref.current;
    if (!rc || rc.isDisposed) {
        ref.current = parent.scope(id, opt);
    }
    return ref.current;
}
