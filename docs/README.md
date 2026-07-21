# Docs

Internal docs for the **lang-tag** monorepo.

## Packages

User-facing guides for each published package:

| Guide                                        | npm name            | Summary                            |
| -------------------------------------------- | ------------------- | ---------------------------------- |
| [packages/core.md](./packages/core.md)       | `lang-tag`          | Runtime + typed placeholders       |
| [packages/cli.md](./packages/cli.md)         | `@lang-tag/cli`     | Collect, regenerate, import        |
| [packages/presets.md](./packages/presets.md) | `@lang-tag/presets` | Dynamic caller, React placeholders |

Index: [packages/README.md](./packages/README.md)

Short install/quick-start READMEs also live next to each package under
`packages/*/README.md`.

## Monorepo

| File                                 | What it covers                |
| ------------------------------------ | ----------------------------- |
| [contributing.md](./contributing.md) | Branches, commits, PRs, tests |
| [release.md](./release.md)           | release-please → npm          |
| [github-setup.md](./github-setup.md) | GitHub / CI setup notes       |

Published packages and versions are **independent**. A CLI bump does
not force a new `lang-tag` version.
