# Changelog

## [0.14.1]–[0.14.2](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.14.0...Core-v0.14.2) (2026-07-21)

### Miscellaneous

- Release pipeline verification — no functional changes.

## [0.14.0](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.13.0...Core-v0.14.0) (2026-07-18)

### Bug Fixes

- Split placeholder param strictness into `required` and `allowExtras` ([15139e2](https://github.com/TheTonsOfCode/lang-tag/commit/15139e29530aea5f189b94e3837fb35503b4e56f))

## [0.13.0](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.12.0...Core-v0.13.0) (2026-07-16)

### Features

- Lookup support for path elements that contain dots ([957c2fc](https://github.com/TheTonsOfCode/lang-tag/commit/957c2fce7e5d3398dd4f554e226b017122203158))

## [0.12.0](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.11.1...Core-v0.12.0) (2026-07-08)

### Features

- Typed placeholder parameter inference for `{{ name }}` strings ([281d093](https://github.com/TheTonsOfCode/lang-tag/commit/281d0939a25245711daf2c99fa57fb3b355c125f))

## [0.11.1](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.11.0...Core-v0.11.1) (2025-12-08)

### Bug Fixes

- core types compilation ([#32](https://github.com/TheTonsOfCode/lang-tag/issues/32)) ([11c851e](https://github.com/TheTonsOfCode/lang-tag/commit/11c851eabc8381a64012c259599f5e2c03f877fa))
- package lock ([#34](https://github.com/TheTonsOfCode/lang-tag/issues/34)) ([f2c49de](https://github.com/TheTonsOfCode/lang-tag/commit/f2c49de3b093e1a44376c35b498d1cdc3b15ce8e))

## [0.11.0](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.10.1...Core-v0.11.0) (2025-11-08)

### Changed

- `createCallableTranslations` now accepts translations with optional keys.

## [0.10.1](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.10.0...Core-v0.10.1) (2025-10-15)

### Added

- Optional `namespace` support.

## [0.10.0](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.9.4...Core-v0.10.0) (2025-10-07)

### Changed

- Split core and CLI packages.

## [0.9.4](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.9.3...Core-v0.9.4) (2025-10-07)

### Fixed

- README rendering for npm registry.

## [0.9.3](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.9.2...Core-v0.9.3) (2025-10-07)

### Added

- `condense` flag for conflict logs and `clean` flag for `collect`.

## [0.9.2](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.9.1...Core-v0.9.2) (2025-10-06)

### Added

- Simple module detection during `config init`.

## [0.8.0](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.7.4...Core-v0.8.0) (2025-10-04)

### Changed

- Maintenance release (no functional changes noted).

## [0.7.3](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.7.2...Core-v0.7.3) (2025-06-04)

### Fixed

- Nested structure handling for `PartialFlexibleTranslations`.

## [0.7.2](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.7.1...Core-v0.7.2) (2025-06-04)

### Added

- `unprefixedPath` in `TranslationTransformContext`.

## [0.7.1](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.7.0...Core-v0.7.1) (2025-05-25)

### Changed

- Modified `onImport` arguments.

## [0.7.0](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.6.0...Core-v0.7.0) (2025-05-24)

### Changed

- Separated `lang-tag import` from `lang-tag collect --libraries`.

## [0.5.1](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.5.0...Core-v0.5.1) (2025-05-22)

### Added

- JSDoc and `lookupTranslation`.

## [0.5.0](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.4.2...Core-v0.5.0) (2025-05-22)

### Changed

- Renamed `mapTranslationObjectToFunctions` → `createCallableTranslations` and updated related types/docs/tests.

## [0.4.2](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.4.1...Core-v0.4.2) (2025-05-22)

### Changed

- Removed `ReversedFlexibleTranslations` in favor of `TranslationObjectToFunctions`.

## [0.4.0](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.3.0...Core-v0.4.0) (2025-04-07)

### Changed

- Maintenance release.

## [0.1.9](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.1.8...Core-v0.1.9) (2025-04-05)

### Fixed

- CLI commands reliability improvements.

## [0.1.8](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.1.7...Core-v0.1.8) (2025-04-03)

### Added

- Read-config test; fixed `module` error type.

## [0.1.7](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.1.6...Core-v0.1.7) (2025-04-03)

### Changed

- Publish from `dist`.

## [0.1.6](https://github.com/TheTonsOfCode/lang-tag/compare/Core-v0.1.5...Core-v0.1.6) (2025-04-03)

### Changed

- Maintenance release.
