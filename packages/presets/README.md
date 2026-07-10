# @lang-tag/presets

Optional, ready-made presets and helpers for [`lang-tag`](https://github.com/TheTonsOfCode/lang-tag).

`lang-tag` stays intentionally minimal. This package bundles common add-ons so
you don't have to re-implement them in every project.

## Install

```bash
npm install @lang-tag/presets
```

`lang-tag` is a **peer dependency** — install it alongside:

```bash
npm install lang-tag
```

## Imports

Each preset is imported from its own path:

```ts
import { withDynamicCaller } from '@lang-tag/presets/dynamic-caller';
```

## Presets

### `dynamic-caller`

Adds a dynamic caller property (named `$` by default) to a callable
translations object, so a translation can be invoked by a **runtime** key
instead of statically.

```ts
import { withDynamicCaller } from '@lang-tag/presets/dynamic-caller';

const t = withDynamicCaller(base.server());

t.$('greeting', { name: 'Paul' }); // invoke by key + forward params
t.$('unknown'); // -> "#Missing:unknown#"
```

#### Options

| Option       | Type                       | Default       | Description                                                                                                                            |
| ------------ | -------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `callerName` | `string`                   | `'$'`         | Name of the injected caller property.                                                                                                  |
| `recursive`  | `boolean`                  | `false`       | Also add the caller to every nested translations object.                                                                               |
| `onMissing`  | `(path: string) => string` | `#Missing:…#` | Called when a key can't be resolved. With `recursive`, `path` is the full dotted path.                                                 |
| `typedKeys`  | `boolean`                  | `false`       | Type the caller's `key` argument to the object's translation keys (autocomplete + rejects unknown keys). Type-only, no runtime effect. |

```ts
const t = withDynamicCaller(base.server(), {
    callerName: 'call',
    recursive: true,
    onMissing: (path) => `[[${path}]]`,
});

t.call('greeting');
t.user.call('name'); // caller is available on nested objects too
```

#### Typed keys

With `typedKeys: true`, the caller's key is narrowed to the actual translation
keys, so the editor autocompletes them and rejects unknown keys at compile time:

```ts
const t = withDynamicCaller(base.server(), { typedKeys: true });

t.$('greeting'); // ok
t.$('nope'); // compile-time error
```

### `react/placeholders`

Replaces `{{ name }}` placeholders with values that may be React nodes. When a
placeholder resolves to a React element the result is a React fragment tree,
otherwise a plain string is returned. Wire it into a tag's `transform`:

```ts
import { processPlaceholders } from '@lang-tag/presets/react/placeholders';

createCallableTranslations(translations, config, {
    transform: ({ value, params }) => processPlaceholders(value, params),
});
```

Prefer a different placeholder syntax? Pass a custom `pattern` (the placeholder
name must be the first capture group; the global flag is added if missing):

```ts
// `${ name }` instead of `{{ name }}`
processPlaceholders(value, params, { pattern: /\$\{(.*?)\}/g });
```

`react` is an **optional** peer dependency (`>=18`) — install it only if you use
this module:

```bash
npm install react
```

## License

MIT
