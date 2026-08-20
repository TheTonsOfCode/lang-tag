/**
 * Lang-tag special functions.
 * ==========================
 *
 * A unique symbol brands functions that are not translation leaves
 * (`$`, future `plural` / `count`, …). Record-typed `InputType`s accept
 * these branded callables and reject plain extra functions.
 */

export const LangTagSpecial: unique symbol = Symbol.for('lang-tag.special');

/**
 * Well-known kinds. The type is open (`string & {}`) so a preset can
 * introduce a new kind without a core release.
 */
export type LangTagSpecialKind = 'dynamic-caller' | (string & {});

/**
 * A function branded with {@link LangTagSpecial}.
 * @template Kind - Discriminant stored on the symbol (e.g. `'dynamic-caller'`).
 * @template Fn - The underlying call signature.
 */
export type LangTagSpecialFn<
    Kind extends LangTagSpecialKind = LangTagSpecialKind,
    Fn extends (...args: any[]) => any = (...args: never[]) => string,
> = Fn & {
    readonly [LangTagSpecial]: Kind;
};

/**
 * Brands `fn` as a lang-tag special. The symbol is non-enumerable.
 */
export function markLangTagSpecial<
    const Kind extends LangTagSpecialKind,
    F extends (...args: any[]) => any,
>(fn: F, kind: Kind): LangTagSpecialFn<Kind, F> {
    Object.defineProperty(fn, LangTagSpecial, {
        value: kind,
        enumerable: false,
        configurable: true,
    });
    return fn as LangTagSpecialFn<Kind, F>;
}

export function isLangTagSpecial(value: unknown): value is LangTagSpecialFn {
    return typeof value === 'function' && LangTagSpecial in value;
}
