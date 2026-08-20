import { i18n_library } from './i18n-library';
import { i18n_project } from './i18n-project';

/**
 * Mirrors library tags the schema as `Record` (index signatures), not named keys.
 */
type Schema = {
    enums: Record<
        string,
        Record<string, { label: string; description?: string }>
    >;
};

const SCHEMA = {
    enums: {
        AnnotationSortField: {
            createdAt: {
                label: 'Created At',
                description: '',
            },
            updatedAt: {
                label: 'Updated At',
                description: '',
            },
        },
    },
} as const satisfies Schema;

// Library side — InputType expands to `{ enums?: { [x: string]: { [x: string]: { label?, description? } } } }`

const someComponentTranslations = i18n_library<Schema>(SCHEMA);

function SomeComponent(
    translations: typeof someComponentTranslations.InputType
) {
    const t = someComponentTranslations.initTranslations(translations);

    return t.enums?.AnnotationSortField?.createdAt?.label();
}

// Project side — `const T` keeps the literal; `withDynamicCaller({ recursive: true })`
// plants `$` on every nested object, including `AnnotationSortField`.

const importedSomeComponentTranslations = i18n_project(SCHEMA);

function project() {
    const t = importedSomeComponentTranslations.useTranslations();

    t.$('test');
    t.enums.AnnotationSortField.$('createdAt');
    t.enums.AnnotationSortField.createdAt.label();

    // Same as project `translations={{ shared: sharedT }}`:
    // `$` on `AnnotationSortField` is incompatible with the library index signature.
    return SomeComponent(t);
}
