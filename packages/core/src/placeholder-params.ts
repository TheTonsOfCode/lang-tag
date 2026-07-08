import type { InterpolationParams, ParameterizedTranslation } from './types';

/**
 * Placeholder parameter inference.
 * ================================
 *
 * This file owns everything related to turning a translation string with `{{ name }}`
 * placeholders into a typed parameters object. It is intentionally decoupled from the
 * rest of the core so that:
 *
 *   1. `lang-tag` supports the `{{ name }}` placeholder syntax out of the box
 *      (see {@link DoubleBraceExtractor}), and
 *   2. consumers who need a different placeholder syntax (e.g. `${name}`) can
 *      plug in their own extractor via the {@link PlaceholderExtractor} higher-kinded
 *      interface — without patching core.
 *
 * Nothing here is strictly enforced at runtime: placeholder replacement happens
 * in the generated tag (`processPlaceholders`), which the consumer owns. These
 * types only drive editor autocomplete and compile-time parameter checking.
 */

// ---------------------------------------------------------------------------
// String trimming helpers (placeholder names may contain surrounding spaces).
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

// ---------------------------------------------------------------------------
// Placeholder extractors (the pieces that are meant to be swappable).
// ---------------------------------------------------------------------------

/**
 * Extracts the union of placeholder names from a `{{ name }}` translation string.
 * This is the default syntax supported by `lang-tag`.
 * Resolves to `never` when the string contains no placeholders.
 * @example ExtractDoubleBracePlaceholders<'Hello {{name}} from {{ sender }}'> // 'name' | 'sender'
 */
export type ExtractDoubleBracePlaceholders<S extends string> =
    S extends `${string}{{${infer Placeholder}}}${infer Rest}`
        ? Trim<Placeholder> | ExtractDoubleBracePlaceholders<Rest>
        : never;

/**
 * Extracts the union of placeholder names from a `${ name }` translation string.
 * Provided as a ready-made alternative to {@link ExtractDoubleBracePlaceholders} for
 * consumers who prefer the `${...}` syntax. Wire it up through {@link DollarBraceExtractor}.
 * @example ExtractDollarBracePlaceholders<'Hello ${name}'> // 'name'
 */
export type ExtractDollarBracePlaceholders<S extends string> =
    S extends `${string}${'${'}${infer Placeholder}}${infer Rest}`
        ? Trim<Placeholder> | ExtractDollarBracePlaceholders<Rest>
        : never;

// ---------------------------------------------------------------------------
// Higher-kinded extractor interface (allows overriding without touching core).
// ---------------------------------------------------------------------------

/**
 * Higher-kinded interface describing a placeholder extractor.
 *
 * An implementation extends this interface and computes {@link PlaceholderExtractor.placeholders}
 * from {@link PlaceholderExtractor.template}. The template is injected by
 * {@link ApplyPlaceholderExtractor}; implementations read it via `this['template']`.
 *
 * @example
 * // Custom `${...}` extractor in your own project:
 * interface MyDollarExtractor extends PlaceholderExtractor {
 *     placeholders: ExtractDollarBracePlaceholders<this['template']>;
 * }
 * // then: CallableTranslations<T, { extractor: MyDollarExtractor }>
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

/** Default extractor: the built-in `{{ name }}` syntax. */
export interface DoubleBraceExtractor extends PlaceholderExtractor {
    readonly placeholders: ExtractDoubleBracePlaceholders<this['template']>;
}

/** Ready-made extractor for the `${ name }` syntax. */
export interface DollarBraceExtractor extends PlaceholderExtractor {
    readonly placeholders: ExtractDollarBracePlaceholders<this['template']>;
}

// ---------------------------------------------------------------------------
// Strictness levels (named, kebab-case).
// ---------------------------------------------------------------------------

/**
 * Controls how strictly inferred placeholder parameters are enforced. The name
 * encodes two independent axes, `<presence>-<extras>`:
 *
 * - **presence**: `optional` — placeholders may be omitted; `required` — all must be provided.
 * - **extras**: `open` — additional, non-inferred keys are accepted; `closed` — only known placeholders.
 *
 * | Level               | Placeholders | Extra keys | Notes                          |
 * | ------------------- | ------------ | ---------- | ------------------------------ |
 * | `'optional-open'`   | optional     | allowed    | Default. Autocomplete, permissive. |
 * | `'optional-closed'` | optional     | rejected   | Autocomplete, only placeholders.   |
 * | `'required-open'`   | required     | allowed    | Must provide placeholders; extras ok. |
 * | `'required-closed'` | required     | rejected   | Strictest: exactly the placeholders. |
 *
 * Strings without placeholders always fall back to {@link InterpolationParams}
 * (permissive) regardless of level, since there is nothing to infer or enforce.
 */
export type PlaceholderStrictness =
    | 'optional-open'
    | 'optional-closed'
    | 'required-open'
    | 'required-closed';

/**
 * Picks a single placeholder-strictness level in one line, with editor autocomplete.
 * The argument is constrained to {@link PlaceholderStrictness} (see it for the four
 * levels), so editors suggest the levels as you type, the result stays the narrow
 * literal you picked, and a typo is rejected.
 * @example type PlaceholderParams = { level: PlaceholderStrictnessLevel<'optional-open'> };
 */
