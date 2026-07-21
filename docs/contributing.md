# Contributing

## Branch and PR

1. Branch from `main` (`main` is protected — no direct push).
2. Keep PRs small and focused.
3. Only change the packages you need: `packages/core`, `packages/cli`, `packages/presets`.
4. Do not commit `dist/`. CI builds it when publishing.

## Conventional Commits

**release-please** reads commit messages to decide version bumps. Write commits like this:

```text
feat(cli): add init --template flag
fix(core): handle empty placeholder params
feat(presets): support nested namespaces
fix!: drop Node 18 support
```

| Prefix                                         | Bump               |
| ---------------------------------------------- | ------------------ |
| `fix:`                                         | patch              |
| `feat:`                                        | minor              |
| `feat!:` / `fix!:` / footer `BREAKING CHANGE:` | major              |
| `chore:`, `docs:`, `test:`, `ci:`              | usually no release |

The scope (`cli` / `core` / `presets`) is for humans. In this monorepo, release-please mainly maps commits by **file path**. A commit that only touches `packages/cli/**` belongs to `@lang-tag/cli`.

### Two packages in one PR

Change files in both folders and use a releasable commit type (one commit or several):

```text
feat(cli): wire presets defaults into init
feat(presets): export default app preset
```

Or one commit that touches both trees:

```text
feat: align cli init with new presets API
```

(with edits under `packages/cli/**` and `packages/presets/**`). After merge, release-please can bump **both** packages in one Release PR. Core stays unchanged if `packages/core/**` was not touched.

## Before you open a PR

```bash
npm ci
npm run test --workspace lang-tag
npm run test --workspace @lang-tag/presets
npm run test-full --workspace @lang-tag/cli
```

CI (`.github/workflows/pr-tests.yml`) runs core + CLI tests on Node 18 and 20 for every PR to `main`.

## After merge to `main`

Do not publish by hand. release-please opens or updates a **Release PR**. A maintainer checks versions and changelogs, merges it, then the workflow publishes to npm.

Details: [release.md](./release.md).
