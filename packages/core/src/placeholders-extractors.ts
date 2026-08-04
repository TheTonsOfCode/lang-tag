/**
 * Placeholder extractors.
 * =======================
 *
 * Ready-made type-level parsers for common placeholder syntaxes, plus the
 * {@link PlaceholderExtractor} interface for writing your own.
 *
 * These types only drive autocomplete and compile-time checks. Runtime
 * replacement stays in your tag `transform` (or a preset).
 *
 * @example Reuse a built-in
 * ```ts
 * import type { DefinePlaceholderParams, PercentBraceExtractor } from 'lang-tag';
 *
 * type PlaceholderParams = DefinePlaceholderParams<{
 *     extractor: PercentBraceExtractor; // `%{ name }`
 * }>;
 * ```
 *
 * @example Write your own
 * ```ts
 * import type { PlaceholderExtractor, Trim } from 'lang-tag';
 *
 * type ExtractBang<S extends string> =
 *     S extends `${string}!${infer Name}!${infer Rest}`
 *         ? Trim<Name> | ExtractBang<Rest>
 *         : never;
 *
 * interface BangExtractor extends PlaceholderExtractor {
 *     placeholders: ExtractBang<this['template']>;
 * }
 * ```
 */

// ---------------------------------------------------------------------------
// String trimming (placeholder names may contain surrounding spaces).
// ---------------------------------------------------------------------------

/** Whitespace characters trimmed from placeholder names. */
type Whitespace = ' ' | '\n' | '\t' | '\r';
type TrimLeft<S extends string> = S extends `${Whitespace}${infer R}`
    ? TrimLeft<R>
    : S;
type TrimRight<S extends string> = S extends `${infer R}${Whitespace}`
    ? TrimRight<R>
    : S;
/** Removes leading/trailing whitespace from a string literal type. */
export type Trim<S extends string> = TrimLeft<TrimRight<S>>;

/**
 * Character union from a string literal (type-level).
 * @example CharactersOf<'ab'> // 'a' | 'b'
 */
type CharactersOf<S extends string> = S extends `${infer First}${infer Rest}`
    ? First | CharactersOf<Rest>
    : never;

type AlphaLower = CharactersOf<'abcdefghijklmnopqrstuvwxyz'>;
type Alpha = AlphaLower | Uppercase<AlphaLower>;
type Numeric = CharactersOf<'0123456789'>;

/**
 * First character of a `:name` / `$name` identifier: `^[a-zA-Z_]`.
 * Deliberate allow-list (ASCII) — not a deny-list of separators.
 */
type IdentStart = Alpha | '_';

/**
 * Continuation characters: `^[a-zA-Z0-9_-]*` after {@link IdentStart}.
 * Full shape: `^[a-zA-Z_][a-zA-Z0-9_-]*$`.
 */
type IdentContinue = IdentStart | Numeric | '-';

/**
 * Consumes an identifier prefix from `S` matching
 * `^[a-zA-Z_][a-zA-Z0-9_-]*$`. Stops at the first non-matching character.
 */
type TakeIdent<S extends string, Acc extends string = ''> = Acc extends ''
    ? S extends `${infer C}${infer Rest}`
        ? C extends IdentStart
            ? TakeIdent<Rest, C>
            : ''
        : ''
    : S extends `${infer C}${infer Rest}`
      ? C extends IdentContinue
          ? TakeIdent<Rest, `${Acc}${C}`>
          : Acc
      : Acc;

// ---------------------------------------------------------------------------
// Higher-kinded extractor interface
// ---------------------------------------------------------------------------

/**
 * Higher-kinded interface describing a placeholder extractor.
 *
 * An implementation extends this interface and computes
 * {@link PlaceholderExtractor.placeholders} from
 * {@link PlaceholderExtractor.template}. The template is injected by
 * {@link ApplyPlaceholderExtractor}; implementations read it via
 * `this['template']`.
 */
export interface PlaceholderExtractor {
    /** The translation string to analyse (injected by {@link ApplyPlaceholderExtractor}). */
    readonly template: string;
    /** The resulting union of placeholder names. */
    readonly placeholders: string;
}

