/**
 * Type-level checks for {@link asDynamicCaller}.
 *
 * Type-checked only (`tsc --noEmit`).
 */
import type { PartialFlexibleTranslations } from 'lang-tag';

import {
    type AsDynamicCaller,
    type DynamicCaller,
    asDynamicCaller,
} from '@/dynamic-caller';

type Expect<T extends true> = T;
type Equal<A, B> =
    (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2
        ? true
        : false;

type Base = {
    greeting: (params?: { name?: string }) => string;
    user: {
        name: () => string;
    };
};

// --- Non-recursive (default) ------------------------------------------------

type Default = AsDynamicCaller<Base, false>;

type _DefaultCaller = Expect<Equal<Parameters<Default>[0], 'greeting'>>;
type _DefaultGreeting = Expect<Equal<Default['greeting'], Base['greeting']>>;
type _DefaultNested = Expect<Equal<Default['user'], Base['user']>>;

// --- Recursive --------------------------------------------------------------

type Recursive = AsDynamicCaller<Base, true>;

type _RecursiveTopKey = Expect<Equal<Parameters<Recursive>[0], 'greeting'>>;
type _RecursiveNestedKey = Expect<
    Equal<Parameters<Recursive['user']>[0], 'name'>
>;
type _RecursiveFn = Expect<Equal<Recursive['user']['name'], () => string>>;

// --- Inference --------------------------------------------------------------

declare const base: Base;

const def = asDynamicCaller(base);
def('greeting');
def.greeting({ name: 'Ada' });
// @ts-expect-error unknown keys are rejected by default (typedKeys: true)
def('nope');
// @ts-expect-error nested objects are not callable unless `recursive` is set
def.user('name');

const rec = asDynamicCaller(base, { recursive: true });
rec('greeting');
rec.user('name');

declare const caller: DynamicCaller;
caller('some.key', { any: 'params' }) satisfies string;

// ---------------------------------------------------------------------------
// typedKeys
// ---------------------------------------------------------------------------

type Loose = AsDynamicCaller<Base, false, false>;
type _LooseKey = Expect<Equal<Parameters<Loose>[0], string>>;

type TypedTop = AsDynamicCaller<Base, false, true>;
type _TypedTopKey = Expect<Equal<Parameters<TypedTop>[0], 'greeting'>>;

type TypedNested = AsDynamicCaller<Base, true, true>['user'];
type _TypedNestedKey = Expect<Equal<Parameters<TypedNested>[0], 'name'>>;

const typed = asDynamicCaller(base);
typed('greeting');
typed.greeting({ name: 'Ada' });
// @ts-expect-error 'nope' is not a translation key
typed('nope');
// @ts-expect-error no string index — unknown property
typed.nope;
// @ts-expect-error 'user' is a nested object, not a callable translation key
typed('user');

const loose = asDynamicCaller(base, { typedKeys: false });
loose('nope');

// ---------------------------------------------------------------------------
// Record<Union> keys
// ---------------------------------------------------------------------------

type Status = 'new' | 'done';
declare const statusTranslations: Record<Status, () => string>;

const statusTyped = asDynamicCaller(statusTranslations, { recursive: true });
statusTyped('new');
statusTyped('done');
// @ts-expect-error 'saxas' is not one of the Status keys
statusTyped('saxas');

type StatusCaller = AsDynamicCaller<Record<Status, () => string>, true, true>;
type _StatusKeys = Expect<Equal<Parameters<StatusCaller>[0], Status>>;

const statusLoose = asDynamicCaller(statusTranslations, {
    recursive: true,
    typedKeys: false,
});
statusLoose('saxas');

// ---------------------------------------------------------------------------
// Record-typed library InputType: callable `t` must stay assignable.
// ---------------------------------------------------------------------------

type RecordSchema = {
    enums: Record<
        string,
        Record<string, { label: string; description?: string }>
    >;
};

type SchemaLiteral = {
    enums: {
        AnnotationSortField: {
            createdAt: { label: () => string; description: () => string };
            updatedAt: { label: () => string; description: () => string };
        };
    };
};

declare const wrappedSchema: AsDynamicCaller<SchemaLiteral, true>;
const _accepted: PartialFlexibleTranslations<RecordSchema> = wrappedSchema;
