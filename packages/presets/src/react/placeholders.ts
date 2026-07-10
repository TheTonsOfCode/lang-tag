/**
 * React placeholder processor.
 * ============================
 *
 * Replaces `{{ name }}` placeholders in a translation string with the values
 * from `params`. Unlike a plain string interpolation, values may be React
 * nodes (e.g. a `<Link>`): when at least one placeholder resolves to a React
 * element the result is a React fragment tree, otherwise a plain string is
 * returned.
 *
 * The return type is declared as `string` on purpose so it drops into the
 * `transform` step of a lang tag (whose value type is `string`) while still
 * being renderable as JSX by React. Wire it up in your tag, e.g.:
 *
 * ```ts
 * createCallableTranslations(translations, config, {
 *     transform: ({ value, params }) => processPlaceholders(value, params),
 * });
 * ```
 *
 * `react` is an optional peer dependency — only pull in this module when your
 * project already renders with React.
 */
import * as React from 'react';
import type { ReactNode } from 'react';

/** The default placeholder syntax: `{{ name }}`. */
const DEFAULT_PLACEHOLDER_PATTERN = /{{(.*?)}}/g;

/** Options controlling how placeholders are matched. */
export interface ProcessPlaceholdersOptions {
    /**
     * Regex matching a single placeholder, with the **placeholder name in the
     * first capture group**. The global (`g`) flag is added automatically if
     * missing. Defaults to `/{{(.*?)}}/g` (i.e. `{{ name }}`).
     * @example
     * // `${ name }` syntax instead of `{{ name }}`:
     * processPlaceholders(value, params, { pattern: /\$\{(.*?)\}/g });
     */
    pattern?: RegExp;
}

/** Ensures the regex carries the global flag so every match is visited. */
function toGlobalPattern(pattern: RegExp): RegExp {
    return pattern.global
        ? pattern
        : new RegExp(pattern.source, `${pattern.flags}g`);
}

/**
 * Interpolates placeholders in `translation` with `params`.
 * @param translation - The translation string containing placeholder markers
 * (`{{ name }}` by default, or whatever {@link ProcessPlaceholdersOptions.pattern} matches).
 * @param params - Values keyed by placeholder name. React elements are kept as
 * nodes; strings, numbers and booleans are stringified; anything else becomes
 * an empty string.
 * @param options - See {@link ProcessPlaceholdersOptions} (e.g. a custom `pattern`).
 * @returns A plain string when no React nodes are involved, otherwise a React
 * fragment tree (typed as `string` for lang-tag transform compatibility).
 */
export function processPlaceholders(
    translation: string,
    params?: { [key: string]: ReactNode },
    options?: ProcessPlaceholdersOptions
): string {
    if (typeof translation !== 'string') return '';

    const pattern = toGlobalPattern(
        options?.pattern ?? DEFAULT_PLACEHOLDER_PATTERN
    );

    const parts: ReactNode[] = [];
    let lastIndex = 0;

    translation.replace(pattern, (match, placeholder, offset) => {
        if (lastIndex < offset) {
            parts.push(translation.slice(lastIndex, offset));
        }

        const key = placeholder.trim();
        const value = params?.[key];

        if (React.isValidElement(value)) {
            parts.push(value);
        } else if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
        ) {
            parts.push(String(value));
        } else {
            parts.push('');
        }

        lastIndex = offset + match.length;
        return match;
    });

    if (lastIndex < translation.length) {
        parts.push(translation.slice(lastIndex));
    }

    // If there are no react nodes, return as one string.
    if (parts.every((part) => typeof part === 'string')) {
        return parts.join('');
    }

    return parts.map((part, index) =>
        React.isValidElement(part)
            ? React.cloneElement(part, { key: index })
            : React.createElement(React.Fragment, { key: index }, part)
    ) as unknown as string;
}
