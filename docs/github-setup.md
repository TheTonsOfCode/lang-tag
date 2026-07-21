# GitHub setup

Do this once (or again when the token expires). Without it, release-please and npm publish will fail.

npm publishing uses **Trusted Publishing (OIDC)** — there is no npm token anywhere in this repo.

---

## 1. Secrets (Settings → Secrets and variables → Actions)

| Secret                 | Why                                                                             |
| ---------------------- | ------------------------------------------------------------------------------- |
| `RELEASE_PLEASE_TOKEN` | PAT for `googleapis/release-please-action` (Release PRs, tags, GitHub Releases) |

That is the only secret. **No `NPM_TOKEN`.** npm auth happens through a short-lived OIDC token that GitHub mints for the workflow run — nothing to store, nothing to rotate.

### `RELEASE_PLEASE_TOKEN`

Use a fine-grained PAT limited to this repo:

- **Contents:** Read and write
- **Pull requests:** Read and write
- **Metadata:** Read

Or a classic PAT with the `repo` scope.

Store it in a secret named exactly `RELEASE_PLEASE_TOKEN`.

If the token is missing or expired, you see:

```text
Error: release-please failed: Bad credentials
```

Create a new PAT, update the secret, re-run the workflow.

> **Simpler option:** if Release PRs and tags only need to work inside this workflow (publish is in the same job), set `token: ${{ secrets.GITHUB_TOKEN }}` in `release.yml`. Then you do not need `RELEASE_PLEASE_TOKEN`. Note: events from `GITHUB_TOKEN` do not start other workflows on `push` / `release`. That is fine here because publish runs in the same job.

---

## 2. npm Trusted Publishing (OIDC)

Configured **per package**, on npmjs.com — not per repository. All three packages need their own entry.

For each of `lang-tag`, `@lang-tag/cli`, `@lang-tag/presets`:

1. Open the package page → **Settings** → **Trusted Publisher**.
2. **Add Trusted Publisher** → **GitHub Actions**.
3. Fill in:
    - **Organization or user:** `TheTonsOfCode`
    - **Repository:** `lang-tag`
    - **Workflow filename:** `release.yml` (exact filename, not a path)
    - **Environment:** leave empty (the workflow does not use a GitHub Environment)

> **A package must already exist on npm** before you can add a Trusted Publisher for it. Publish the first version manually from your machine, then configure OIDC for every release after that.

What the workflow does on its side:

| Requirement                  | Where                                             |
| ---------------------------- | ------------------------------------------------- |
| `id-token: write` permission | `permissions:` block in `release.yml`             |
| npm >= 11.5.1                | `npm install -g npm@latest` step                  |
| No `NODE_AUTH_TOKEN`         | removed — its presence would shadow the OIDC flow |

Publishing this way also produces a **provenance attestation** automatically. It works because `build.sh` keeps the `repository` field when it writes `dist/package.json`; drop that field and provenance breaks.

---

## 3. Actions permissions

**Settings → Actions → General**

- Workflow permissions: **Read and write permissions** (or keep the `permissions:` block in the YAML — already `contents: write`, `pull-requests: write`, `id-token: write`).
- Enable **Allow GitHub Actions to create and approve pull requests**. Without this, the bot may not open the Release PR.

---

## 4. Protect `main`

Goal: no direct pushes — only PRs.

Use **Rulesets** (the modern system), not the legacy "Branch protection rules".

### Getting there

**Settings** → left sidebar **Rules** → **Rulesets** → **New ruleset** (green button, top right) → **New branch ruleset**.

> The dropdown also offers **New tag ruleset** and **New push ruleset** — you want **branch**. Tag rulesets would fight with the tags release-please creates.

### Filling the form, top to bottom

**Ruleset Name** — `main protection` (free text, only a label).

**Enforcement status** — set to **Active**. Leaving it on _Evaluate_ only logs violations without blocking anything.

**Bypass list** — click **Add bypass** → **Repository admin** → set its mode to **Allow for pull requests only**, or leave the list empty.

> Adding yourself as a full bypass defeats the ruleset. Adding nobody means a broken `main` can only be fixed through a PR — which is the point, but know it before you lock yourself out.

**Target branches** — click **Add target** → **Include default branch**. That resolves to `main` and keeps working if the default branch is ever renamed.

### Rules — what to tick

Tick these:

