import { LangTagTranslationsConfig } from 'lang-tag';

import { TranslationsCollector } from '@/algorithms/collector/type';

import { LangTagCLILogger } from './logger';

export interface LangTagCLIConfig {
    /**
     * Tag name used to mark translations in code.
     * @default 'lang'
     */
    tagName: string;

    /**
     * Glob patterns specifying directories/files to include when searching for translations.
     * @default ['src/** /*.{js,ts,jsx,tsx}']
     */
    includes: string[];

    /**
     * Glob patterns specifying directories/files to exclude when searching for translations.
     * @default ['node_modules', 'dist', 'build', '** /*.test.ts']
     */
    excludes: string[];

    /**
     * Root directory for translation files.
     * The actual file structure depends on the collector implementation used.
     * @default 'locales'
     * @example With baseLanguageCode='en' and localesDirectory='locales':
     *   - NamespaceCollector (default): locales/en/common.json, locales/en/errors.json
     *   - DictionaryCollector: locales/en.json (all translations in one file)
     */
    localesDirectory: string;

    /**
     * The language in which translation values/messages are written in the codebase.
     * This determines the source language for your translations.
     * @default 'en'
     * @example 'en' - Translation values are in English: lang({ helloWorld: 'Hello World' })
     * @example 'pl' - Translation values are in Polish: lang({ helloWorld: 'Witaj Świecie' })
     */
    baseLanguageCode: string;

    /**
     * Indicates whether this configuration is for a translation library.
     * If true, generates an exports file (`.lang-tag.exports.json`) instead of locale files.
     * @default false
     */
    isLibrary: boolean;

    /**
     * When true and isLibrary is true, automatically adds "_" prefix to tagName
     * to prevent the tag from being suggested in TypeScript autocomplete after compilation.
     * This ensures that library tags remain internal and are not exposed in .d.ts files.
     * @default true
     * @example
     * // With enforceLibraryTagPrefix: true and tagName: "lang"
     * // Generated tag function will be: export function _lang(...)
     * // Config tagName also will be automatically set to "_lang"
     */
    enforceLibraryTagPrefix?: boolean;

    collect?: {
        /**
         * Translation collector that defines how translation tags are organized into output files.
         * If not specified, NamespaceCollector is used by default.
         * @default NamespaceCollector
         * @example DictionaryCollector - All translations in single file per language
         * @example NamespaceCollector - Separate files per namespace within language directory
         */
        collector?: TranslationsCollector;

        /**
         * @default 'common'
         */
        defaultNamespace?: string;

        /**
         * When true, conflicts are not reported when two translation tags have the same path but identical values.
         * This is useful for shared translations that appear in multiple files with the same content.
         * @default true
         */
        ignoreConflictsWithMatchingValues?: boolean;

        /**
         * Called by the CLI while collecting translations, when a tag's configuration
         * needs to be fixed or validated before writing locale files.
         */
        onCollectConfigFix?: (
            context: LangTagCLICollectConfigFixContext
        ) => LangTagTranslationsConfig;

        /**
         * Called by the CLI for each conflict between translation tags
         * (same namespace + path, incompatible values).
         */
        onConflictResolution?: (
            context: LangTagCLIConflictResolutionContext
        ) => Promise<void>;

        /**
         * Called by the CLI after collection finishes.
         * Use `context.conflicts` / `context.exit()` to decide whether to abort.
         */
        onCollectFinish?: (context: LangTagCLICollectFinishContext) => void;
    };

    /**
     * Called by the CLI for each lang tag during `regenerate-tags` (not at app runtime).
     * Receives a per-tag context so you can derive `namespace` / `path` from the file
     * location (or other rules) and write them back into the source file.
     *
     * **IMPORTANT:** `context.config` is deeply frozen and immutable. Any attempt
     * to mutate it will throw. To update the configuration, call
     * `context.save(newConfig)` with a new object.
     *
     * Changes apply **only** when you call `context.save(...)`. Returning a value
     * or mutating the context without `save()` has no effect.
     *
     * @example
     * ```ts
     * onConfigGeneration: async (context) => {
     *   // ❌ This will throw:
     *   // context.config.namespace = "new-namespace";
     *
     *   // ✅ Correct:
     *   context.save({
     *     ...context.config,
     *     namespace: "new-namespace",
     *     path: "new.path"
     *   });
     * }
     * ```
     */
    onConfigGeneration: (
        context: LangTagCLIConfigGenerationContext
    ) => Promise<void>;

    import: {
        /**
         * Output directory for generated files containing imported library tags.
         * @default 'src/lang-libraries'
         */
        dir: string;

        /**
         * The import statement used in generated library files to import the project's `lang` tag function.
         * @default 'import { lang } from "@/my-lang-tag-path"'
         */
        tagImportPath: string;

        /**
         * Called by the CLI when importing tags from external packages.
         * Controls how imported tags are organized into generated files.
         */
        onImport: (context: LangTagCLIImportContext) => void;

        /**
         * Called by the CLI after all lang-tags were imported.
         */
        onImportFinish?: () => void;
    };

    /**
     * Determines the position of the translation argument in the `lang()` function.
     * If `1`, translations are in the first argument (`lang(translations, options)`).
     * If `2`, translations are in the second argument (`lang(options, translations)`).
     * @default 1
     */
    translationArgPosition: 1 | 2;

    /**
     * Directory containing compiled TypeScript declaration files (.d.ts) to remove export modifier.
     * Used by the `hide-compiled-exports` command to remove exports of lang-tag variables.
     * @default 'dist'
     */
    hideDistDir?: string;

    // /**
    //  * Whether to flatten the translation keys. (Currently unused)
    //  * @default false
    //  */
    // flattenKeys: boolean;

