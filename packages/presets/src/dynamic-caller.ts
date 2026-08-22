/**
 * Dynamic caller preset.
 * =======================
 *
 * Adds a dynamic caller property (named `$` by default) to a callable
 * translations object, allowing a translation to be invoked by a runtime
 * computed key instead of statically. Missing keys are resolved through an
 * optional {@link DynamicCallerPresetOptions.onMissing} handler.
 *
 * When {@link DynamicCallerPresetOptions.recursive} is enabled the caller is
 * added to every nested translations object as well, and the `path` reported to
 * `onMissing` is the full dotted path of the missing key (e.g. `user.profile.name`).
 */
import {
    type CallableTranslations,
    type LangTagSpecialBrand,
    type LangTagSpecialFn,
    type PlaceholderParamsOptions,
    markLangTagSpecial,
} from 'lang-tag';

/**
 * A dynamic caller: invokes a translation by its (runtime) key and returns the
 * resulting string. Extra arguments are forwarded to the resolved translation
 * function (typically its interpolation params).
 *
 * @template Keys - The allowed key type. Defaults to the union of the object's
 * translation keys when {@link DynamicCallerPresetOptions.typedKeys | typedKeys}
 * is enabled (the default), so the editor autocompletes valid keys and rejects
 * unknown ones at compile time. Pass `typedKeys: false` to keep `string`.
 */
export type DynamicCaller<Keys extends string = string> = LangTagSpecialFn<
    'dynamic-caller',
    (key: Keys, ...params: any[]) => string
>;

/**
 * The union of keys on `T` that resolve to a callable translation (i.e. the
 * keys the dynamic caller can actually invoke). Nested translation objects are
 * excluded — navigate to those via property access. Used to type the caller
 * when {@link DynamicCallerPresetOptions.typedKeys | typedKeys} is enabled.
 */
export type DynamicCallerKeys<T> = Extract<
    {
        [K in keyof T]: NonNullable<T[K]> extends (...args: any[]) => any
            ? K
            : never;
    }[keyof T],
    string
>;

/**
 * Shared options for {@link withDynamicCaller} and {@link asDynamicCaller}.
 */
export interface DynamicCallerBaseOptions {
    /**
     * Whether the caller is applied recursively to every nested translations
     * object. Defaults to `false` (only the top level).
     */
    recursive?: boolean;
    /**
     * Called when a key cannot be resolved to a translation function. Receives the
     * path of the missing key and returns the string to use in its place. When
     * `recursive` is enabled the path is the full dotted path (e.g. `a.b.foo`),
     * otherwise it is just the key. Defaults to `` `#Missing:${path}#` ``.
     */
    onMissing?: (path: string) => string;
    /**
     * When `true` (default), the caller's `key` argument is typed to the object's
     * actual translation keys ({@link DynamicCallerKeys}) instead of `string`, so
     * the editor autocompletes valid keys and rejects unknown ones at compile time.
     * Pass `false` to accept any `string` key. Purely a type-level switch — no
     * runtime effect.
     */
    typedKeys?: boolean;
}

/**
 * Options controlling how the dynamic caller property is injected.
 * @template Caller - The literal name used for the caller property. Defaults to `'$'`.
 */
export interface DynamicCallerPresetOptions<
    Caller extends string = '$',
> extends DynamicCallerBaseOptions {
    /** Name of the caller property. Defaults to `'$'`. */
    callerName?: Caller;
}

/**
 * Options for {@link asDynamicCaller}. Same as {@link DynamicCallerBaseOptions}
 * — there is no `callerName` because the translations object itself is the
 * caller (`t('greeting')`).
 */
export type AsDynamicCallerPresetOptions = DynamicCallerBaseOptions;

/**
 * The result of {@link withDynamicCaller}: the original translations structure
 * with the caller property added. When `Recursive` is `true` the caller is also
 * present on every nested object; translation functions are left untouched.
 * Every wrapped object is a {@link LangTagSpecialBrand} of kind
 * `'dynamic-caller'` so it assigns into a library `InputType` even when
 * the caller name is not `'$'`.
 * @template T - The callable translations structure.
 * @template Caller - The literal name of the caller property.
 * @template Recursive - Whether the caller was added recursively.
 * @template TypedKeys - Whether the caller's key argument is narrowed to the
 * object's translation keys (see {@link DynamicCallerPresetOptions.typedKeys}).
 */
