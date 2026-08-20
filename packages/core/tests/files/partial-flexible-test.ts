import {
    FlexibleTranslations,
    PartialFlexibleTranslations,
    markLangTagSpecial,
} from '@/index';

const testTranslationStructure = {
    greeting: 'Hi',
    farewell: 'Bye',
    details: {
        info: 'I like dogs',
        extra: 'and bearded agamas too!',
    },
};

const fx: FlexibleTranslations<typeof testTranslationStructure> = {
    greeting: '',
    farewell: '',
    details: {
        info: '',
        extra: '',
    },
};

const partial_fx: PartialFlexibleTranslations<typeof testTranslationStructure> =
    {
        greeting: '',
        details: {
            info: '',
        },
    };

// Record schemas accept branded specials, not a plain extra function.
type RecordSchema = {
    enums: Record<string, Record<string, { label: string }>>;
};

const partial_record: PartialFlexibleTranslations<RecordSchema> = {
    enums: {
        AnnotationSortField: {
            createdAt: { label: 'Created At' },
            $: markLangTagSpecial((key: string) => key, 'dynamic-caller'),
        },
    },
};

const partial_record_plain: PartialFlexibleTranslations<RecordSchema> = {
    enums: {
        AnnotationSortField: {
            createdAt: { label: 'Created At' },
            // @ts-expect-error unbranded extra function is not a leaf
            oops: (key: string) => key,
        },
    },
};
