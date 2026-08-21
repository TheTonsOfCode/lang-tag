/**
 * Forms `{ shared, group }` vs project `asDynamicCaller`.
 *
 * `delete: {}` becomes a callable special (`t.delete('trigger')`) against the
 * weak `{ trigger?, title?, description? }` — same host-brand overlap as `$`.
 *
 * Type-checked only (`tsc --noEmit`).
 */
import type {
    LangTagTranslations,
    PartialFlexibleTranslations,
} from 'lang-tag';

import { i18n_library } from './i18n-library';
import { i18n_project } from './i18n-project';

type Schema = {
    enums: Record<
        string,
        Record<string, { label: string; description?: string }>
    >;
    fields: Record<
        string,
        { label: string; placeholder: string; description?: string }
    >;
};

type Extra = {
    emptyValue: string;
};

type FieldKeys = 'title' | 'content' | 'authorId' | 'notebookId';

type FieldsTranslationsValue = {
    label: string;
    placeholder: string;
    description?: string;
} & Record<string, any>;

type Group = {
    fields: Partial<Record<FieldKeys, Partial<FieldsTranslationsValue>>>;
    submit: Partial<{
        create: string;
        update: string;
    }>;
    delete: {
        trigger?: string;
        title?: string;
        description?: string;
    };
} & Record<string, any>;

const SCHEMA = {
    enums: {
        AnnotationSortField: {
            createdAt: { label: 'Created At', description: '' },
            updatedAt: { label: 'Updated At', description: '' },
        },
    },
    fields: {
        name: { label: 'Name', placeholder: '', description: '' },
    },
} as const satisfies Schema;

const EXTRA = {
    emptyValue: '—',
} as const satisfies Extra;

const GROUP = {
    fields: {
        title: {
            label: 'Title',
            placeholder: 'Note title',
        },
    },
    submit: {
        create: 'Create note',
        update: 'Update note',
    },
    delete: {},
} as const satisfies Group;

const schemaTag = i18n_library<Schema>(SCHEMA);
const extraTag = i18n_library<Extra>(EXTRA);

function formLang<T extends LangTagTranslations>(_base: T): formLang.Tag<T> {
    const groupTag = i18n_library(_base);
    return {
        ...groupTag,
        TranslationsInput: {} as formLang.Tag<T>['TranslationsInput'],
    };
}

namespace formLang {
    export type Tag<T extends LangTagTranslations> = ReturnType<
        typeof i18n_library<T>
    > & {
        TranslationsInput: {
            shared?: {
                schema?: typeof schemaTag.InputType;
                extra?: typeof extraTag.InputType;
            };
            group?: PartialFlexibleTranslations<T>;
        };
    };
}

const groupTag = formLang<Group>(GROUP);

type TranslationsInput = typeof groupTag.TranslationsInput;

function SpaceCreateForm(translations: TranslationsInput) {
    const t = groupTag.initTranslations(translations.group);
    return t.submit?.create?.();
}

const projectSchema = i18n_project(SCHEMA).useTranslations();
const projectExtra = i18n_project(EXTRA).useTranslations();
const projectGroup = i18n_project(GROUP).useTranslations();

const projectShared = { schema: projectSchema, extra: projectExtra };

const _schemaOk: typeof schemaTag.InputType = projectSchema;
const _extraOk: typeof extraTag.InputType = projectExtra;

projectGroup('submit');
projectGroup.submit('create');
projectGroup.submit.create();
projectGroup.delete('trigger');

SpaceCreateForm({
    shared: projectShared,
    group: projectGroup,
});
