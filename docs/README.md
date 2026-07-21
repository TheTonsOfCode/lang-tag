# Docs

Internal docs for the **lang-tag** monorepo.

| File                                 | What it covers                                   |
| ------------------------------------ | ------------------------------------------------ |
| [contributing.md](./contributing.md) | How to contribute: branches, commits, PRs, tests |
| [release.md](./release.md)           | How releases work (release-please → npm)         |

Published packages:

| Folder             | npm name            |
| ------------------ | ------------------- |
| `packages/core`    | `lang-tag`          |
| `packages/cli`     | `@lang-tag/cli`     |
| `packages/presets` | `@lang-tag/presets` |

Versions are **independent**. A CLI bump does not force a new `lang-tag` version.
