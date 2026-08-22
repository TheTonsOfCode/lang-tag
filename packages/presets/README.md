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
import { PLACEHOLDER_PATTERNS } from '@lang-tag/presets/placeholder-patterns';
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

To make `t` itself the caller (`t('greeting')` instead of `t.$('greeting')`):

```ts
import { asDynamicCaller } from '@lang-tag/presets/dynamic-caller';

const t = asDynamicCaller(base.server(), { recursive: true });

t.greeting({ name: 'Paul' });
t('greeting', { name: 'Paul' });
t.user('name');
```

Same `recursive`, `typedKeys`, and `onMissing` options — no `callerName`.

## `react/placeholders`

Interpolate `{{ name }}` with values that may be React nodes. Returns a
string when every value is textual, otherwise a fragment tree.

```ts
import { processPlaceholders } from '@lang-tag/presets/react/placeholders';

createCallableTranslations(translations, config, {
    transform: ({ value, params }) => processPlaceholders(value, params),
});
```

Default `{{ name }}` needs no options. For another built-in, pass
`syntax` that matches the tag's `extractor`. For a custom extractor,
pass `pattern` (first capture group = name):

```ts
transform: ({ value, params }) =>
    processPlaceholders(value, params, { syntax: 'dollarBrace' }),
// types: DefinePlaceholderParams<{ extractor: DollarBraceExtractor }>

transform: ({ value, params }) =>
    processPlaceholders(value, params, { pattern: /!(.*?)!/g }),
```

| `syntax`         | Core extractor            | Looks like   |
| ---------------- | ------------------------- | ------------ |
| `doubleBrace`    | `DoubleBraceExtractor`    | `{{ name }}` |
| `dollarBrace`    | `DollarBraceExtractor`    | `${ name }`  |
| `singleBrace`    | `SingleBraceExtractor`    | `{ name }`   |
| `percentBrace`   | `PercentBraceExtractor`   | `%{ name }`  |
| `percentPercent` | `PercentPercentExtractor` | `%name%`     |
| `colon`          | `ColonExtractor`          | `:name`      |
| `dollarIdent`    | `DollarIdentExtractor`    | `$name`      |
| `angleBracket`   | `AngleBracketExtractor`   | `<name>`     |
| `doubleSquare`   | `DoubleSquareExtractor`   | `[[ name ]]` |
| `singleSquare`   | `SingleSquareExtractor`   | `[ name ]`   |

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
