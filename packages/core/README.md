# lang-tag

A thin **bridge** between your UI and a translation library (i18next,
next-intl, …) — or a stand-in while you have not picked one yet.

You define source text next to the component that uses it. TypeScript
checks keys and placeholder params. Swap or add an i18n backend later
without rewriting call sites. Pair with `@lang-tag/cli` and collection
/ path generation get out of the way fast.

Set up once, and day to day a developer only writes English in that
same component — no hand-editing `namespace.json` or hunting keys in
locale trees. The CLI (locally or in CI/CD) collects the messages;
another tool can fan them out to the other languages.

Runtime stays tiny (~1KB —
[Bundlephobia](https://bundlephobia.com/package/lang-tag)). The CLI
never ships in the app bundle.

## Install

```bash
npm install lang-tag
npm install -D @lang-tag/cli
```

Optional helpers: `@lang-tag/presets`.

## Overview

You own a small **tag function** (e.g. `lang` / `i18n`) built with
`createCallableTranslations`. Tags turn a nested object of strings into
callable functions. Wire `transform` to your library — or interpolate
locally until you decide.

```ts
import { createCallableTranslations } from 'lang-tag';

export function lang<const T extends Record<string, any>>(
    translations: T,
    config?: { namespace?: string; path?: string }
) {
    return {
        server: () =>
            createCallableTranslations(translations, config, {
                transform: ({ value, path, params }) => {
                    // today: local source / your own interpolator
                    // later: t(path, params) from i18next / next-intl / …
                    return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
                        String(params?.[key] ?? '')
                    );
                },
            }),
    };
}
```

```tsx
const checkoutTranslations = lang(
    {
        greeting: 'Welcome {{name}}!',
        actions: {
            pay: 'Pay now',
            cancel: 'Cancel',
        },
    },
    { namespace: 'orders', path: 'checkout' }
);

const t = checkoutTranslations.server();
t.greeting({ name: 'Ada' }); // typed params
t.actions.pay();
```

Scaffold a full tag with `lang-tag init-tag` (React / client / server
variants included).

## Why use it

1. **Bridge, not a lock-in** — same call sites whether you use a library
   today or plug one in later; refactoring the backend stays cheap.
2. **Type translations top to bottom** — force every enum/key to have a
   message, require every placeholder, reject extras — all via the types
   _you_ configure (no ESLint i18n plugins, no extra lint stack).
3. **One toolchain** — TypeScript + `@lang-tag/cli` catch missing keys,
   bad tags, and collect conflicts; CI can regenerate, collect, then hand
   English off to any translator for the other locales.
4. Source text lives next to the UI that needs it.
5. Libraries can ship tags that apps import and override.

## End-to-end typing

You control how strict things are. With `as const` + `satisfies` (or a
generic on the tag), TypeScript can require a full map for an enum /
union — missing or extra keys fail at compile time:

```ts
type Status = 'pending' | 'done' | 'failed';

export const statusTranslations = lang(
    {
        pending: 'Pending',
        done: 'Done',
        failed: 'Failed',
        // missing `failed` → type error
        // typo key → type error
    } as const satisfies Record<Status, string>,
    { namespace: 'common', path: 'status' }
);
```

Placeholders follow the same idea. Configure `DefinePlaceholderParams`
(from `lang-tag`) so callers must pass every inferred name, or may omit
them, or may not pass unknown keys — whatever your project types ask for:

```ts
import type { DefinePlaceholderParams } from 'lang-tag';

type PlaceholderParams = DefinePlaceholderParams<{
    required: true; // must pass params when the string has placeholders
    allowExtras: false; // reject { name, unexpected: … }
}>;

// with required: true
t.greeting({ name: 'Ada' }); // ok
t.greeting(); // type error
```

How far this goes is up to the types you prepare on the tag. The point:
one library + TypeScript covers the surface — not a zoo of ESLint
plugins.

Together with the CLI in CI (`regenerate-tags` → `collect` → your
translate tool), you also catch invalid tags, path conflicts, and
missing collected English before another tool fans out to other
languages (namespace files or a single dictionary — your collector
choice).

## Placeholders

Any placeholder syntax can be typed. Default is `{{ name }}`
(`DoubleBraceExtractor`). Ready-mades you can reuse as-is:

| Extractor                 | Syntax       |
| ------------------------- | ------------ |
| `DoubleBraceExtractor`    | `{{ name }}` |
| `DollarBraceExtractor`    | `${ name }`  |
| `SingleBraceExtractor`    | `{ name }`   |
| `PercentBraceExtractor`   | `%{ name }`  |
| `PercentPercentExtractor` | `%name%`     |
| `ColonExtractor`          | `:name`      |
| `DollarIdentExtractor`    | `$name`      |
| `AngleBracketExtractor`   | `<name>`     |
| `DoubleSquareExtractor`   | `[[ name ]]` |
| `SingleSquareExtractor`   | `[ name ]`   |

Or write your own in a few lines: a recursive string type that pulls
names out of the template, plus an interface that plugs it into
`DefinePlaceholderParams`:

```ts
import type {
    DefinePlaceholderParams,
    PlaceholderExtractor,
    Trim,
} from 'lang-tag';

// 1) Parse your syntax — here: !name!
type ExtractBang<S extends string> =
    S extends `${string}!${infer Name}!${infer Rest}`
        ? Trim<Name> | ExtractBang<Rest>
        : never;

// 2) Expose it as a PlaceholderExtractor (same shape as the built-ins)
interface BangExtractor extends PlaceholderExtractor {
    placeholders: ExtractBang<this['template']>;
}

// 3) Wire it into the tag's placeholder options
type PlaceholderParams = DefinePlaceholderParams<{
    extractor: BangExtractor;
    required: true;
}>;
```

`Hello !name!` then infers `{ name: … }` on the call site. Keep runtime
replacement in sync in your tag `transform` (or a preset).

| Option        | Role                                    |
| ------------- | --------------------------------------- |
| `required`    | Params required when placeholders exist |
| `allowExtras` | Allow extra keys beyond inferred names  |
| `extractor`   | How names are parsed out of the message |

Typing is compile-time only. Runtime replacement is **your**
`transform` (or `@lang-tag/presets` for React nodes).

## Important APIs

| Export                       | Purpose                                       |
| ---------------------------- | --------------------------------------------- |
| `createCallableTranslations` | Object of strings → nested callable functions |
| `lookupTranslation`          | Resolve a function by path segments           |
| `FlexibleTranslations` / …   | Types for partial / flexible translation maps |
| `DefinePlaceholderParams`    | Configure placeholder inference               |

## Guidelines

1. Pass an **object literal** as the first tag argument — variables are
   not collected by the CLI.
2. Use `as const satisfies Record<Key, string>` (or equivalent) when a
   closed set of keys must be fully translated.
3. Tune `required` / `allowExtras` / `extractor` to match how strict
   call sites should be.
4. Keep reusable domain maps (statuses, roles) in shared tag files.
5. Translate full sentences; use placeholders for values and nodes.

## See also

- [`@lang-tag/cli`](https://www.npmjs.com/package/@lang-tag/cli) — collect, regenerate, import
- [`@lang-tag/presets`](https://www.npmjs.com/package/@lang-tag/presets) — dynamic caller, React placeholders
- [Docs](https://github.com/TheTonsOfCode/lang-tag/blob/main/docs/packages/core.md)
- [Changelog](./CHANGELOG.md)

## License

MIT