export type PlaceholderStrictnessLevel<L extends PlaceholderStrictness> = L;

/** Whether a level requires all placeholders to be provided. */
type IsRequired<Level extends PlaceholderStrictness> =
    Level extends `required-${string}` ? true : false;
/** Whether a level accepts extra, non-inferred keys. */
type IsOpen<Level extends PlaceholderStrictness> = Level extends `${string}-open`
    ? true
    : false;

/** Builds the placeholder-values record for the given axes. */
type BuildPlaceholderValues<
    Keys extends string,
    Value,
    Required extends boolean,
    Open extends boolean,
> = Required extends true
    ? Open extends true
        ? Record<Keys, Value> & Record<string, unknown>
        : Record<Keys, Value>
    : Open extends true
      ? Partial<Record<Keys, Value>> & Record<string, unknown>
      : Partial<Record<Keys, Value>>;

// ---------------------------------------------------------------------------
// Public placeholder types (assembled from the pieces above).
// ---------------------------------------------------------------------------

/**
 * Derives the placeholder-values object shape from a translation string, according to
 * a {@link PlaceholderStrictness} level and a {@link PlaceholderExtractor}.
 * When the string has no placeholders it falls back to {@link InterpolationParams}.
 * @template S - The literal translation string.
 * @template Level - The strictness level. Defaults to `'optional-open'`.
 * @template Value - The value type accepted for each placeholder. Defaults to `any`.
 * @template Extractor - The placeholder extractor. Defaults to {@link DoubleBraceExtractor} (`{{...}}`).
 */
export type PlaceholderValues<
    S extends string,
    Level extends PlaceholderStrictness = 'optional-open',
    Value = any,
    Extractor extends PlaceholderExtractor = DoubleBraceExtractor,
> = [ApplyPlaceholderExtractor<Extractor, S>] extends [never]
    ? InterpolationParams
    : BuildPlaceholderValues<
          ApplyPlaceholderExtractor<Extractor, S>,
          Value,
          IsRequired<Level>,
          IsOpen<Level>
      >;

/**
 * Builds the callable translation function type for a single translation-string leaf,
 * inferring its parameters from placeholders and applying the {@link PlaceholderStrictness} level.
 * At `required-*` levels the parameters argument is mandatory; otherwise it is optional.
 * @template S - The literal translation string.
 * @template Level - The strictness level. Defaults to `'optional-open'`.
 * @template Value - The value type accepted for each placeholder. Defaults to `any`.
 * @template Extractor - The placeholder extractor. Defaults to {@link DoubleBraceExtractor} (`{{...}}`).
 */
export type PlaceholderTranslation<
    S extends string,
    Level extends PlaceholderStrictness = 'optional-open',
    Value = any,
    Extractor extends PlaceholderExtractor = DoubleBraceExtractor,
> = [ApplyPlaceholderExtractor<Extractor, S>] extends [never]
    ? ParameterizedTranslation
    : IsRequired<Level> extends true
      ? (params: PlaceholderValues<S, Level, Value, Extractor>) => string
      : (params?: PlaceholderValues<S, Level, Value, Extractor>) => string;

// ---------------------------------------------------------------------------
// Options bundle (groups the placeholder knobs behind a single generic).
// ---------------------------------------------------------------------------

/**
 * Bundles the options that control how placeholder parameters are inferred for a
 * translations tree. Grouping them keeps {@link CallableTranslations} at two type
 * arguments (`<T, PPO>`) and leaves room for future options without changing arity.
 * Every field is optional and falls back to the default noted below.
 */
export interface PlaceholderParamsOptions {
    /** Strictness level. See {@link PlaceholderStrictness}. Defaults to `'optional-open'`. */
    level?: PlaceholderStrictness;
    /** Value type accepted for each placeholder. Defaults to `any`. */
    value?: unknown;
    /** Placeholder extractor. See {@link PlaceholderExtractor}. Defaults to {@link DoubleBraceExtractor} (`{{...}}`). */
    extractor?: PlaceholderExtractor;
}

type ResolveLevel<O extends PlaceholderParamsOptions> = O extends {
    level: infer L extends PlaceholderStrictness;
}
    ? L
    : 'optional-open';
type ResolveValue<O extends PlaceholderParamsOptions> = O extends {
    value: infer V;
}
    ? V
    : any;
type ResolveExtractor<O extends PlaceholderParamsOptions> = O extends {
    extractor: infer E extends PlaceholderExtractor;
}
    ? E
    : DoubleBraceExtractor;

/**
 * Builds the callable translation function for a single translation-string leaf from a
 * {@link PlaceholderParamsOptions} bundle, resolving the level, value type and extractor
 * (each with its default). This is the option-bundle counterpart of {@link PlaceholderTranslation}.
 * @template S - The literal translation string.
 * @template PPO - The {@link PlaceholderParamsOptions} bundle. Defaults to all defaults.
 */
export type ResolvedPlaceholderTranslation<
    S extends string,
    PPO extends PlaceholderParamsOptions = {},
> = PlaceholderTranslation<
    S,
    ResolveLevel<PPO>,
    ResolveValue<PPO>,
    ResolveExtractor<PPO>
>;
