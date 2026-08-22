/**
 * Built-in placeholder regexes.
 * =============================
 *
 * One runtime pattern per core extractor in `lang-tag`
 * (`placeholders-extractors`). Pass the name as `syntax` on
 * `processPlaceholders`, or reuse a regex from
 * {@link PLACEHOLDER_PATTERNS} in your own `transform`.
 *
 * The **first capture group** is always the placeholder name (trimmed
 * by the processor). Patterns that share a delimiter (`{` / `{{`,
 * `$name` / `${…}`, `%name%` / `%{…}`, `[` / `[[`) use the same
 * exclusions as the type-level extractors.
 */

/** Ready-made syntax names — one per core `*Extractor`. */
export const PLACEHOLDER_PATTERNS = {
    /** `DoubleBraceExtractor` — `{{ name }}`. */
    doubleBrace: /{{(.*?)}}/g,
    /** `DollarBraceExtractor` — `${ name }`. */
    dollarBrace: /\$\{(.*?)\}/g,
    /** `SingleBraceExtractor` — `{ name }`. Skips `{{ … }}` pairs. */
    singleBrace: /(?<!{){([^{}]*)}(?!})/g,
    /** `PercentBraceExtractor` — `%{ name }`. */
    percentBrace: /%\{(.*?)\}/g,
    /**
     * `PercentPercentExtractor` — `%name%`.
     * Skips `%{…` (belongs to `percentBrace`).
     */
    percentPercent: /%(?!\{)(.*?)%/g,
    /**
     * `ColonExtractor` — `:name`.
     * Name shape: `^[a-zA-Z_][a-zA-Z0-9_-]*$`.
     */
    colon: /:([a-zA-Z_][a-zA-Z0-9_-]*)/g,
    /**
     * `DollarIdentExtractor` — `$name`.
     * Skips `${…` (belongs to `dollarBrace`).
     * Name shape: `^[a-zA-Z_][a-zA-Z0-9_-]*$`.
     */
    dollarIdent: /\$(?!\{)([a-zA-Z_][a-zA-Z0-9_-]*)/g,
    /**
     * `AngleBracketExtractor` — `<name>`.
     * Skips HTML-like tags (`</…>`, spaces, `/` inside).
     */
    angleBracket: /<([^/>\s]+)>/g,
    /** `DoubleSquareExtractor` — `[[ name ]]`. */
    doubleSquare: /\[\[(.*?)\]\]/g,
    /** `SingleSquareExtractor` — `[ name ]`. Skips `[[ … ]]` pairs. */
    singleSquare: /(?<!\[)\[([^\[\]]*)](?!\])/g,
} as const;

/** Built-in placeholder syntax (one per core extractor). */
export type PlaceholderSyntax = keyof typeof PLACEHOLDER_PATTERNS;

const DEFAULT_SYNTAX: PlaceholderSyntax = 'doubleBrace';

/** Resolves a built-in syntax name to its regex. Defaults to `doubleBrace`. */
export function resolvePlaceholderPattern(syntax?: PlaceholderSyntax): RegExp {
    return PLACEHOLDER_PATTERNS[syntax ?? DEFAULT_SYNTAX];
}
