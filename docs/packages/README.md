# Packages

Guides for the published packages in this monorepo.

| Guide                      | npm package         | Role                                         |
| -------------------------- | ------------------- | -------------------------------------------- |
| [core.md](./core.md)       | `lang-tag`          | Runtime types + `createCallableTranslations` |
| [cli.md](./cli.md)         | `@lang-tag/cli`     | Collect, regenerate, import, watch           |
| [presets.md](./presets.md) | `@lang-tag/presets` | Optional helpers (dynamic caller, React)     |

Versions are **independent**. A CLI release does not force a new core
version.

Package READMEs on npm / in each published tarball are self-contained
(no monorepo-relative links). Deeper guides live in this folder.
