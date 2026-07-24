# Changelog

All notable changes to `create-said-agent` are documented here.

## [0.6.1] — 2026-07-24

### Fixed
- Corrected API endpoints: `/api/stake` → `/api/enforcement` (3 occurrences)
- Corrected leaderboard endpoint: `/v1/leaderboard` → `/api/leaderboard`
- Score normalization: handles `compositeScore` (0-1 float) from API, converts to 0-100
- Removed 3 dead `/v1/breakdown` calls (endpoint doesn't exist)
- Verified field normalization: `isVerified ?? verified ?? false`

### Added
- Integration test suite (15 tests, live API validation)
- GitHub Actions CI/CD (test on push/PR, auto-publish on tagged releases)

## [0.6.0] — 2026-07-22

### Added
- Trust enforcement commands: `risk`, `credit`, `assess`, `stake`
- Risk assessment with escrow recommendations and spend caps
- SACRS credit score (300-850, FICO-compatible)
- Policy-based assessment (strict/balanced/permissive)

## [0.5.0] — 2026-07-21

### Added
- `score`, `feedback`, `discover`, `leaderboard`, `stats` commands
- Full SAID API client module (`src/api.ts`)
- Dependency updates: said-sdk, Anthropic SDK, ElizaOS

## [0.4.0] — 2026-07-21

### Added
- On-chain registration, verification, and status commands
- Solana keypair generation and wallet persistence