    debug?: boolean;
}

type Validity =
    | 'ok'
    | 'invalid-param-1'
    | 'invalid-param-2'
    | 'translations-not-found';

export interface LangTagCLIProcessedTag {
    fullMatch: string;

    parameter1Text: string;
    parameter2Text?: string;
    parameterTranslations: any;
    parameterConfig?: any;

    variableName?: string;

    /** Generic type parameter if present (e.g., "ValidationTranslations" from "lang<ValidationTranslations>(...)") */
    genericType?: string;

    /** Type used in a `satisfies` expression on the translations argument */
    satisfiesType?: string;

    /** Whether the translations argument was followed by an `as const` assertion */
    asConst?: boolean;

    /** Character index in the whole text where the match starts */
    index: number;
    /** Line number (1-based) where the match was found */
    line: number;
    /** Column number (1-based) where the match starts in the line */
    column: number;

    validity: Validity;
}

export interface LangTagCLITagConflictInfo {
    tag: LangTagCLIProcessedTag;
    relativeFilePath: string;
    value: any;
}

export interface LangTagCLIConflict {
    path: string;
    tagA: LangTagCLITagConflictInfo;
    tagB: LangTagCLITagConflictInfo;
    conflictType: 'path_overwrite' | 'type_mismatch';
}

/*
 * Import & Export
 */

export interface LangTagCLIImportManager {
    importTag(
        pathRelativeToImportDir: string,
        tag: LangTagCLIImportedTag
    ): void;
    getImportedFiles(): LangTagCLIImportedTagsFile[];
    getImportedFilesCount(): number;
    hasImportedFiles(): boolean;
}

export interface LangTagCLIImportedTag {
    variableName: string;

    translations: any;

    config: any | null;
}

export interface LangTagCLIImportedTagsFile {
    pathRelativeToImportDir: string;

    tags: LangTagCLIImportedTag[];
}

export interface LangTagCLIExportData {
    baseLanguageCode: string;

    files: LangTagCLIExportDataFile[];
}

export interface LangTagCLIExportDataFile {
    relativeFilePath: string;

    tags: LangTagCLIExportDataTag[];
}

export interface LangTagCLIExportDataTag {
    variableName: string | undefined;
    translations: object;
    config: object | undefined;
}

/*
 * Hook contexts
 *
 * Each CLI hook receives a context object with the data and helpers for that step.
 * These are not DOM / EventEmitter events — just typed callback payloads.
 */

/** Context passed to `import.onImport`. */
export interface LangTagCLIImportContext {
    exports: {
        packageJSON: any;
        exportData: LangTagCLIExportData;
    }[];

    langTagConfig: LangTagCLIConfig;
    logger: LangTagCLILogger;

    importManager: LangTagCLIImportManager;
}

/** Context passed to `onConfigGeneration` for a single tag. */
export interface LangTagCLIConfigGenerationContext {
    /** The absolute path to the source file being processed. */
    readonly absolutePath: string;

    /** The path of the source file relative to the project root (where the command was invoked). */
    readonly relativePath: string;

    /** True if the file being processed is located within the configured library import directory (`config.import.dir`). */
    readonly isImportedLibrary: boolean;

    /**
     * The configuration object extracted from the lang tag's options argument (e.g., `{ namespace: 'common', path: 'my.path' }`).
     *
     * **This object is deeply frozen and immutable.** Any attempt to modify it will throw an error in strict mode.
     * To update the configuration, use the `save()` method with a new configuration object.
     */
    readonly config: Readonly<LangTagTranslationsConfig> | undefined;

    readonly logger: LangTagCLILogger;

    readonly langTagConfig: LangTagCLIConfig;

    /**
     * Whether `save()` has already been called for this tag during the current hook run.
     */
    readonly isSaved: boolean;

    /**
     * The updated configuration that was passed to the `save()` method.
     * - `undefined` if `save()` has not been called yet
     * - `null` if `save(null)` was called to remove the configuration
     * - `LangTagTranslationsConfig` object if a new configuration was saved
     */
    readonly savedConfig: LangTagTranslationsConfig | null | undefined;

    /**
     * Asks the CLI to replace this tag's configuration in the source file.
     * Pass `null` to remove the configuration argument.
     */
    save(config: LangTagTranslationsConfig | null, triggerName?: string): void;

    /**
     * Returns the current configuration object that should be used as a base for modifications.
     * This method provides a reusable way to get the active configuration:
     * - If `save()` was called, returns `savedConfig` (a mutable copy)
     * - Otherwise, returns `config` (a mutable copy)
     * - If neither exists, returns an empty object `{}`
     *
     * The returned object is always a shallow copy, so it can be safely modified.
     *
     * @example
     * ```ts
     * const currentConfig = context.getCurrentConfig();
     * currentConfig.namespace = 'new-namespace';
     * context.save(currentConfig);
     * ```
     */
    getCurrentConfig(): LangTagTranslationsConfig;
}

/** Context passed to `collect.onCollectConfigFix`. */
export interface LangTagCLICollectConfigFixContext {
    config: LangTagTranslationsConfig;
    langTagConfig: LangTagCLIConfig;
}

/** Context passed to `collect.onConflictResolution`. */
export interface LangTagCLIConflictResolutionContext {
    conflict: LangTagCLIConflict;
    logger: LangTagCLILogger;
    /** Abort translation collection. */
    exit(): void;
}

/** Context passed to `collect.onCollectFinish`. */
export interface LangTagCLICollectFinishContext {
    totalTags: number;
    namespaces: Record<string, Record<string, any>>;
    conflicts: LangTagCLIConflict[];
    logger: LangTagCLILogger;
    /** Abort translation collection. */
    exit(): void;
}