/** Applies a {@link PlaceholderExtractor} to a concrete translation string. */
export type ApplyPlaceholderExtractor<
    Extractor extends PlaceholderExtractor,
    S extends string,
> = (Extractor & { readonly template: S })['placeholders'];

// ---------------------------------------------------------------------------
// Built-in extract helpers + extractor interfaces
// ---------------------------------------------------------------------------

/**
 * `{{ name }}` — Handlebars / i18next-style (lang-tag default).
 * @example ExtractDoubleBracePlaceholders<'Hello {{name}} from {{ sender }}'> // 'name' | 'sender'
 */
export type ExtractDoubleBracePlaceholders<S extends string> =
    S extends `${string}{{${infer Placeholder}}}${infer Rest}`
        ? Trim<Placeholder> | ExtractDoubleBracePlaceholders<Rest>
        : never;

/** Default extractor: `{{ name }}`. */
export interface DoubleBraceExtractor extends PlaceholderExtractor {
    readonly placeholders: ExtractDoubleBracePlaceholders<this['template']>;
}

/**
 * `${ name }` — JS template-literal style.
 * @example ExtractDollarBracePlaceholders<'Hello ${name}'> // 'name'
 */
export type ExtractDollarBracePlaceholders<S extends string> =
    S extends `${string}${'${'}${infer Placeholder}}${infer Rest}`
        ? Trim<Placeholder> | ExtractDollarBracePlaceholders<Rest>
        : never;

/** Extractor for `${ name }`. */
export interface DollarBraceExtractor extends PlaceholderExtractor {
    readonly placeholders: ExtractDollarBracePlaceholders<this['template']>;
}

/**
 * `{ name }` — single curly braces (Python `str.format`, many i18n libs).
 * Strips `{{ ... }}` pairs first so they are not misread as single-brace names.
 * @example ExtractSingleBracePlaceholders<'Hi {name}, ignore {{raw}}'> // 'name'
 */
export type ExtractSingleBracePlaceholders<S extends string> =
    S extends `${infer Head}{{${string}}}${infer Tail}`
        ? ExtractSingleBracePlaceholders<`${Head}${Tail}`>
        : S extends `${string}{${infer Placeholder}}${infer Rest}`
          ? Trim<Placeholder> | ExtractSingleBracePlaceholders<Rest>
          : never;

/** Extractor for `{ name }`. */
export interface SingleBraceExtractor extends PlaceholderExtractor {
    readonly placeholders: ExtractSingleBracePlaceholders<this['template']>;
}

/**
 * `%{ name }` — Ruby / some i18n libs.
 * @example ExtractPercentBracePlaceholders<'Hello %{name}'> // 'name'
 */
export type ExtractPercentBracePlaceholders<S extends string> =
    S extends `${string}%{${infer Placeholder}}${infer Rest}`
        ? Trim<Placeholder> | ExtractPercentBracePlaceholders<Rest>
        : never;

/** Extractor for `%{ name }`. */
export interface PercentBraceExtractor extends PlaceholderExtractor {
    readonly placeholders: ExtractPercentBracePlaceholders<this['template']>;
}

/**
 * `%name%` — percent-wrapped names.
 * @example ExtractPercentPercentPlaceholders<'Hello %name%'> // 'name'
 */
export type ExtractPercentPercentPlaceholders<S extends string> =
    S extends `${string}%${infer Placeholder}%${infer Rest}`
        ? Placeholder extends `{${string}`
            ? // `%{…` belongs to {@link ExtractPercentBracePlaceholders} — skip
              ExtractPercentPercentPlaceholders<`${Placeholder}%${Rest}`>
            : Trim<Placeholder> | ExtractPercentPercentPlaceholders<Rest>
        : never;

/** Extractor for `%name%`. */
export interface PercentPercentExtractor extends PlaceholderExtractor {
    readonly placeholders: ExtractPercentPercentPlaceholders<this['template']>;
}

/**
 * `:name` — Express / route-style placeholders.
 * Name shape: `^[a-zA-Z_][a-zA-Z0-9_-]*$` (ASCII allow-list).
 * @example ExtractColonPlaceholders<'Hello :name!'> // 'name'
 * @example ExtractColonPlaceholders<'Hi :user_id / :order-id'> // 'user_id' | 'order-id'
 */
