import type {
    PlaceholderParamsOptions,
    ResolvedPlaceholderTranslation,
} from './placeholder-params';

/**
 * Configuration for LangTag translations.
 * @template Namespaces - The type used for namespaces, defaults to string.
 */
export interface LangTagTranslationsConfig<Namespaces = string> {
    /** Optional base path for translation keys. */
    path?: string;
    /** The namespace for the translations. */
    namespace?: Namespaces;
}

/**
 * Represents a collection of translations.
 * Keys are strings, and values can be either strings (translations)
 * or nested LangTagTranslations objects for hierarchical translations.
 */
export type LangTagTranslations = {
    [key: string]: string | LangTagTranslations;
};

/**
 * Represents a collection of optional translations.
 * Keys are strings, and values can be either strings (translations)
 * or nested LangTagTranslations objects for hierarchical translations.
 */
export type LangTagOptionalTranslations = {
    [key in string]?: string | LangTagOptionalTranslations;
};

// export type LangTag<Config extends LangTagConfig = LangTagConfig, T = any> = (translations: LangTagOptionalTranslations, config?: Config) => T;

/**
 * Defines the structure for parameters used in interpolation.
 * It's a record where keys are placeholders and values are their replacements.
 */
export type InterpolationParams = Record<string, any>;

/**
 * Represents a function that takes optional interpolation parameters
 * and returns a translated string.
 * @template P - The shape of the accepted interpolation parameters.
 *   Defaults to {@link InterpolationParams}; can be narrowed via the generic
 *   (typically inferred from a translation string through `PlaceholderValues`).
 */
export type ParameterizedTranslation<
    P extends Record<string, any> = InterpolationParams,
> = (params?: P) => string;

/**
 * Transforms a static translation object into an object where each
 * translation string or nested object is converted into a callable function
 * or a nested structure of callable functions.
 *
 * String leaves have their parameters inferred from template placeholders
 * (`{{name}}` by default), enabling autocomplete. How those parameters behave —
 * strictness level, accepted value type and placeholder syntax — is configured via
 * the {@link PlaceholderParamsOptions} `Params` bundle (see `./placeholder-params`),
 * which defaults to the built-in behaviour and can be overridden per tag without
 * patching core.
 * @template T - The structure of the input translations.
 * @template PPO - The {@link PlaceholderParamsOptions} bundle for inferred parameters. Defaults to all defaults.
 */
export type CallableTranslations<
    T,
    PPO extends PlaceholderParamsOptions = {},
> = {
    [P in keyof T]: NonNullable<T[P]> extends ParameterizedTranslation
        ? ParameterizedTranslation
        : // Allow for pre-existing functions that might not strictly be ParameterizedTranslation
          // but are still callable and return a string, or a nested structure.
          NonNullable<T[P]> extends (...args: any[]) => string
          ? NonNullable<T[P]>
          : NonNullable<T[P]> extends string
            ? ResolvedPlaceholderTranslation<NonNullable<T[P]>, PPO>
            : NonNullable<T[P]> extends Record<string, any>
              ? CallableTranslations<NonNullable<T[P]>, PPO>
              : ParameterizedTranslation; // Fallback for basic strings that will be converted
};

/**
 * Context provided to a translation transformer function.
 * @template Config - The LangTag translations configuration type.
 */
export interface TranslationTransformContext<
    Config extends LangTagTranslationsConfig,
> {
    /** The LangTag configuration object. */
    config: Config | undefined;
    /** The path of the direct parent object of the current translation key, including the base path from config. */
    parentPath: string;
    /** The full path to the current translation key, including the base path from config. */
    path: string;
    /**
     * Path segments to the current translation key, relative to the root of the
     * translations object (excluding the base path from config).
     * Kept as an array so object keys that contain `.` are not split during lookup.
     */
    unprefixedPath: string[];
    /** The current translation key. */
    key: string;
    /** The raw string value of the translation. */
    value: string; // The raw string value of the translation
    /** Optional interpolation parameters for the translation. */
    params?: InterpolationParams;
}

/**
 * Defines the signature for a function that transforms a raw translation string.
 * @template Config - The LangTag translations configuration type.
 * @param transformContext - The context for the transformation.
 * @returns The transformed translation string.
 */
export type TranslationTransformer<Config extends LangTagTranslationsConfig> = (
    transformContext: TranslationTransformContext<Config>
) => string;

/**
 * Context provided to a translation key processor function.
 * It omits the 'params' field from `TranslationTransformContext`.
 * @template Config - The LangTag translations configuration type.
 */
export type TranslationKeyProcessorContext<
    Config extends LangTagTranslationsConfig,
> = Omit<TranslationTransformContext<Config>, 'params'>;

/**
 * Defines the signature for a function that processes translation keys.
 * This allows for modifying or generating new keys based on the original key and value.
 * @template Config - The LangTag translations configuration type.
 */
export type TranslationKeyProcessor<
    Config extends LangTagTranslationsConfig = LangTagTranslationsConfig,
> = (
    /** Context for processing the key. */
    context: TranslationKeyProcessorContext<Config>,
    /**
     * Callback to add a processed key.
     * @param newKey - The new key to be added to the result.
     * @param originalValue - The original string value associated with the key being processed.
     */
    addProcessedKey: (newKey: string, originalValue: string) => void
) => void;

/**
 * Defines the strategy for mapping and transforming translations.
 * @template Config - The LangTag translations configuration type.
 */
export interface TranslationMappingStrategy<
    Config extends LangTagTranslationsConfig,
> {
    /** The function used to transform raw translation strings. */
    transform: TranslationTransformer<Config>;
    /** Optional function to process translation keys. */
    processKey?: TranslationKeyProcessor<Config>;
}
