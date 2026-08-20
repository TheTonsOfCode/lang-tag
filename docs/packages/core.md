# lang-tag (core)

## Overview

`lang-tag` is a thin **bridge** between your UI and a translation
library (i18next, next-intl, …) — or a temporary stand-in while you
are still undecided. It turns a nested object of source strings into
**callable translation functions** with TypeScript-checked keys and
placeholders. Collection, path rules, and locale files belong to
[`@lang-tag/cli`](./cli.md) — they never enter the app bundle.

Typical size: ~1KB.

## Why it exists

1. **Bridge, not a lock-in** — call sites stay stable when you swap or
   adopt an i18n backend later; refactoring stays cheap.
2. **Type translations top to bottom** — enums/unions can require a
   full message map; placeholders can require every name (or allow
   extras) depending on the types you configure on the tag.
3. **One check stack** — TypeScript + `@lang-tag/cli`, not ESLint i18n
   plugins and a pile of extra libraries. Missing keys, bad tags, and
   collect conflicts fail in `tsc` / CI.
4. Colocate source text with the component that uses it; type any
   placeholder syntax (`{{…}}`, `${…}`, or a custom extractor).
5. After setup, developers only write English in the component — they
   do not maintain `namespace.json` by hand. The CLI (or CI/CD)
   collects; another tool translates to the other locales (namespaces
   or one dictionary — your collector).
6. Libraries can ship tags that consuming apps import and override.

## Architecture

```
your tag (lang / i18n)
        │
        ▼
createCallableTranslations(translations, config, strategy)
        │
        ├─► nested object of (params?) => string
        └─► strategy.transform / processKey  (your i18n wiring)
```

- **Tag function** — thin wrapper you own (or generate with
  `lang-tag init-tag`).
- **Config** — optional `{ namespace, path }` used by the CLI and often
  by your `transform` when looking up locale resources.
- **Strategy** — at minimum a `transform` that turns
  `{ value, path, params, … }` into the string shown in the UI.

The core does **not** load locale JSON. In development many apps return
the English source from the tag; in production `transform` delegates to
the i18n library.

## Quick start

```bash
npm install lang-tag
npm install -D @lang-tag/cli
```

```ts
import {
    type LangTagTranslations,
    type LangTagTranslationsConfig,
    createCallableTranslations,
} from 'lang-tag';

export function lang<const T extends LangTagTranslations>(
    translations: T,
    config?: LangTagTranslationsConfig
) {
    return createCallableTranslations(translations, config, {
        transform: ({ value, params }) => {
            if (!params) return value;
            return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
                params[key] != null ? String(params[key]) : ''
            );
        },
    });
}
```

```tsx
const welcomeTranslations = lang(
    {
        title: 'Welcome',
        greeting: 'Hello, {{name}}!',
    },
    { namespace: 'common', path: 'welcome' }
);

welcomeTranslations.title();
welcomeTranslations.greeting({ name: 'Ada' });
```

Generated tags from `init-tag` usually expose `.client()` / `.server()`
factories so React hooks stay inside the client path.

## End-to-end typing

Strictness is yours to dial in. A common pattern: close a key set with
`as const satisfies Record<…>` so every enum member must have a
translation and typos are compile errors:

```ts
type Status = 'pending' | 'done' | 'failed';

export const statusTranslations = lang(
    {
        pending: 'Pending',
        done: 'Done',
        failed: 'Failed',
    } as const satisfies Record<Status, string>,
    { namespace: 'common', path: 'status' }
);
```

On the call side, `DefinePlaceholderParams` controls whether params are
mandatory and whether unknown keys are allowed. Prepare the tag types
once; the rest of the app inherits that policy — no separate i18n lint
ecosystem.

The CLI complements TypeScript: invalid object shapes, path conflicts,
and collect failures show up in CI before English is handed to an
external translator.

## Placeholders

Placeholder typing is compile-time only. **Any** syntax can be typed.
Built-ins live in `placeholders-extractors` (default
`DoubleBraceExtractor` `{{…}}`, plus `${…}`, `{…}`, `%{…}`, `:name`,
…). For anything else, write a small recursive `Extract…` type and an
interface extending `PlaceholderExtractor`, then pass it through
`DefinePlaceholderParams` — no core fork.

```ts
import type { DefinePlaceholderParams, DollarBraceExtractor } from 'lang-tag';

type PlaceholderParams = DefinePlaceholderParams<{
    required: true; // params object required when placeholders exist
    allowExtras: false; // reject unknown param keys
    // extractor: DollarBraceExtractor, // or a custom PlaceholderExtractor
}>;
```

Strictness is split into:

- **`required`** — whether the params argument itself is mandatory
- **`allowExtras`** — whether keys outside the inferred set are allowed

Runtime replacement stays in your tag `transform`. For React nodes
inside sentences, use
[`@lang-tag/presets/react/placeholders`](./presets.md).

## Lookup

`lookupTranslation(translations, path)` resolves a nested function.
Prefer a **segment array** (e.g. from `unprefixedPath`) so keys that
contain `.` are not split incorrectly. A dotted string still works for
simple paths.

## Flexible types

`FlexibleTranslations`, `PartialFlexibleTranslations`, and
`normalizeTranslations` help when mapping external / partial
translation shapes onto your tag structure (library import flows).

## Pitfalls

### Object literal required

The CLI can only collect an object literal written **in place** as the
first tag argument. Variables, imports, or builders are invisible to
`collect`.

```ts
// Correct
lang({ save: 'Save' }, { namespace: 'common' });

// Incorrect — not collected
const messages = { save: 'Save' };
lang(messages, { namespace: 'common' });
```

### Typing wrappers

`as const` and `satisfies` on the literal are fine (including nested).
Prefer `as const satisfies Record<Key, string>` when you want both a
closed key set and literal message types for placeholder inference.
A generic like `lang<Record<Key, string>>(...)` widens messages to
`string` and loses placeholder inference.

## Guidelines

1. Keep local translations next to their component.
2. Share domain maps (statuses, roles) in common tag files.
3. Translate complete sentences; interpolate values with placeholders.
4. Name exported tag results with a `Translations` suffix.
5. Always pass an object literal to the tag (required for collect).

## See also

- [CLI guide](./cli.md)
- [Presets](./presets.md)
- npm: [`lang-tag`](https://www.npmjs.com/package/lang-tag),
  [`@lang-tag/cli`](https://www.npmjs.com/package/@lang-tag/cli),
  [`@lang-tag/presets`](https://www.npmjs.com/package/@lang-tag/presets)
