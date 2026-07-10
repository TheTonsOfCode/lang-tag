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
import type { CallableTranslations, PlaceholderParamsOptions } from 'lang-tag';

/**
 * A dynamic caller: invokes a translation by its (runtime) key and returns the
 * resulting string. Extra arguments are forwarded to the resolved translation
 * function (typically its interpolation params).
 *
 * @template Keys - The allowed key type. Defaults to `string` (any key). When
 * the {@link DynamicCallerPresetOptions.typedKeys | typedKeys} option is enabled
 * this is narrowed to the union of the object's translation keys, so the editor
 * autocompletes valid keys and rejects unknown ones at compile time.
 */
export type DynamicCaller<Keys extends string = string> = (
    key: Keys,
    ...params: any[]
) => string;

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
 * Options controlling how the dynamic caller is injected.
 * @template Caller - The literal name used for the caller property. Defaults to `'$'`.
 */
export interface DynamicCallerPresetOptions<Caller extends string = '$'> {
    /**
     * Whether to add the caller recursively to every nested translations object.
     * Defaults to `false` (only the top level receives the caller).
     */
    recursive?: boolean;
    /** Name of the caller property. Defaults to `'$'`. */
    callerName?: Caller;
    /**
     * Called when a key cannot be resolved to a translation function. Receives the
     * path of the missing key and returns the string to use in its place. When
     * `recursive` is enabled the path is the full dotted path (e.g. `a.b.foo`),
     * otherwise it is just the key. Defaults to `` `#Missing:${path}#` ``.
     */
    onMissing?: (path: string) => string;
    /**
     * When `true`, the caller's `key` argument is typed to the object's actual
     * translation keys ({@link DynamicCallerKeys}) instead of `string`, so the
     * editor autocompletes valid keys and rejects unknown ones at compile time.
     * Defaults to `false` (any `string` key is accepted). Purely a type-level
     * switch — it has no effect at runtime.
     */
    typedKeys?: boolean;
}

/**
 * The result of {@link withDynamicCaller}: the original translations structure
 * with the caller property added. When `Recursive` is `true` the caller is also
 * present on every nested object; translation functions are left untouched.
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
    TypedKeys extends boolean = false,
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
};

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
 * t.$('greeting', { name: 'Paul' });
 * @example
 * const t = withDynamicCaller(base.server(), {
 *     recursive: true,
 *     callerName: 'call',
 *     onMissing: (path) => `[[${path}]]`,
 * });
 * t.user.call('name');
 * @example
 * // typedKeys narrows the caller's key to the translation keys:
 * const t = withDynamicCaller(base.server(), { typedKeys: true });
 * t.$('greeting'); // ok
 * t.$('nope');     // compile-time error
 */
export function withDynamicCaller<
    T extends Record<string, any>,
    const Caller extends string = '$',
    Recursive extends boolean = false,
    TypedKeys extends boolean = false,
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

        result[callerName] = ((key: string, ...params: any[]) => {
            const translationFn = obj[key];
            if (typeof translationFn === 'function') {
                return translationFn(...params);
            }
            const missingPath = basePath ? `${basePath}.${key}` : key;
            return onMissing
                ? onMissing(missingPath)
                : `#Missing:${missingPath}#`;
        }) satisfies DynamicCaller;

        return result;
    };

    return wrap(translations, '') as WithDynamicCaller<
        T,
        Caller,
        Recursive,
        TypedKeys
    >;
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
    TypedKeys extends boolean = false,
> = WithDynamicCaller<
    CallableTranslations<T, PPO>,
    Caller,
    Recursive,
    TypedKeys
>;
