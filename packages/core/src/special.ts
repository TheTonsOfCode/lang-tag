/**
 * Lang-tag specials.
 * =================
 *
 * {@link LangTagSpecial} brands a value with a {@link LangTagSpecialKind}.
 * Functions (`$`, a custom `callerName`, future `plural` / `count`) are not
 * translation leaves — Record `InputType`s accept them and reject plain
 * extra functions.
 *
 * The same brand on a translations object is the overlap for a weak named
 * node (`delete: {}` → `{ [caller]: Special }`) so it assigns into
 * `PartialFlexibleTranslations` regardless of the special's property name.
 */

export const LangTagSpecial: unique symbol = Symbol.for('lang-tag.special');

/**
 * Well-known kinds. The type is open (`string & {}`) so a preset can
 * introduce a new kind without a core release.
 */
export type LangTagSpecialKind = 'dynamic-caller' | (string & {});

/**
 * A value branded with {@link LangTagSpecial} and a {@link LangTagSpecialKind}.
 */
export type LangTagSpecialBrand<
    Kind extends LangTagSpecialKind = LangTagSpecialKind,
> = {
    readonly [LangTagSpecial]: Kind;
};

/**
 * A function branded with {@link LangTagSpecial}.
 * @template Kind - Discriminant stored on the symbol (e.g. `'dynamic-caller'`).
 * @template Fn - The underlying call signature.
 */
export type LangTagSpecialFn<
    Kind extends LangTagSpecialKind = LangTagSpecialKind,
    Fn extends (...args: any[]) => any = (...args: never[]) => string,
> = Fn & LangTagSpecialBrand<Kind>;

/**
 * Brands `value` as a lang-tag special. The symbol is non-enumerable.
 * Works on functions (callers) and on objects that carry them.
 */
export function markLangTagSpecial<
    const Kind extends LangTagSpecialKind,
    T extends object,
>(value: T, kind: Kind): T & LangTagSpecialBrand<Kind> {
    Object.defineProperty(value, LangTagSpecial, {
        value: kind,
        enumerable: false,
        configurable: true,
    });
    return value as T & LangTagSpecialBrand<Kind>;
}

export function isLangTagSpecial(value: unknown): value is LangTagSpecialFn {
    return typeof value === 'function' && LangTagSpecial in value;
}
