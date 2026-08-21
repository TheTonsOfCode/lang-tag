import {
    type CallableTranslations,
    type LangTagTranslations,
    type LangTagTranslationsConfig,
    type PartialFlexibleTranslations,
} from 'lang-tag';

export interface TagConfig extends LangTagTranslationsConfig<'forms'> {
    keep?: 'namespace' | 'path' | 'both';
}

export namespace i18n_library {
    export type Tag<T extends LangTagTranslations> = {
        InputType: PartialFlexibleTranslations<T>;
        Type: CallableTranslations<T>;

        initTranslations(
            translations?: PartialFlexibleTranslations<T>
        ): CallableTranslations<T>;
    };
}

export function i18n_library<T extends LangTagTranslations>(
    _baseTranslations: T,
    _config?: TagConfig
): i18n_library.Tag<T> {
    return {
        InputType: {} as PartialFlexibleTranslations<T>,
        Type: {} as CallableTranslations<T>,

        initTranslations: (() => {}) as i18n_library.Tag<T>['initTranslations'],
    };
}
