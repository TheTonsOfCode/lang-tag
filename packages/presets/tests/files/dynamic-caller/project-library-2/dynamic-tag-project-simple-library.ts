/**
 * Named-key library InputType vs project `asDynamicCaller`.
 *
 * Type-checked only (`tsc --noEmit`).
 */
import { i18n_library } from './i18n-library';
import { i18n_project } from './i18n-project';

const TRANSLATIONS = { greeting: 'Hi', farewell: 'Bye' } as const;

const someComponentTranslations = i18n_library(TRANSLATIONS);

function SomeComponent(
    translations: typeof someComponentTranslations.InputType
) {
    const t = someComponentTranslations.initTranslations(translations);
    return t.greeting() + ' ' + t.farewell();
}

const importedSomeComponentTranslations = i18n_project(TRANSLATIONS);

function project() {
    const t = importedSomeComponentTranslations.useTranslations();

    t('greeting');
    t.greeting();
    t.farewell();

    return SomeComponent(t);
}

SomeComponent({
    greeting: 'foo',
    farewell: () => 'bar',
});
