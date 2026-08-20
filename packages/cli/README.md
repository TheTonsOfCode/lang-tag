# @lang-tag/cli

CLI for collecting, regenerating, and importing **lang-tag**
translations. Dev dependency only — it never ships in the app bundle.

Together with `lang-tag` (typed bridge to your i18n library — or a
stand-in until you pick one), the CLI is the other half of a single
toolchain: TypeScript guards keys/placeholders in source; the CLI
guards collect/regenerate in CI. No ESLint i18n plugin stack required.

Day to day, developers only write English next to the component. They
do not dig through `common.json` / namespace files — `collect` (locally
or in CI/CD) builds that tree; another tool translates English to the
other locales (namespaces or a dictionary).

## Install

```bash
npm install -D @lang-tag/cli
npm install lang-tag
```

Binaries: `lang-tag` (preferred) and `langtag`.

## Quick start

```bash
# Interactive config + defaults
lang-tag init

# Scaffold a tag function (React / library options available)
lang-tag init-tag

# Write namespace/path back into tags (uses onConfigGeneration)
lang-tag regenerate-tags

# Collect source text into locale JSON
lang-tag collect

# Re-collect on file changes
lang-tag watch
```

Typical CI / pre-translate sequence:

1. `lang-tag regenerate-tags`
2. `lang-tag collect`
3. Your translator / LLM pipeline for other locales

## Commands

| Command                 | Alias | What it does                                             |
| ----------------------- | ----- | -------------------------------------------------------- |
| `init`                  |       | Create `lang-tag.config.js` (`-y` for defaults)          |
| `init-tag`              |       | Generate a tag function file                             |
| `collect`               | `c`   | Scan tags → locale files (`--clean` wipes output first)  |
| `regenerate-tags`       | `rt`  | Apply `onConfigGeneration` and rewrite tag configs       |
| `watch`                 | `w`   | Watch sources and re-collect                             |
| `import`                | `i`   | Import tags from lang-tag libraries in `node_modules`    |
| `hide-compiled-exports` | `hce` | Strip `export` from compiled library tag `.d.ts` symbols |

## Config (high level)

`lang-tag.config.js` is **CLI-only** — the app never imports it at
runtime. Important knobs:

- `tagName` — one name or a list of alternatives to scan
- `includes` / `excludes` — which files to scan
- `localesDirectory` / `baseLanguageCode` — where English (or source)
  JSON lands
- `onConfigGeneration` — derive `namespace` / `path` from file location
  (must call `context.save(...)`)
- `collect.collector` — `NamespaceCollector` (default) or
  `DictionaryCollector`
- `import` — how library tags are materialised into your repo

Path-based generation helpers live under `@lang-tag/cli/algorithms`
(`pathBasedConfigGenerator`, `configKeeper`, …).

## Object literal required

The first argument to your tag **must be an object literal in place**.
Otherwise `collect` cannot see the messages.

```ts
// Correct
export const statusTranslations = lang(
    {
        pending: 'Pending',
        done: 'Done',
    } as const,
    { namespace: 'common', path: 'status' }
);

// Incorrect — not collected
const messages = { pending: 'Pending', done: 'Done' };
export const statusTranslations = lang(messages, { ... });
```

`as const` and `satisfies` (including nested) on that literal are
supported.

## See also

- [`lang-tag`](https://www.npmjs.com/package/lang-tag) — runtime bridge
- [Docs](https://github.com/TheTonsOfCode/lang-tag/blob/main/docs/packages/cli.md)
- [Changelog](./CHANGELOG.md)

## License

MIT
