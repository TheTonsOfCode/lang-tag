/**
 * Tradeoffs of branded lang-tag specials on Record InputType.
 *
 * Type-checked only (`tsc --noEmit`). `@ts-expect-error` lines are the
 * contract: if a hole closes or a guarantee regresses, this file fails CI.
 *
 * Pair with `dynamic-tag-project-record-library.ts` (the intended win:
 * `SomeComponent(t)` with a project tag that used `withDynamicCaller`).
 */
import type { PartialFlexibleTranslations } from 'lang-tag';

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
            createdAt: { label: 'Created At', description: '' },
        },
    },
} as const satisfies Schema;

const library = i18n_library<Schema>(SCHEMA);
type InputType = typeof library.InputType;

function SomeComponent(translations: typeof library.InputType) {
    const t = library.initTranslations(translations);
    return t.enums?.AnnotationSortField?.createdAt?.label();
}

const projectT = i18n_project(SCHEMA).useTranslations();

// ---------------------------------------------------------------------------
// 1. The win — project `t` is assignable to a Record-typed library InputType.
// ---------------------------------------------------------------------------

SomeComponent(projectT);
const _accepted: InputType = projectT;

// ---------------------------------------------------------------------------
// 2. Record InputType accepts branded specials only — not a plain function.
// ---------------------------------------------------------------------------

const _extraCallable: InputType = {
    enums: {
        Foo: {
            createdAt: { label: 'Created At' },
            // @ts-expect-error unbranded extra function is not a leaf
            oops: () => 'not a leaf',
        },
    },
};

// A junk string still has to look like the leaf, not a free `string` value.
const _notALeaf: InputType = {
    enums: {
        Foo: {
            createdAt: { label: 'Created At' },
            // @ts-expect-error string is not `{ label?, description? }` or a branded special
            junk: 'nope',
        },
    },
};

// ---------------------------------------------------------------------------
// 3. Named-key InputType stays closed — extra `$` is still rejected.
// ---------------------------------------------------------------------------

const named = i18n_library({ greeting: 'Hi', user: { name: 'Ada' } });

const _namedOk: typeof named.InputType = {
    greeting: 'Hello',
    user: { name: 'Ada' },
};

const _namedExtra: typeof named.InputType = {
    greeting: 'Hello',
    // @ts-expect-error named keys have no index to absorb `$`
    $: () => 'nope',
};

// ---------------------------------------------------------------------------
// 4. `translations: InputType` still sees `leaf | special` on Record indexes.
//    After initTranslations, CallableTranslations is sharp again.
// ---------------------------------------------------------------------------

function readRawInput(translations: InputType) {
    // @ts-expect-error `AnnotationSortField` may be a branded special
    return translations.enums?.AnnotationSortField?.createdAt?.label();
}

function readAfterInit(translations: InputType) {
    const t = library.initTranslations(translations);
    return t.enums?.AnnotationSortField?.createdAt?.label();
}

readRawInput(_accepted);
readAfterInit(_accepted);

// ---------------------------------------------------------------------------
// 5. Hand-written `{ [x: string]: leaf }` (no PartialFlexibleTranslations)
//    still rejects `$` — the core loosening only applies to InputType.
// ---------------------------------------------------------------------------

type HandWritten = {
    enums?: {
        [x: string]: {
            [x: string]: { label?: string; description?: string };
        };
    };
};

// @ts-expect-error `$` is incompatible with the hand-written index
const _handWritten: HandWritten = projectT;

const _handWrittenViaCore: PartialFlexibleTranslations<Schema> = projectT;

// ---------------------------------------------------------------------------
// 6. Freshness: extra top-level key vs a nested type error in the same literal.
//    `keyof InputType` is only `"enums"`. `aaa` is never a schema key.
// ---------------------------------------------------------------------------

type InputKeys = keyof InputType;
const _onlyEnums: InputKeys = 'enums';
// @ts-expect-error top-level extra key is not part of the schema
const _notAKey: InputKeys = 'aaa';

const _asVar: InputType = {
    enums: { Foo: { createdAt: { label: 'x' } } },
    // @ts-expect-error variable annotation still catches the extra key
    aaa: 'dasda',
};

// Control: only valid nested keys → TS still flags top-level `aaa`.
SomeComponent({
    enums: { Foo: { createdAt: { label: 'x' } } },
    // @ts-expect-error extra top-level key
    aaa: 'dasda',
});

// Two valid index keys (Foo + Bar) — `Bar` alone does not hide `aaa`.
SomeComponent({
    enums: {
        Foo: { createdAt: { label: 'xxx' } },
        Bar: { createdAt: { label: 'yyy' } },
    },
    // @ts-expect-error extra top-level key, same as the single-key control
    aaa: 'dasda',
});

// Nested assignability error (`wrong`) in the same literal: TS reports that
// inner error and stops the outer freshness pass, so `aaa` is silent.
// Same hole as `dynamic-tag-project-record-library.ts`.
SomeComponent({
    enums: {
        Foo: {
            createdAt: {
                label: 'xxx',
                // @ts-expect-error leaf is `{ label?, description? }`
                wrong: 'does not match Schema',
            },
        },
    },
    aaa: 'dasda',
});

// ---------------------------------------------------------------------------
// 7. `$` is non-enumerable at runtime (Object.keys / spread / for…in skip it).
//    Types still list `$` after spread — the type and the value diverge.
// ---------------------------------------------------------------------------

const spread = { ...projectT };
spread.$('test');
spread.enums.AnnotationSortField.$('createdAt');
