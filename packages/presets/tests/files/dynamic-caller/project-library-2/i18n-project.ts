import {
    type CallableTranslations,
    type DefinePlaceholderParams,
    type LangTagOptionalTranslations,
    type LangTagTranslationsConfig,
    createCallableTranslations,
} from 'lang-tag';

import {
    type CallableTranslationsAsDynamicCaller,
    asDynamicCaller,
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
        asDynamicCaller(
            createCallableTranslations(baseTranslations, config, {
                transform: ({ value }) => value,
            }) as CallableTranslations<T, PlaceholderParams>,
            { recursive: true, typedKeys: false, onMissing: (p) => `[[${p}]]` }
        );

    return {
        useTranslations: () => build(),
        initTranslations: async () => build(),
        Type: {} as CallableTranslationsAsDynamicCaller<
            T,
            PlaceholderParams,
            true,
            false
        >,
    };
}

const t = i18n_project({
    greeting: 'Hi {{name}}',
    user: { welcome: 'Welcome {{name}}' },
}).useTranslations();
t.greeting({ name: 'Ada' });
t('greeting', { name: 'Ada' });
t.user.welcome({ name: 'Ada' });
t.user('welcome', { name: 'Ada' });
t('any-runtime-key');
