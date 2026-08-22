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

    return t.enums.AnnotationSortField.createdAt.label();
}

// Project side — `const T` keeps the literal; `withDynamicCaller({ recursive: true })`
// plants `$` on every nested object, including `AnnotationSortField`.

const importedSomeComponentTranslations = i18n_project(SCHEMA);

function project() {
    const t = importedSomeComponentTranslations.useTranslations();

    t.$('test');
    t.enums.AnnotationSortField.$('createdAt');
    t.enums.AnnotationSortField.createdAt.label();

    // Same as project `translations={{ shared: sharedT }}`.
    // `$` is index-compatible + non-enumerable, so the library InputType accepts `t`.
    return SomeComponent(t);
}

// Type partial (Typed with `Schema`)
SomeComponent({
    enums: {
        aaa: {
            foo: {
                label: 'xxx',
            },
        },
        bbb: {
            bar: {
                description: () => 'yyy',
                // @ts-expect-error look at Schema at top of the file
                wrong: 'does not match `Schema`',
            },
        },
    },
    // type checker will not see it as it fails on first error aka. 'wrong' above, remove that and see there
    // fails as expected
    aaa: 'dasda',
});
