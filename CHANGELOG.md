# Changelog

All notable changes to `create-said-agent` will be documented in this file.

## [0.6.2] — 2026-07-24

### Fixed
- **Critical:** `getScore()` now calls `/api/verify/:wallet` + `/api/enforcement/:wallet` instead of non-existent `/api/trust/:wallet` which returned minimal data
- **Critical:** `getLeaderboard()` now calls `/api/leaderboard` instead of dead `/v1/leaderboard` (404)
- **Critical:** `getRiskAssessment()` now uses `/api/enforcement/:wallet` for real risk data including `riskLevel` and `riskReasons`
- **Critical:** `getCreditScore()` now uses `/api/enforcement/:wallet` instead of dead `/api/stake/:wallet` (404)
- **Critical:** `getStakingInfo()` now uses `/api/enforcement/:wallet` with real staking data (`stakedAt`, `cooldownUntil`, `slashCount`)
- **Critical:** `assessAgent()` now uses `/api/enforcement/:wallet` for all policy evaluation data
- **Breaking:** `getStats()` updated to use actual API response fields (`averageReputation` instead of non-existent `onChainAgents`/`stakedAgents`)

### Added
- GitHub Actions CI/CD pipeline (Node 20+22 matrix, TypeScript strict build check)
- npm auto-publish workflow with provenance (on tagged releases)
- Integration test suite (8 tests against live SAID API)
- CHANGELOG.md

### Changed
- `LeaderboardEntry` interface updated to match actual API response (`reputationScore`, `feedbackCount`, `twitter`)
- `Stats` interface simplified to match actual API response
- Risk assessment now uses on-chain `riskLevel` and `riskReasons` from enforcement endpoint
- Credit score derivation now uses real enforcement data instead of non-existent endpoints

## [0.6.0] — 2026-07-24

### Added
- Trust enforcement commands: `risk`, `credit`, `assess`, `stake`
- Risk assessment with 6-tier model and escrow recommendations
- SACRS credit score (FICO-compatible 300-850)
- Policy-based assessment (strict/balanced/permissive presets)
- Staking and enforcement info display

## [0.5.0] — 2026-07-21

### Added
- `score` command — fetch trust scores
- `feedback` command — submit agent reviews
- `discover` command — browse agent directory
- `leaderboard` command — top trusted agents
- `stats` command — network statistics

## [0.4.0] — 2026-07-21

### Added
- On-chain registration, verification, and status commands
- Solana web3.js integration for direct program interaction
