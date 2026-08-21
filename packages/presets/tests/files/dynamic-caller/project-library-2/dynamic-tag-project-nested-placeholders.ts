/**
 * Nested section + `{{placeholders}}` through `asDynamicCaller`.
 *
 * Project `t` is callable (`t.inbox('unread', params)`). Leaf functions keep
 * inferred placeholder params (`t.inbox.unread({ count, sender })`).
 *
 * Type-checked only (`tsc --noEmit`).
 */
import {
    type CallableTranslations,
    type DefinePlaceholderParams,
    createCallableTranslations,
} from 'lang-tag';

import { asDynamicCaller } from '@/dynamic-caller';

import { i18n_library } from './i18n-library';
import { i18n_project } from './i18n-project';

type Inbox = {
    title: string;
    unread: string;
    empty: string;
};

type Profile = {
    greeting: string;
    name: string;
};

type Mailbox = {
    inbox: Inbox;
    profile: Profile;
};

const MAILBOX = {
    inbox: {
        title: 'Inbox',
        unread: 'You have {{count}} unread from {{sender}}',
        empty: 'Nothing here',
    },
    profile: {
        greeting: 'Hello {{name}}',
        // `name` is both a Function built-in and a translation key + placeholder.
        name: '{{name}}',
    },
} as const satisfies Mailbox;

const mailboxTag = i18n_library<Mailbox>(MAILBOX);

function MailboxView(translations: typeof mailboxTag.InputType) {
    const t = mailboxTag.initTranslations(translations);
    return t.inbox?.unread?.({ count: 3, sender: 'Ada' });
}

const projectMailbox = i18n_project(MAILBOX);
const t = projectMailbox.useTranslations();

// Static leaves keep inferred placeholder params after the wrap.
t.inbox.unread({ count: 3, sender: 'Ada' });
t.inbox.empty();
t.inbox.title();
t.profile.greeting({ name: 'Ada' });
t.profile.name({ name: 'Ada' });

// Dynamic caller on the nested section — key is open (`typedKeys: false`);
// params are forwarded as `any[]` (not inferred on the caller).
t.inbox('unread', { count: 3, sender: 'Ada' });
t.inbox('empty');
t.profile('greeting', { name: 'Ada' });
t.profile('name', { name: 'Ada' });
t('inbox');

MailboxView(t);
const _accepted: typeof mailboxTag.InputType = t;

// Strict PPO: required placeholders survive asDynamicCaller on the leaf.
// That leaf is then not a `ParameterizedTranslation` (optional params),
// so the same `t` no longer assigns to the library InputType.
type StrictPPO = DefinePlaceholderParams<{
    required: true;
    allowExtras: false;
}>;

const strictT = asDynamicCaller(
    createCallableTranslations(MAILBOX, undefined, {
        transform: ({ value }) => value,
    }) as CallableTranslations<typeof MAILBOX, StrictPPO>,
    { recursive: true, typedKeys: false }
);

strictT.inbox.unread({ count: 3, sender: 'Ada' });
// @ts-expect-error placeholders are required
strictT.inbox.unread();
// @ts-expect-error missing `sender`
strictT.inbox.unread({ count: 3 });
// @ts-expect-error extra key is rejected
strictT.inbox.unread({ count: 3, sender: 'Ada', extra: true });

// @ts-expect-error required-param leaf is not assignable to InputType
MailboxView(strictT);