export type WithDynamicCaller<
    T,
    Caller extends string,
    Recursive extends boolean,
    TypedKeys extends boolean = true,
> = {
    [K in keyof T]: Recursive extends true
        ? T[K] extends (...args: any[]) => any
            ? T[K]
            : T[K] extends Record<string, any>
              ? WithDynamicCaller<T[K], Caller, Recursive, TypedKeys>
              : T[K]
        : T[K];
} & {
    [P in Caller]: DynamicCaller<
        TypedKeys extends true ? DynamicCallerKeys<T> : string
    >;
} & LangTagSpecialBrand<'dynamic-caller'>;

function createDynamicCallerFn(
    obj: Record<string, any>,
    basePath: string,
    onMissing?: (path: string) => string
): DynamicCaller {
    return markLangTagSpecial((key: string, ...params: any[]) => {
        const translationFn = obj[key];
        if (typeof translationFn === 'function') {
            return translationFn(...params);
        }
        const missingPath = basePath ? `${basePath}.${key}` : key;
        return onMissing ? onMissing(missingPath) : `#Missing:${missingPath}#`;
    }, 'dynamic-caller');
}

/**
 * Wraps a callable translations object with a dynamic caller property.
 * @template T - The source translations structure.
 * @template Caller - The literal caller name (inferred from `options.callerName`).
 * @template Recursive - Whether the caller is added recursively (inferred from `options.recursive`).
 * @template TypedKeys - Whether the caller's key is typed to the translation keys (inferred from `options.typedKeys`).
 * @param translations - The callable translations object to wrap.
 * @param options - See {@link DynamicCallerPresetOptions}.
 * @returns The translations object with the caller property added.
 * @example
 * const t = withDynamicCaller(base.server());
 * t.$('greeting', { name: 'Paul' }); // key narrowed to translation keys by default
 * t.$('nope'); // compile-time error
 * @example
 * const t = withDynamicCaller(base.server(), {
 *     recursive: true,
 *     callerName: 'call',
 *     onMissing: (path) => `[[${path}]]`,
 * });
 * t.user.call('name');
 * @example
 * // Opt out of key narrowing when you need an open string key:
 * const t = withDynamicCaller(base.server(), { typedKeys: false });
 * t.$('any-runtime-key'); // ok
 */
export function withDynamicCaller<
    T extends Record<string, any>,
    const Caller extends string = '$',
    Recursive extends boolean = false,
    TypedKeys extends boolean = true,
>(
    translations: T,
    options: {
        recursive?: Recursive;
        callerName?: Caller;
        onMissing?: (path: string) => string;
        typedKeys?: TypedKeys;
    } = {}
): WithDynamicCaller<T, Caller, Recursive, TypedKeys> {
    const {
        recursive = false,
        callerName = '$' as Caller,
        onMissing,
    } = options;

    const wrap = (
        obj: Record<string, any>,
        basePath: string
    ): Record<string, any> => {
        const result: Record<string, any> = {};

        for (const [key, value] of Object.entries(obj)) {
            if (
                recursive &&
                value &&
                typeof value === 'object' &&
                !Array.isArray(value)
            ) {
                const childPath = basePath ? `${basePath}.${key}` : key;
                result[key] = wrap(value, childPath);
            } else {
                result[key] = value;
            }
        }

        // Non-enumerable so `for…in` / Object.entries / normalizeTranslations
        // do not treat the caller as a translation key.
        Object.defineProperty(result, callerName, {
            enumerable: false,
            configurable: true,
            writable: true,
            value: createDynamicCallerFn(obj, basePath, onMissing),
        });

        return markLangTagSpecial(result, 'dynamic-caller');
    };

    return wrap(translations, '') as WithDynamicCaller<
        T,
        Caller,
        Recursive,
        TypedKeys
    >;
}