export type ExtractColonPlaceholders<S extends string> =
    S extends `${string}:${infer Rest}`
        ? TakeIdent<Rest> extends infer Name extends string
            ? Name extends ''
                ? ExtractColonPlaceholders<Rest>
                : Rest extends `${Name}${infer After}`
                  ? Name | ExtractColonPlaceholders<After>
                  : Name
            : never
        : never;

/** Extractor for `:name`. */
export interface ColonExtractor extends PlaceholderExtractor {
    readonly placeholders: ExtractColonPlaceholders<this['template']>;
}

/**
 * `$name` — dollar-prefixed identifiers (not `${ name }`).
 * Name shape: `^[a-zA-Z_][a-zA-Z0-9_-]*$` (ASCII allow-list).
 * @example ExtractDollarIdentPlaceholders<'Hello $name'> // 'name'
 * @example ExtractDollarIdentPlaceholders<'Hi $user_id'> // 'user_id'
 */
export type ExtractDollarIdentPlaceholders<S extends string> =
    S extends `${string}$${infer Rest}`
        ? Rest extends `{${string}`
            ? // `${…` — leave for {@link ExtractDollarBracePlaceholders}
              ExtractDollarIdentPlaceholders<Rest>
            : TakeIdent<Rest> extends infer Name extends string
              ? Name extends ''
                  ? ExtractDollarIdentPlaceholders<Rest>
                  : Rest extends `${Name}${infer After}`
                    ? Name | ExtractDollarIdentPlaceholders<After>
                    : Name
              : never
        : never;

/** Extractor for `$name` (not `${ name }`). */
export interface DollarIdentExtractor extends PlaceholderExtractor {
    readonly placeholders: ExtractDollarIdentPlaceholders<this['template']>;
}

/**
 * `<name>` — simple angle-bracket placeholders (not HTML tags with `/` or spaces).
 * @example ExtractAngleBracketPlaceholders<'Hello <name>'> // 'name'
 */
export type ExtractAngleBracketPlaceholders<S extends string> =
    S extends `${string}<${infer Placeholder}>${infer Rest}`
        ? Placeholder extends
              | `/${string}`
              | `${string} ${string}`
              | `${string}/${string}`
            ? ExtractAngleBracketPlaceholders<Rest>
            : Trim<Placeholder> | ExtractAngleBracketPlaceholders<Rest>
        : never;

/** Extractor for `<name>`. */
export interface AngleBracketExtractor extends PlaceholderExtractor {
    readonly placeholders: ExtractAngleBracketPlaceholders<this['template']>;
}

/**
 * `[[ name ]]` — double square brackets.
 * @example ExtractDoubleSquarePlaceholders<'Hello [[name]]'> // 'name'
 */
export type ExtractDoubleSquarePlaceholders<S extends string> =
    S extends `${string}[[${infer Placeholder}]]${infer Rest}`
        ? Trim<Placeholder> | ExtractDoubleSquarePlaceholders<Rest>
        : never;

/** Extractor for `[[ name ]]`. */
export interface DoubleSquareExtractor extends PlaceholderExtractor {
    readonly placeholders: ExtractDoubleSquarePlaceholders<this['template']>;
}

/**
 * `[ name ]` — single square brackets.
 * Strips `[[ ... ]]` pairs first so they are not misread as single-bracket names.
 * @example ExtractSingleSquarePlaceholders<'Hi [name], ignore [[raw]]'> // 'name'
 */
export type ExtractSingleSquarePlaceholders<S extends string> =
    S extends `${infer Head}[[${string}]]${infer Tail}`
        ? ExtractSingleSquarePlaceholders<`${Head}${Tail}`>
        : S extends `${string}[${infer Placeholder}]${infer Rest}`
          ? Trim<Placeholder> | ExtractSingleSquarePlaceholders<Rest>
          : never;

/** Extractor for `[ name ]`. */
export interface SingleSquareExtractor extends PlaceholderExtractor {
    readonly placeholders: ExtractSingleSquarePlaceholders<this['template']>;
}