- **Restrict deletions** — nobody deletes `main`.
- **Block force pushes** — history stays append-only.
- **Require a pull request before merging** — the core rule. Expand it and set:
    - **Required approvals:** `0` if you are the only maintainer. GitHub does not let you approve your own PR, so `1` on a solo repo blocks every merge including the Release PR.
    - **Dismiss stale pull request approvals when new commits are pushed** — ✅ (no effect at 0 approvals, correct once someone joins).
    - **Require review from Code Owners** — ❌ (no `CODEOWNERS` file here).
    - **Require approval of the most recent reviewable push** — ❌ on a solo repo; it is a second self-approval trap.
    - **Require conversation resolution before merging** — ✅.
    - **Allowed merge methods** — leave all three, or keep **Squash** only if you want a flat history.
- **Require status checks to pass** — expand it, click **Add checks**, and search for both:
    - `test (22.x)`
    - `test (24.x)`

    Both matrix legs, not just `test` — a matrix job produces one check per leg, and a bare `test` never appears as a check name so the rule would never be satisfiable. Also tick **Require branches to be up to date before merging**.

Leave these **unticked**:

- **Restrict creations** — release-please pushes the `release-please--branches--main` branch; this rule blocks it.
- **Restrict updates** — same reason, it blocks the bot updating that branch.
- **Require signed commits** — release-please commits are not signed; the Release PR would become unmergeable.
- **Require linear history** — safe only if you always squash- or rebase-merge. A single merge commit violates it.
- **Require deployments to succeed**, **Require code scanning results** — not configured in this repo.

Click **Create** at the bottom.

> Status checks only show up in the **Add checks** picker after they have run at least once. If the list is empty, open any PR, let `pr-tests.yml` finish, then come back.

The Release PR goes through this same path — it does not bypass protection.

---

## 5. Checklist

- [ ] `RELEASE_PLEASE_TOKEN` is valid (or workflow uses `GITHUB_TOKEN`)
- [ ] Trusted Publisher configured on npm for **all three** packages
- [ ] Actions can create pull requests
- [ ] Ruleset on `main` is **Active**, with `test (22.x)` and `test (24.x)` as required checks
- [ ] Packages are listed in `.release-please-config.json` (`core`, `cli`, `presets`)
- [ ] `.release-please-manifest.json` matches **last released** versions (tags / npm)
- [ ] After merging a `feat:` / `fix:` feature PR, a Release PR appears
- [ ] After merging the Release PR: tags, GitHub Releases, packages on npm with a provenance badge

If versions drifted because of local publishes, fix that first: [fix-version-drift.md](TEST/fix-version-drift.md).

---

## 6. Workflows

| Workflow | File                             | When                | Node       |
| -------- | -------------------------------- | ------------------- | ---------- |
| PR Tests | `.github/workflows/pr-tests.yml` | PR / push to `main` | 22.x, 24.x |
| Release  | `.github/workflows/release.yml`  | push to `main`      | 24         |

Release job steps:

1. Run `release-please-action@v5` with config + manifest
2. If `*--release_created` → Node 24, `npm install -g npm@latest`, `npm ci`, `npm run publish` for each released package

Published packages declare `engines.node: ">=22"`.

Process details: [release.md](release.md).

---

## 7. Troubleshooting

| Error                                                              | Cause                                                                                                   |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `Unable to authenticate, need: Bearer realm="npm"`                 | Trusted Publisher missing for that package, or workflow filename does not match `release.yml`           |
| `npm error code ENEEDAUTH`                                         | npm older than 11.5.1 — the `npm install -g npm@latest` step did not run                                |
| `Error: Unable to get ACTIONS_ID_TOKEN_REQUEST_URL`                | `id-token: write` missing from `permissions:`                                                           |
| `Error: release-please failed: Bad credentials`                    | `RELEASE_PLEASE_TOKEN` expired or absent                                                                |
| `404 Not Found - PUT https://registry.npmjs.org/<pkg>`             | Package does not exist yet — publish the first version manually                                         |
| Release PR stuck on "Expected — Waiting for status to be reported" | Required check name in the ruleset does not match any real check; must be `test (22.x)` / `test (24.x)` |
| release-please cannot push its branch                              | **Restrict creations** or **Restrict updates** is ticked in the ruleset                                 |
| Release PR cannot be merged, needs an approval                     | **Required approvals** is `1` on a solo repo — you cannot approve your own PR                           |
