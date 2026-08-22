/**
 * Core tax on Record `InputType` — even without `asDynamicCaller` / `$`.
 *
 * Index values are `leaf | LangTagSpecialFn`. Reading a nested leaf on the
 * raw `translations` prop can fail. After `initTranslations` the result is
 * `CallableTranslations` and not special-widened. If `T` is still a `Record`,
 * `Foo` and `Bar` are the same string index — we do not know what was written.
 * Infer `T` from the actual tree to lock the keys. Named-key `InputType` is
 * unchanged.
 *
 * Type-checked only (`tsc --noEmit`).
 */
import type {
    CallableTranslations,
    PartialFlexibleTranslations,
} from '@/index';

function initTranslations<T>(
    _translations?: PartialFlexibleTranslations<T>
): CallableTranslations<T> {
    return {} as CallableTranslations<T>;
}

type RecordSchema = {
    enums: Record<string, Record<string, { label: string }>>;
};

type NamedSchema = {
    greeting: string;
    user: { name: string };
};

type RecordInput = PartialFlexibleTranslations<RecordSchema>;
type NamedInput = PartialFlexibleTranslations<NamedSchema>;

declare const recordInput: RecordInput;
declare const namedInput: NamedInput;

// ---------------------------------------------------------------------------
// Before init — lost: Record index may be a special, so `.label()` is unsafe.
// ---------------------------------------------------------------------------

function readRecordRaw(translations: RecordInput) {
    // @ts-expect-error `Foo` may be `LangTagSpecialFn`, not `{ createdAt }`
    return translations.enums?.Foo?.createdAt?.label();
}

readRecordRaw(recordInput);

// ---------------------------------------------------------------------------
// After init — `CallableTranslations` is not Partial and not special-widened.
// ---------------------------------------------------------------------------

function readRecordAfterInit(translations: RecordInput) {
    const t = initTranslations<RecordSchema>(translations);
    // Sharp vs special — not sharp vs "what was passed".
    t.enums.Foo.createdAt.label();
    t.enums.Bar.createdAt.label();
}

readRecordAfterInit(recordInput);

const WRITTEN = {
    enums: {
        Foo: { createdAt: { label: 'x' } },
    },
} as const;

function readRecordAfterInitFromWritten() {
    const t = initTranslations(WRITTEN);
    t.enums.Foo.createdAt.label();
    // @ts-expect-error `Bar` was not in `WRITTEN`
    return t.enums.Bar.createdAt.label();
}

readRecordAfterInitFromWritten();

// ---------------------------------------------------------------------------
// Named keys — never lost. Raw `InputType` is not `leaf | special`.
// ---------------------------------------------------------------------------

function readNamedRaw(translations: NamedInput) {
    const greeting = translations.greeting;
    if (typeof greeting === 'function') {
        return greeting();
    }
    return greeting ?? translations.user?.name;
}

readNamedRaw(namedInput);
