import {
    LangTagSpecialBrand,
    LangTagSpecialFn,
    isLangTagSpecial,
} from './special';
import {
    CallableTranslations,
    InterpolationParams,
    ParameterizedTranslation,
} from './types';

/**
 * Helper type to determine the flexible value of a translation property.
 * If `T` is a function returning a string, it can be `T` or `string`.
 * If `T` is a record, it recursively applies `RecursiveFlexibleTranslations`.
 * Otherwise, it can be `ParameterizedTranslation`, `T`, or `string`.
 * @template T - The type of the property value.
 * @template IsPartial - A boolean indicating whether properties should be optional.
 */
type FlexibleValue<T, IsPartial extends boolean> = T extends (
    ...args: any[]
) => string
    ? T | string
    : T extends Record<string, any>
      ? RecursiveFlexibleTranslations<T, IsPartial>
      : ParameterizedTranslation | T | string;

/**
 * Core type for flexible translations, allowing properties to be optional recursively.
 * This type serves as the foundation for `FlexibleTranslations` and `PartialFlexibleTranslations`.
 * It transforms a given translation structure `T` into a flexible version where each property
 * can be its original type, a string, or a `ParameterizedTranslation` function.
 * If `IsPartial` is true, all properties at all levels of nesting become optional.
 *
 * Every node carries an optional {@link LangTagSpecialBrand}, so a recursive
 * dynamic caller on a weak named object (`delete: {}` → `{ [caller]: Special }`)
 * assigns regardless of `callerName`. String-index (`Record`) schemas
 * additionally accept {@link LangTagSpecialFn} on the index.
 *
 * @template T The original, un-transformed, structure of the translations.
 * @template IsPartial A boolean indicating whether properties should be optional.
 *   If true, all properties at all levels become optional (e.g., `string | undefined`).
 *   If false, properties are required (e.g., `string`).
 */

type FlexibleObject<T, IsPartial extends boolean> = IsPartial extends true
    ? {
          [P in keyof T]?:
              | FlexibleValue<T[P], IsPartial>
              | (string extends keyof T ? LangTagSpecialFn : never);
      }
    : {
          [P in keyof T]:
              | FlexibleValue<T[P], IsPartial>
              | (string extends keyof T ? LangTagSpecialFn : never);
      };

export type RecursiveFlexibleTranslations<
    T,
    IsPartial extends boolean,
> = FlexibleObject<T, IsPartial> & Partial<LangTagSpecialBrand>;

/**
 * Represents a flexible structure for translations where all properties are required, based on an original type `T`.
 * Allows for strings, `ParameterizedTranslation` functions, or other compatible functions
 * at any level of the translation object. This provides flexibility in how translations
 * are initially defined.
 * This type is an alias for `RecursiveFlexibleTranslations<T, false>`.
 * @template T - The original structure of the translations.
 */
export type FlexibleTranslations<T> = RecursiveFlexibleTranslations<T, false>;

/**
 * Represents a deeply partial version of the structure that `FlexibleTranslations<T>` would produce, based on an original type `T`.
 * All properties at all levels of nesting are made optional.
 * The transformation rules for property types mirror those in `FlexibleTranslations<T>`.
 * This type is an alias for `RecursiveFlexibleTranslations<T, true>`.
 * @template T - The original, un-transformed, structure of the translations. This is the same kind of type argument that `FlexibleTranslations<T>` expects.
 */
export type PartialFlexibleTranslations<T> = RecursiveFlexibleTranslations<
    T,
    true
>;

/**
 * Normalizes a `FlexibleTranslations` or `PartialFlexibleTranslations` object into a `CallableTranslations` object.
 * Converts plain strings into `ParameterizedTranslation` functions and ensures
 * that all callable elements conform to the `ParameterizedTranslation` signature.
 * Only properties present in the input `translations` object will be processed and included in the result.
 * @template T - The structure of the original translations.
 * @param translations - The flexible or partial flexible translations object to normalize.
 * @returns A `CallableTranslations` object. The returned object will only contain callable translations for properties that were present in the input `translations` object.
 */
export function normalizeTranslations<T>(
    translations: RecursiveFlexibleTranslations<T, boolean>
): CallableTranslations<T> {
    const result: Record<string, unknown> = {};
    const source = translations as Record<string, unknown>;

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const value = source[key];

            if (value === null || value === undefined) {
                continue;
            }

            if (
                typeof value === 'object' &&
                !Array.isArray(value) &&
                !(value instanceof Function)
            ) {
                // Recursively normalize nested objects
                result[key] = normalizeTranslations(
                    value as RecursiveFlexibleTranslations<any, boolean>
                );
            } else if (typeof value === 'string') {
                // Convert string to a ParameterizedTranslation
                result[key] = (_params?: InterpolationParams) => value;
            } else if (typeof value === 'function') {
                if (isLangTagSpecial(value)) {
                    continue;
                }
                // Assume functions are already ParameterizedTranslation or compatible
                result[key] = value;
            }
            // else {
            //     // For other types (e.g., number, boolean), convert to string and then to ParameterizedTranslation
            //     const stringValue = String(value);
            //     result[key] = ((_params?: InterpolationParams) => stringValue) as any;
            // }
        }
    }
    return result as CallableTranslations<T>;
}
