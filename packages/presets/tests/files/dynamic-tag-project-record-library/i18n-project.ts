import {
    type CallableTranslations,
    type DefinePlaceholderParams,
    type LangTagOptionalTranslations,
    type LangTagTranslationsConfig,
    createCallableTranslations,
} from 'lang-tag';

import {
    type CallableTranslationsWithDynamicCaller,
    withDynamicCaller,
} from '@/dynamic-caller';

type PlaceholderParams = DefinePlaceholderParams<{
    required: false;
    allowExtras: true;
    value: any;
}>;

export function i18n_project<const T extends LangTagOptionalTranslations>(
    baseTranslations: T,
    config?: LangTagTranslationsConfig
) {
    const build = () =>
        withDynamicCaller(
            createCallableTranslations(baseTranslations, config, {
                transform: ({ value }) => value,
            }) as CallableTranslations<T, PlaceholderParams>,
            { recursive: true, typedKeys: false, onMissing: (p) => `[[${p}]]` }
        );

    return {
        useTranslations: () => build(),
        initTranslations: async () => build(),
        Type: {} as CallableTranslationsWithDynamicCaller<
            T,
            PlaceholderParams,
            '$',
            true,
            false
        >,
    };
}
