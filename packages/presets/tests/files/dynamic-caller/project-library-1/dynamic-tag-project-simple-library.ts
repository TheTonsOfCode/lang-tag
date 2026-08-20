import { i18n_library } from './i18n-library';
import { i18n_project } from './i18n-project';

const TRANSLATIONS = { greeting: 'Hi', farewell: 'Bye' } as const;

// Library side

const someComponentTranslations = i18n_library(TRANSLATIONS);

function SomeComponent(
    translations: typeof someComponentTranslations.InputType
) {
    const t = someComponentTranslations.initTranslations(translations);

    return t.greeting() + ' ' + t.farewell();
}

// Project side

const importedSomeComponentTranslations = i18n_project(TRANSLATIONS);

function project() {
    const t = importedSomeComponentTranslations.useTranslations();

    // Tiny typing callable test
    t.$('test');
    t.greeting();
    t.farewell();

    // Real usage
    return SomeComponent(t);
}

SomeComponent({
    greeting: 'foo',
    farewell: () => 'bar',
    // $: () => 'dd',
    // aa: 'bb',
});
