import type {
    ApplyPlaceholderExtractor,
    DoubleBraceExtractor,
    PlaceholderExtractor,
} from './placeholders-extractors';
import type { InterpolationParams, ParameterizedTranslation } from './types';

/**
 * Placeholder parameter inference.
 * ================================
 *
 * Turns a translation string with placeholders into a typed parameters object.
 * Extractors live in {@link ./placeholders-extractors} — reuse a built-in or
 * plug in your own via {@link PlaceholderExtractor}.
 *
 * Nothing here is enforced at runtime: replacement happens in the tag
 * (`processPlaceholders` / your `transform`). These types only drive
 * autocomplete and compile-time checks.
 */

// ---------------------------------------------------------------------------
// Strictness axes (`required` × `allowExtras`).
// ---------------------------------------------------------------------------

/**
 * Controls how strictly inferred placeholder parameters are enforced via two
 * independent booleans:
 *
 * - **`required`**: `false` — placeholders may be omitted; `true` — all must be provided.
 * - **`allowExtras`**: `true` — additional, non-inferred keys are accepted; `false` — only known placeholders.
 *
 * | `required` | `allowExtras` | Placeholders | Extra keys | Notes                              |
 * | ---------- | ------------- | ------------ | ---------- | ---------------------------------- |
 * | `false`    | `true`        | optional     | allowed    | Default. Autocomplete, permissive. |
 * | `false`    | `false`       | optional     | rejected   | Autocomplete, only placeholders.   |
 * | `true`     | `true`        | required     | allowed    | Must provide placeholders; extras ok. |
 * | `true`     | `false`       | required     | rejected   | Strictest: exactly the placeholders. |
 *
 * Strings without placeholders always fall back to {@link InterpolationParams}
 * (permissive) regardless of these flags, since there is nothing to infer or enforce.
 */

/** Builds the placeholder-values record for the given axes. */
type BuildPlaceholderValues<
    Keys extends string,
    Value,
    Required extends boolean,
    AllowExtras extends boolean,
> = Required extends true
    ? AllowExtras extends true
        ? Record<Keys, Value> & Record<string, unknown>
        : Record<Keys, Value>
    : AllowExtras extends true
      ? Partial<Record<Keys, Value>> & Record<string, unknown>
      : Partial<Record<Keys, Value>>;

// ---------------------------------------------------------------------------
// Public placeholder types (assembled from the pieces above).
// ---------------------------------------------------------------------------

/**
 * Derives the placeholder-values object shape from a translation string, according to
 * the `required` / `allowExtras` axes and a {@link PlaceholderExtractor}.
 * When the string has no placeholders it falls back to {@link InterpolationParams}.
 * @template S - The literal translation string.
 * @template Required - Whether all placeholders must be provided. Defaults to `false`.
 * @template AllowExtras - Whether extra, non-inferred keys are accepted. Defaults to `true`.
 * @template Value - The value type accepted for each placeholder. Defaults to `any`.
 * @template Extractor - The placeholder extractor. Defaults to {@link DoubleBraceExtractor} (`{{...}}`).
 */
export type PlaceholderValues<
    S extends string,
    Required extends boolean = false,
    AllowExtras extends boolean = true,
    Value = any,
    Extractor extends PlaceholderExtractor = DoubleBraceExtractor,
> = [ApplyPlaceholderExtractor<Extractor, S>] extends [never]
    ? InterpolationParams
    : BuildPlaceholderValues<
          ApplyPlaceholderExtractor<Extractor, S>,
          Value,
          Required,
          AllowExtras
      >;

/**
 * Builds the callable translation function type for a single translation-string leaf,
 * inferring its parameters from placeholders and applying the `required` / `allowExtras` axes.
 * When `Required` is `true` the parameters argument is mandatory; otherwise it is optional.
 * @template S - The literal translation string.
 * @template Required - Whether all placeholders must be provided. Defaults to `false`.
 * @template AllowExtras - Whether extra, non-inferred keys are accepted. Defaults to `true`.
 * @template Value - The value type accepted for each placeholder. Defaults to `any`.
 * @template Extractor - The placeholder extractor. Defaults to {@link DoubleBraceExtractor} (`{{...}}`).
 */
export type PlaceholderTranslation<
    S extends string,
    Required extends boolean = false,
    AllowExtras extends boolean = true,
    Value = any,
    Extractor extends PlaceholderExtractor = DoubleBraceExtractor,
> = [ApplyPlaceholderExtractor<Extractor, S>] extends [never]
    ? ParameterizedTranslation
    : Required extends true
      ? (
            params: PlaceholderValues<
                S,
                Required,
                AllowExtras,
                Value,
                Extractor
            >
        ) => string
      : (
            params?: PlaceholderValues<
                S,
                Required,
                AllowExtras,
                Value,
                Extractor
            >
        ) => string;

// ---------------------------------------------------------------------------
// Options bundle (groups the placeholder knobs behind a single generic).
// ---------------------------------------------------------------------------

/**
 * Bundles the options that control how placeholder parameters are inferred for a
 * translations tree. Grouping them keeps {@link CallableTranslations} at two type
 * arguments (`<T, PPO>`) and leaves room for future options without changing arity.
 * Every field is optional and falls back to the default noted below.
 *
 * Prefer building concrete bundles through {@link DefinePlaceholderParams} so editors
 * autocomplete the option keys.
 *
 * @example
 * type PlaceholderParams = DefinePlaceholderParams<{
 *     required: false;
 *     allowExtras: true;
 * }>;
 */
export interface PlaceholderParamsOptions {
    /**
     * Whether all inferred placeholders must be provided.
     * Defaults to `false` (placeholders may be omitted).
     */
    required?: boolean;
    /**
     * Whether additional, non-inferred keys are accepted on the params object.
     * Defaults to `true` (extras allowed).
     */
    allowExtras?: boolean;
    /** Value type accepted for each placeholder. Defaults to `any`. */
    value?: unknown;
    /** Placeholder extractor. See {@link PlaceholderExtractor}. Defaults to {@link DoubleBraceExtractor} (`{{...}}`). */
    extractor?: PlaceholderExtractor;
}

/**
 * Identity helper that keeps the narrow literals you write while constraining keys
 * to {@link PlaceholderParamsOptions}, so editors suggest `required`, `allowExtras`,
 * `value` and `extractor` as you type.
 *
 * @example
 * type PlaceholderParams = DefinePlaceholderParams<{
 *     required: false;
 *     allowExtras: true;
 * }>;
 */
export type DefinePlaceholderParams<O extends PlaceholderParamsOptions> = O;

type ResolveRequired<O extends PlaceholderParamsOptions> = O extends {
    required: infer R extends boolean;
}
    ? R
    : false;
type ResolveAllowExtras<O extends PlaceholderParamsOptions> = O extends {
    allowExtras: infer A extends boolean;
}
    ? A
    : true;
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
 * {@link PlaceholderParamsOptions} bundle, resolving `required`, `allowExtras`, value type
 * and extractor (each with its default). This is the option-bundle counterpart of
 * {@link PlaceholderTranslation}.
 * @template S - The literal translation string.
 * @template PPO - The {@link PlaceholderParamsOptions} bundle. Defaults to all defaults.
 */
export type ResolvedPlaceholderTranslation<
    S extends string,
    PPO extends PlaceholderParamsOptions = {},
> = PlaceholderTranslation<
    S,
    ResolveRequired<PPO>,
    ResolveAllowExtras<PPO>,
    ResolveValue<PPO>,
    ResolveExtractor<PPO>
>;
