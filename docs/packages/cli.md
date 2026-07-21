# @lang-tag/cli

## Overview

The CLI finds language tags in your source tree, writes
`namespace` / `path` back into them, and collects English (or your
base language) messages into locale JSON. It never runs inside the
browser bundle.

`lang-tag` (runtime) is the typed bridge to your translation library —
or a stand-in until you pick one. TypeScript already forces complete
enum maps, placeholders, and call-site shape when you configure the
types that way. The CLI is the CI half of the same story: regenerate +
collect instead of hand-editing locale trees, then hand English to any
translator for the other languages.

Binaries: `lang-tag`, `langtag`.

## Why it exists

1. Automate locale file generation from colocated tags — large speed-up
   over manual JSON maintenance.
2. Catch missing / conflicting / invalid translations in CI with the
   same stack as the app (TypeScript + this CLI) — not a separate ESLint
   i18n ecosystem.
3. Keep namespace/path conventions consistent via
   `onConfigGeneration`.
4. Emit **namespaces** or a single **dictionary** per language
   (collector choice), then let another tool translate from English.
5. Import tags from lang-tag-enabled libraries.

## Workflow

Recommended loop when source text changes (same sequence in CI/CD):

1. **`lang-tag regenerate-tags`** — apply path/namespace rules; rewrite
   tag configs in source.
2. **`lang-tag collect`** — emit base-language JSON under
   `localesDirectory` (per-namespace files or one dictionary).
3. **Your translator** — fill other locales from that English output
   (LLM pipeline, TMS, … — whatever you already use).

Wire it into `package.json` / CI so bad tags and collect conflicts
never merge silently. TypeScript covers call sites; the CLI covers the
collected tree. Once that pipeline is in place, developers only write
English in the component — they never hand-edit locale JSON.

```bash
lang-tag init          # once per project
lang-tag init-tag      # once: scaffold the tag function
lang-tag regenerate-tags
lang-tag collect
lang-tag watch         # optional during local work
```

## Commands

### `init`

Creates `lang-tag.config.js`. Interactive by default; `-y` uses
defaults. Config is CLI-only — do not import it from application code.

### `init-tag`

Scaffolds a tag function file. Useful flags: `--name`, `--library`,
`--react`, `--typescript`, `--output`.

### `regenerate-tags` (`rt`)

For each tag, calls `onConfigGeneration(context)`. Updates apply
**only** when you call `context.save(newConfig)`. Mutating
`context.config` throws (it is frozen).

Skip library-imported tags with `context.isImportedLibrary`.

### `collect` (`c`)

Scans `includes` for `tagName` calls and writes locale files.
`--clean` removes the output directory first.

Default layout (`NamespaceCollector`):
`locales/<baseLanguageCode>/<namespace>.json`.

`DictionaryCollector` writes one file per language instead.

### `watch` (`w`)

Re-runs collection when matching sources change.

### `import` (`i`)

Materialises tags from lang-tag libraries under `node_modules` into
`import.dir`, using `import.tagImportPath` and optional `onImport`.

### `hide-compiled-exports` (`hce`)

For libraries: strip `export` from compiled `.d.ts` tag symbols so
consumers do not autocomplete internal tags.

## Configuration

Shape: `LangTagCLIConfig` from `@lang-tag/cli/type`. Highlights:

| Field                                              | Notes                                           |
| -------------------------------------------------- | ----------------------------------------------- |
| `tagName`                                          | `string` or `string[]` of alternatives to match |
| `includes` / `excludes`                            | Glob scan set                                   |
| `localesDirectory`                                 | Root for collected JSON                         |
| `baseLanguageCode`                                 | Language of messages written in source          |
| `isLibrary`                                        | Emit library exports instead of app locales     |
| `onConfigGeneration`                               | Derive/write `namespace` + `path`               |
| `collect.collector`                                | Namespace vs dictionary layout                  |
| `collect.onConflictResolution` / `onCollectFinish` | Conflict policy                                 |
| `import.*`                                         | Library import output and naming                |

Algorithms used from config (optional):

```js
import {
    DictionaryCollector,
    NamespaceCollector,
    configKeeper,
    flexibleImportAlgorithm,
    pathBasedConfigGenerator,
} from '@lang-tag/cli/algorithms';
```

`pathBasedConfigGenerator` maps file paths → namespace/path.
`configKeeper` restores fields marked with `keep: 'namespace' | 'path' | 'both'`
after generation so manual overrides survive.

**Callback argument is named `context`** (not `event`).

## Object literal required

Collect only sees an **inline object literal** as the first tag
argument.

```ts
// Correct — collected
export const formTranslations = lang(
    {
        submit: 'Submit',
        cancel: 'Cancel',
    } as const satisfies Record<'submit' | 'cancel', string>,
    { namespace: 'common', path: 'form' }
);

// Incorrect — skipped
const copy = { submit: 'Submit', cancel: 'Cancel' };
export const formTranslations = lang(copy, { namespace: 'common' });
```

Supported on the literal: `as const`, `satisfies`, and nested
combinations. Prefer `as const satisfies …` for closed keys + literal
messages (placeholder inference).

## Multi-tag files

Several tags may live in one file. Give them distinct `path` (and
usually `namespace`) values so collect does not conflict. Generation
algorithms and `configKeeper` help keep those configs stable.

## Library mode

With `isLibrary: true`:

- Collect produces a `lang-tags.json` style export instead of
  app locale trees.
- `enforceLibraryTagPrefix` (default `true`) prefixes tag names with
  `_` so compiled public types stay clean.
- Consuming apps run `lang-tag import` to pull those tags in.

## Guidelines

1. Run `regenerate-tags` before `collect` in CI.
2. Never import `lang-tag.config.js` from runtime code.
3. Always `context.save(...)` inside `onConfigGeneration`.
4. Keep tag first arguments as object literals.
5. Use `keep` / `configKeeper` for intentional manual overrides.
6. Resolve conflicts explicitly (`onConflictResolution` /
   `onCollectFinish`) instead of ignoring them in production pipelines.

## See also

- [Core guide](./core.md)
- npm: [`@lang-tag/cli`](https://www.npmjs.com/package/@lang-tag/cli),
  [`lang-tag`](https://www.npmjs.com/package/lang-tag)
