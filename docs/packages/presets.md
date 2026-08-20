# @lang-tag/presets

## Overview

Optional add-ons for `lang-tag` (the runtime bridge to your i18n
setup). Import each helper from its own subpath. Nothing here is
required to use core or the CLI.

## Why it exists

1. Share the dynamic `$()` caller pattern across apps.
2. Interpolate React nodes into `{{ placeholders }}` without
   re-implementing fragment logic.
3. Keep `lang-tag` itself tiny and free of React.

## Install

```bash
npm install @lang-tag/presets lang-tag
# only if you use react/placeholders:
npm install react
```

## `dynamic-caller`

Wraps a callable translations object and adds a runtime caller
(default property name `$`).

```ts
import { withDynamicCaller } from '@lang-tag/presets/dynamic-caller';

const t = withDynamicCaller(translations.server());

t.greeting({ name: 'Ada' }); // static
t.$('greeting', { name: 'Ada' }); // dynamic key
```

### Options

| Option       | Default                   | Behaviour                                |
| ------------ | ------------------------- | ---------------------------------------- |
| `callerName` | `'$'`                     | Name of the injected property            |
| `recursive`  | `false`                   | Also inject on nested objects            |
| `onMissing`  | `` `#Missing:${path}#` `` | Fallback string for missing keys         |
| `typedKeys`  | `true`                    | Type `key` as the union of callable keys |

With `typedKeys: true` (default), unknown keys fail at compile time.
Pass `typedKeys: false` for fully dynamic `string` keys (e.g. keys from
an API).

```ts
const t = withDynamicCaller(base.server(), {
    callerName: 'call',
    recursive: true,
    onMissing: (path) => `[[${path}]]`,
});

t.call('greeting');
t.user.call('name');
```

### When to use

- Runtime key is a **union** of known messages (statuses, steps).
- You still want autocomplete and exhaustiveness under `typedKeys`.

Prefer static `t.status.pending()` when the key is fixed in source.

## `react/placeholders`

```ts
import { processPlaceholders } from '@lang-tag/presets/react/placeholders';

createCallableTranslations(translations, config, {
    transform: ({ value, params }) => processPlaceholders(value, params),
});
```

- String / number params → string result.
- Any React element param → fragment tree mixing text and nodes.
- Custom `pattern`: RegExp whose **first capture group** is the
  placeholder name (`/g` added if missing).

```ts
processPlaceholders(value, params, { pattern: /\$\{(.*?)\}/g });
```

Pair with core `DefinePlaceholderParams` / `DollarBraceExtractor` if
your **types** should match a non-default syntax.

## Runtime behaviour

| Helper                | Missing / edge case                                                                |
| --------------------- | ---------------------------------------------------------------------------------- |
| `withDynamicCaller`   | `onMissing(path)` (visible marker by default)                                      |
| `processPlaceholders` | Unmatched placeholders left to your pattern; missing params typically become empty |

Use visible markers in development so missing keys never look like
valid UI copy.

## Guidelines

1. Static access for fixed keys; `$()` for typed runtime unions.
2. Do not build translation keys by string concatenation when a union
   exists.
3. Prefer one complete sentence with placeholders over joining
   translated fragments.
4. Keep React-specific interpolation in the React preset — do not pull
   React into core.

## See also

- [Core guide](./core.md)
- npm: [`@lang-tag/presets`](https://www.npmjs.com/package/@lang-tag/presets),
  [`lang-tag`](https://www.npmjs.com/package/lang-tag)
