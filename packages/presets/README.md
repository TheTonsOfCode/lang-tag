# @lang-tag/presets

Optional helpers for [`lang-tag`](https://www.npmjs.com/package/lang-tag).
Core stays a thin bridge to your i18n setup; this package covers common
add-ons you would otherwise copy into every app.

## Install

```bash
npm install @lang-tag/presets lang-tag
```

React peer (`>=18`) is optional — only needed for
`@lang-tag/presets/react/placeholders`.

## Imports

Each preset is a separate entry:

```ts
import { withDynamicCaller } from '@lang-tag/presets/dynamic-caller';
import { processPlaceholders } from '@lang-tag/presets/react/placeholders';
```

## `dynamic-caller`

Adds a runtime caller (default `$`) so you can invoke a translation by
a **computed key** instead of a static property.

```ts
import { withDynamicCaller } from '@lang-tag/presets/dynamic-caller';

const t = withDynamicCaller(base.server());

t.$('greeting', { name: 'Paul' });
t.$('unknown'); // → "#Missing:unknown#"
```

| Option       | Default       | Description                                    |
| ------------ | ------------- | ---------------------------------------------- |
| `callerName` | `'$'`         | Property name for the caller                   |
| `recursive`  | `false`       | Also inject the caller on nested objects       |
| `onMissing`  | `#Missing:…#` | Fallback when the key cannot be resolved       |
| `typedKeys`  | `true`        | Narrow `key` to known translation keys (types) |

```ts
const t = withDynamicCaller(base.server(), { typedKeys: false });
t.$('any-runtime-key'); // open string key
```

## `react/placeholders`

Interpolate `{{ name }}` with values that may be React nodes. Returns a
string when every value is textual, otherwise a fragment tree.

```ts
import { processPlaceholders } from '@lang-tag/presets/react/placeholders';

createCallableTranslations(translations, config, {
    transform: ({ value, params }) => processPlaceholders(value, params),
});
```

Custom runtime syntax (first capture group = name). Pair with a custom
`PlaceholderExtractor` in `lang-tag` if types should match:

```ts
processPlaceholders(value, params, { pattern: /\$\{(.*?)\}/g });
```

## Guidelines

1. Use static property access for known keys; use `$()` for runtime
   unions.
2. Model runtime keys as TypeScript unions, not free `string`, when
   `typedKeys` is on.
3. Prefer complete sentences with placeholders over concatenating
   translated fragments.

## See also

- [`lang-tag`](https://www.npmjs.com/package/lang-tag)
- [`@lang-tag/cli`](https://www.npmjs.com/package/@lang-tag/cli)
- [Docs](https://github.com/TheTonsOfCode/lang-tag/blob/main/docs/packages/presets.md)
- [Changelog](./CHANGELOG.md)

## License

MIT
