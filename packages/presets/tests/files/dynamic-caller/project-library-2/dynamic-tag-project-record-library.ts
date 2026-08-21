/**
 * Record-typed library InputType vs project `asDynamicCaller`.
 *
 * Type-checked only (`tsc --noEmit`).
 */
import { i18n_library } from './i18n-library';
import { i18n_project } from './i18n-project';

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

const someComponentTranslations = i18n_library<Schema>(SCHEMA);

function SomeComponent(
    translations: typeof someComponentTranslations.InputType
) {
    const t = someComponentTranslations.initTranslations(translations);
    return t.enums?.AnnotationSortField?.createdAt?.label();
}

const importedSomeComponentTranslations = i18n_project(SCHEMA);

function project() {
    const t = importedSomeComponentTranslations.useTranslations();

    t('test');
    t.enums('AnnotationSortField');
    t.enums.AnnotationSortField('createdAt');
    t.enums.AnnotationSortField.createdAt.label();

    return SomeComponent(t);
}

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
});
