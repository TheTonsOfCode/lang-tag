import type { PartialFlexibleTranslations } from '@/index';
import { markLangTagSpecial } from '@/index';

type RecordSchema = {
    enums: Record<string, Record<string, { label: string }>>;
};

type Input = PartialFlexibleTranslations<RecordSchema>;

const branded = markLangTagSpecial((key: string) => key, 'plural');

const _brandedOk: Input = {
    enums: {
        Foo: {
            createdAt: { label: 'x' },
            plural: branded,
        },
    },
};

const _plainRejected: Input = {
    enums: {
        Foo: {
            createdAt: { label: 'x' },
            // @ts-expect-error unbranded extra function is not a special
            oops: (key: string) => key,
        },
    },
};
