/**
 * Mirrors the generated app-tag template (see cli `base-app.mustache`) to ensure
 * the `PlaceholderParams` cast compiles and produces correctly-typed consumer output.
 * Type-checked by `tsc`; no runtime assertions.
 */
import {
    type CallableTranslations,
    type LangTagTranslations,
    type LangTagTranslationsConfig,
    type PlaceholderStrictnessLevel,
    createCallableTranslations,
} from '@/index';

declare function processPlaceholders(
    value: string,
    params?: Record<string, any>
): string;

interface TagConfig extends LangTagTranslationsConfig {
    keep?: 'namespace' | 'path' | 'both';
}

// --- Default tag ('optional-open') -----------------------------------------

type PlaceholderParamsDefault = {
    level: PlaceholderStrictnessLevel<'optional-open'>;
};

function i18n<const T extends LangTagTranslations>(
    baseTranslations: T,
    config?: TagConfig
) {
    const createTranslations = (): CallableTranslations<
        T,
        PlaceholderParamsDefault
    > =>
        createCallableTranslations(baseTranslations, config, {
            transform: ({ value, params }) => processPlaceholders(value, params),
        }) as CallableTranslations<T, PlaceholderParamsDefault>;

    return {
        client: () => createTranslations(),
        server: () => createTranslations(),
        Type: {} as CallableTranslations<T, PlaceholderParamsDefault>,
    };
}

const defaultTag = i18n({ hello: 'Hi {{name}}' });
const dt = defaultTag.client();
dt.hello();
dt.hello({ name: 'Ada' });
dt.hello({ name: 'Ada', extra: 1 });

// --- Strict tag ('required-closed') ----------------------------------------

type PlaceholderParamsStrict = {
    level: PlaceholderStrictnessLevel<'required-closed'>;
};

function i18nStrict<const T extends LangTagTranslations>(
    baseTranslations: T,
    config?: TagConfig
) {
    const createTranslations = (): CallableTranslations<
        T,
        PlaceholderParamsStrict
    > =>
        createCallableTranslations(baseTranslations, config, {
            transform: ({ value, params }) => processPlaceholders(value, params),
        }) as CallableTranslations<T, PlaceholderParamsStrict>;

    return {
        client: () => createTranslations(),
        Type: {} as CallableTranslations<T, PlaceholderParamsStrict>,
    };
}

const strictTag = i18nStrict({ hello: 'Hi {{name}}' });
const st = strictTag.client();
st.hello({ name: 'Ada' });
// @ts-expect-error 'required-closed' requires the placeholder params
st.hello();
// @ts-expect-error 'required-closed' rejects extra keys
st.hello({ name: 'Ada', extra: 1 });
