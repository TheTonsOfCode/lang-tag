import { CallableTranslations, ParameterizedTranslation } from './types';

/**
 * Resolves a translation function from a nested translation object using a path array.
 * @template T - The type of the translations object.
 * @param translations The object containing translation functions.
 * @param path An array of keys representing the path to the function.
 * @returns The translation function, or null if not found or invalid.
 * @internal
 */
function resolveTranslationFunction<T>(
    translations: CallableTranslations<T>,
    path: string[]
): ParameterizedTranslation | null {
    let current: any = translations;

    for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return null;
        }
    }

    return typeof current === 'function'
        ? (current as ParameterizedTranslation)
        : null;
}

/**
 * Retrieves a translation function from a nested translation object.
 * Prefer passing path segments from `unprefixedPath` (a `string[]`) so keys that
 * contain `.` are not incorrectly split. A dotted string is still accepted for
 * backward compatibility, but cannot represent keys that themselves contain `.`.
 * @template T - The type of the translations object.
 * @param translations The object containing translation functions.
 * @param path Unprefixed path segments, or a dotted string (e.g. `"user.profile.greeting"`).
 * @returns The translation function, or null if not found or invalid.
 */
export function lookupTranslation<T>(
    translations: CallableTranslations<T>,
    path: string | string[]
): ParameterizedTranslation | null {
    const pathSegments = Array.isArray(path) ? path : path.split('.');
    return resolveTranslationFunction(translations, pathSegments);
}
