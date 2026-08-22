/**
 * What `asDynamicCaller` loses vs `withDynamicCaller` (`$`) and vs a plain `t`.
 *
 * Type-checked only (`tsc --noEmit`). `@ts-expect-error` is the contract.
 * Pair with `dynamic-tag-project-nested-placeholders.ts` (the intended win).
 */
import {
    type CallableTranslations,
    type DefinePlaceholderParams,
    type PartialFlexibleTranslations,
    createCallableTranslations,
    isLangTagSpecial,
} from 'lang-tag';

import { asDynamicCaller, withDynamicCaller } from '@/dynamic-caller';

import { i18n_library } from './i18n-library';

const BASE = {
    greeting: () => 'Hi',
    inbox: {
        unread: (params?: { count?: number; sender?: string }) =>
            `${params?.count} from ${params?.sender}`,
        empty: () => 'Nothing',
    },
    user: {
        name: () => 'Ada',
    },
};

const withDollar = withDynamicCaller(BASE, {
    recursive: true,
    typedKeys: true,
});
const t = asDynamicCaller(BASE, { recursive: true, typedKeys: true });

// ---------------------------------------------------------------------------
// 1. `t` is a function — the whole node is a special.
//    `$`: `isLangTagSpecial(t)` is false; only `t.$` is the special.
//    `as`: `isLangTagSpecial(t)` is true. `typeof t === 'function'`.
//    Anything that does `if (isLangTagSpecial(x)) skip` drops the tree.
// ---------------------------------------------------------------------------

isLangTagSpecial(withDollar);
isLangTagSpecial(withDollar.$);
isLangTagSpecial(t);
isLangTagSpecial(t.inbox);
isLangTagSpecial(t.greeting);

type _AsIsCallable = typeof t extends (...args: any[]) => any ? true : false;
const _asIsCallable: _AsIsCallable = true;
type _DollarIsNotCallable = typeof withDollar extends (...args: any[]) => any
    ? true
    : false;
const _dollarIsNotCallable: _DollarIsNotCallable = false;

function skipSpecials(value: unknown): unknown {
    if (isLangTagSpecial(value)) {
        return undefined;
    }
    return value;
}

skipSpecials(withDollar);
skipSpecials(t);

// ---------------------------------------------------------------------------
// 2. Collision with `Function` built-ins (`name`, `length`).
//    Runtime overwrites them (`defineProperty`). `t.user.name` is the
//    translation, not `Function.name`. `$` never sat on a function.
// ---------------------------------------------------------------------------

t.user.name();
t.user('name');

const _nameIsLeaf: typeof t.user.name extends (...args: any[]) => string
    ? true
    : false = true;

// `name` / `length` on the callable node itself are the function's, unless
// the schema also has those keys at that level.
const _topHasNoNameKey: typeof t.name extends string ? true : false = true;

// ---------------------------------------------------------------------------
// 3. Caller params are `any[]` — same as `t.$('unread', params)`.
//    Placeholders stay sharp only on the static leaf.
// ---------------------------------------------------------------------------

t.inbox.unread({ count: 3, sender: 'Ada' });
t.inbox('unread', { count: 3, sender: 'Ada' });
// Dynamic caller does not infer `{{count}}` / `{{sender}}`.
t.inbox('unread', { nope: true });
t.inbox.unread({
    count: 3,
    sender: 'Ada',
    // @ts-expect-error static leaf still rejects extra keys
    extra: true,
});

// ---------------------------------------------------------------------------
// 4. `required: true` placeholders vs library InputType — same as `$`.
//    `ParameterizedTranslation` is `(params?) => string`. A required-param
//    leaf is not assignable. Not caused by the caller shape.
// ---------------------------------------------------------------------------

type Mailbox = {
    inbox: { unread: string };
};

const MAILBOX = {
    inbox: { unread: 'You have {{count}} unread from {{sender}}' },
} as const satisfies Mailbox;

const mailboxTag = i18n_library<Mailbox>(MAILBOX);

function MailboxView(translations: typeof mailboxTag.InputType) {
    const t = mailboxTag.initTranslations(translations);
    return t.inbox.unread({ count: 3, sender: 'Ada' });
}

type StrictPPO = DefinePlaceholderParams<{
    required: true;
    allowExtras: false;
}>;

const strictT = asDynamicCaller(
    createCallableTranslations(MAILBOX, undefined, {
        transform: ({ value }) => value,
    }) as CallableTranslations<typeof MAILBOX, StrictPPO>,
    { recursive: true, typedKeys: true }
);

strictT.inbox.unread({ count: 3, sender: 'Ada' });
// @ts-expect-error placeholders are required
strictT.inbox.unread();
// @ts-expect-error missing `sender`
strictT.inbox.unread({ count: 3 });

// @ts-expect-error required-param leaf is not a ParameterizedTranslation
MailboxView(strictT);

const looseT = asDynamicCaller(
    createCallableTranslations(MAILBOX, undefined, {
        transform: ({ value }) => value,
    }),
    { recursive: true, typedKeys: true }
);

MailboxView(looseT);
const _looseOk: PartialFlexibleTranslations<Mailbox> = looseT;

// ---------------------------------------------------------------------------
// 5. A bare branded caller assigns as the whole InputType node.
//    Record: `| LangTagSpecialFn` on the node (cousin of library-1 §4
//    `leaf | special` on the index). Partial named: weak type + brand.
//    Write side, not a typo on `t`. After init, CallableTranslations is sharp.
// ---------------------------------------------------------------------------

type RecordSchema = {
    enums: Record<string, Record<string, { label: string }>>;
};

const recordTag = i18n_library<RecordSchema>({
    enums: { Foo: { createdAt: { label: 'x' } } },
});

const bareCaller = asDynamicCaller({} as Record<string, never>, {
    recursive: true,
    typedKeys: false,
});

const _bareRecordNode: typeof recordTag.InputType = {
    enums: bareCaller,
};

// Partial named node is weak + brand — a bare caller assigns there too.
const _bareNamedNode: typeof mailboxTag.InputType = {
    inbox: bareCaller,
};

// ---------------------------------------------------------------------------
// 6. Spread drops callability — same idea as non-enumerable `$`.
//    Enumerable leaves survive. The result is not `t('greeting')`.
// ---------------------------------------------------------------------------

const spread = { ...t };
spread.greeting();
spread.inbox.empty();
// @ts-expect-error spread of a function does not keep the call signature
spread('greeting');