/**
 * The result of {@link asDynamicCaller}: the translations structure is itself
 * the dynamic caller (`t('greeting')`). When `Recursive` is `true` every
 * nested object is also callable; translation functions are left untouched.
 * @template T - The callable translations structure.
 * @template Recursive - Whether nested objects are also callable.
 * @template TypedKeys - Whether the caller's key argument is narrowed to the
 * object's translation keys (see {@link DynamicCallerBaseOptions.typedKeys}).
 */
export type AsDynamicCaller<
    T,
    Recursive extends boolean,
    TypedKeys extends boolean = true,
> = {
    [K in keyof T]: Recursive extends true
        ? T[K] extends (...args: any[]) => any
            ? T[K]
            : T[K] extends Record<string, any>
              ? AsDynamicCaller<T[K], Recursive, TypedKeys>
              : T[K]
        : T[K];
} & DynamicCaller<TypedKeys extends true ? DynamicCallerKeys<T> : string>;

/**
 * Makes a callable translations object itself a dynamic caller: `t('greeting')`
 * in addition to `t.greeting()`. Same options as {@link withDynamicCaller}
 * except there is no `callerName`.
 * @template T - The source translations structure.
 * @template Recursive - Whether nested objects are also callable (inferred from `options.recursive`).
 * @template TypedKeys - Whether the caller's key is typed to the translation keys (inferred from `options.typedKeys`).
 * @param translations - The callable translations object to wrap.
 * @param options - See {@link AsDynamicCallerPresetOptions}.
 * @returns The translations object, callable as a {@link DynamicCaller}.
 * @example
 * const t = asDynamicCaller(base.server());
 * t.greeting({ name: 'Paul' });
 * t('greeting', { name: 'Paul' });
 * t('nope'); // compile-time error when typedKeys is on
 * @example
 * const t = asDynamicCaller(base.server(), {
 *     recursive: true,
 *     onMissing: (path) => `[[${path}]]`,
 * });
 * t.user('name');
 * @example
 * const t = asDynamicCaller(base.server(), { typedKeys: false });
 * t('any-runtime-key');
 */
export function asDynamicCaller<
    T extends Record<string, any>,
    Recursive extends boolean = false,
    TypedKeys extends boolean = true,
>(
    translations: T,
    options: {
        recursive?: Recursive;
        onMissing?: (path: string) => string;
        typedKeys?: TypedKeys;
    } = {}
): AsDynamicCaller<T, Recursive, TypedKeys> {
    const { recursive = false, onMissing } = options;

    const wrap = (
        obj: Record<string, any>,
        basePath: string
    ): Record<string, any> => {
        const result = createDynamicCallerFn(
            obj,
            basePath,
            onMissing
        ) as DynamicCaller & Record<string, any>;

        for (const [key, value] of Object.entries(obj)) {
            const next =
                recursive &&
                value &&
                typeof value === 'object' &&
                !Array.isArray(value)
                    ? wrap(value, basePath ? `${basePath}.${key}` : key)
                    : value;
            // Functions have read-only `name` / `length`; assignment throws
            // on keys like `user.name`. defineProperty overwrites them.
            Object.defineProperty(result, key, {
                enumerable: true,
                configurable: true,
                writable: true,
                value: next,
            });
        }

        return result;
    };

    return wrap(translations, '') as AsDynamicCaller<T, Recursive, TypedKeys>;
}

/**
 * Convenience alias documenting the intended input: a
 * {@link CallableTranslations} object produced by a lang tag.
 * @template T - The static translations structure.
 * @template PPO - The {@link PlaceholderParamsOptions} bundle used for the tag.
 */
export type CallableTranslationsWithDynamicCaller<
    T,
    PPO extends PlaceholderParamsOptions = {},
    Caller extends string = '$',
    Recursive extends boolean = false,
    TypedKeys extends boolean = true,
> = WithDynamicCaller<
    CallableTranslations<T, PPO>,
    Caller,
    Recursive,
    TypedKeys
>;

/**
 * Convenience alias: {@link CallableTranslations} made callable via
 * {@link asDynamicCaller}.
 */
export type CallableTranslationsAsDynamicCaller<
    T,
    PPO extends PlaceholderParamsOptions = {},
    Recursive extends boolean = false,
    TypedKeys extends boolean = true,
> = AsDynamicCaller<CallableTranslations<T, PPO>, Recursive, TypedKeys>;
