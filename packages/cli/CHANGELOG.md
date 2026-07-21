# Changelog

## [0.28.1]–[0.28.2](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.28.0...CLI-v0.28.2) (2026-07-21)

### Miscellaneous

- Release pipeline verification — no functional changes.

## [0.28.0](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.27.0...CLI-v0.28.0) (2026-07-20)

### Bug Fixes

- Multi-tag collection and tag-name resolution ([5baade9](https://github.com/TheTonsOfCode/lang-tag/commit/5baade9b0c20f86942f26d1349db3c0d84712b02))

## [0.27.0](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.26.0...CLI-v0.27.0) (2026-07-18)

### Bug Fixes

- Update tag templates for placeholder `required` / `allowExtras` levels ([15139e2](https://github.com/TheTonsOfCode/lang-tag/commit/15139e29530aea5f189b94e3837fb35503b4e56f))

## [0.26.0](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.25.0...CLI-v0.26.0) (2026-07-16)

### Breaking Changes

- Rename collect/import callback `event` to `context` ([38044de](https://github.com/TheTonsOfCode/lang-tag/commit/38044deef9adf50ca635e4629869cc46f84763be))

## [0.25.0](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.24.0...CLI-v0.25.0) (2026-07-13)

### Features

- Handle nested `as const` and `satisfies` on lang-tag tags ([de7aa17](https://github.com/TheTonsOfCode/lang-tag/commit/de7aa171f0fa5afb214af98d15fa011ac438e0cf))

## [0.24.0](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.23.0...CLI-v0.24.0) (2026-07-13)

### Features

- Handle `as const` on lang-tag tags ([a289560](https://github.com/TheTonsOfCode/lang-tag/commit/a28956024c93e96ffe7874e98085beb3f84e33a8))

## [0.23.0](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.22.0...CLI-v0.23.0) (2026-07-13)

### Features

- Handle `satisfies` on lang-tag tags ([ad4ada3](https://github.com/TheTonsOfCode/lang-tag/commit/ad4ada34528bd2ea2d6c19263f05de67fe0a72cf))

## [0.22.0](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.21.0...CLI-v0.22.0) (2026-07-08)

### Features

- Wire placeholder parameter handling into generated tag templates ([281d093](https://github.com/TheTonsOfCode/lang-tag/commit/281d0939a25245711daf2c99fa57fb3b355c125f))

### Bug Fixes

- Improve init renderer template ([82d42e2](https://github.com/TheTonsOfCode/lang-tag/commit/82d42e22b2fa770edd3106858c95d280c190674f))

## [0.21.0](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.20.0...CLI-v0.21.0) (2025-12-05)

### Changed

- Added a typed return type for TypeScript library tags to keep emitted definitions lightweight and consistent.

## [0.20.0](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.19.0...CLI-v0.20.0) (2025-11-18)

### Added

- Enforced private `_` prefix for library tags.
- Regenerated `getCurrentConfig` event signature and improved debug logging.
- Library config collection now works without namespace.

### Changed

- Hide the compiled exports command.

## [0.19.0](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.18.1...CLI-v0.19.0) (2025-11-14)

### Added

- Support for generic lang tags.
- Dictionary collector now appends namespace by default.

## [0.18.1](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.18.0...CLI-v0.18.1) (2025-10-28)

### Changed

- Added informational log for `init`.

## [0.18.0](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.17.0...CLI-v0.18.0) (2025-10-28)

### Added

- Interactive `init` command.

## [0.17.0](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.16.0...CLI-v0.17.0) (2025-10-28)

### Changed

- Renamed `config.ts` to `type.ts` and applied formatting cleanup.

## [0.16.0](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.15.0...CLI-v0.16.0) (2025-10-28)

### Changed

- Rewrote import of external library tags.

## [0.15.0](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.14.0...CLI-v0.15.0) (2025-10-25)

### Added

- Translation collectors.

## [0.14.0](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.13.1...CLI-v0.14.0) (2025-10-23)

### Changed

- Renamed `pathRules` to redirection and adjusted langtag blockade.
- Added trailing-comma detection in tags and refreshed `init-tag` templates.

## [0.13.1](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.13.0...CLI-v0.13.1) (2025-10-14)

### Changed

- Extended `onCollectFinish` event parameters.

## [0.12.1]–[0.12.4](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.12.0...CLI-v0.12.4) (2025-10-09 – 2025-10-11)

### Fixed

- Stabilized `onCollectFinish` handling and config cleanup when translations shift position.
- Path-based algorithm now preserves variables other than namespace/path and fixes old-path removal.
- React template fixes; configKeeper `keepPropertyAtEnd` plus skip-save when unchanged.
- Evaluated `ignoreStructured` before root directory removal; improved file URL logs.

## [0.11.1](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.11.0...CLI-v0.11.1) (2025-10-07)

### Changed

- Path-based wording `folder` → `directory`.

## [0.11.0](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.10.1...CLI-v0.11.0) (2025-10-07)

### Added

- Predefined algorithm for PathBased tag configuration generation.

## [0.10.0](https://github.com/TheTonsOfCode/lang-tag/compare/CLI-v0.9.4...CLI-v0.10.0) (2025-10-07)

### Changed

- Split core and CLI packages.
