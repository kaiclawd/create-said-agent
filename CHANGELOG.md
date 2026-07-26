# Changelog

All notable changes to `create-said-agent` will be documented in this file.

## [0.8.0] — 2026-07-26

### Added — Agent Commerce Commands (x402 + ERC-8183)

Three new commands aligned with SAID's 90-day build priority. These expose
the SDK's v0.20.0 features directly from the CLI:

- **`passport`** — Generate a SAID Reputation Passport with verdict, risk level,
  escrow percentage, and integration formats (MCP _meta, x402 headers, A2A card,
  AP2 mandate). One command shows everything a marketplace needs to trust an agent.

- **`enforce`** — Run an x402 Enforcement Oracle check. Returns ALLOW /
  REQUIRE_ESCROW / BLOCK verdict with economic context (stake, slash history,
  score). Includes max recommended transaction value in USDC. Two-sided mode
  with `--payee` for marketplace flows.

- **`trust-oracle`** — Run an ERC-8183 Trust Oracle evaluation. Scores agents
  against 6 commerce criteria (deliverable, claim, trust minimum, staked,
  slash history, evidence). Returns PASS (release 100%) / PARTIAL (release 50%)
  / FAIL (refund + slash recommendation).

These commands make the CLI a complete developer onboarding tool: scaffold,
register, verify, then participate in agent commerce — all from one tool.

## [0.7.0] — 2026-07-25

### Added — Trust Crisis Command

New `trust-crisis` command exposes the arXiv:2607.08084 research findings directly
to developers. Compares economic enforcement (staking/slashing) against
ERC-8004 reputation signals with full Sybil manipulation context.

- `create-said-agent trust-crisis --wallet <address>` — displays economic
  enforcement tier, stake amount, slashing record, reputation signals with
  Sybil vulnerability flags, ERC-8004 manipulation costs and Sybil rates,
  and a final trust verdict with recommendation
- Based on peer-reviewed research proving 73.5% of ERC-8004 reviewers show
  coordinated Sybil behavior
- 12th CLI command (joining register, verify, status, score, feedback,
  discover, leaderboard, stats, risk, credit, assess, stake)

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
