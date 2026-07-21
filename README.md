# create-said-agent

**One command to create a SAID-verified AI agent on Solana.**

Scaffolds a complete AI agent project with built-in Solana wallet, SAID Protocol registration, and trust infrastructure integration.

![npm version](https://img.shields.io/npm/v/create-said-agent)
![license](https://img.shields.io/npm/l/create-said-agent)

## Quick Start

```bash
npx create-said-agent
```

The interactive wizard handles everything:
1. **Choose template** — Nanobot (Python), Eliza OS, or OpenClaw
2. **Agent details** — Name, description, capabilities
3. **Wallet generation** — Created locally, keys never leave your machine
4. **SAID registration** — Instant, free off-chain identity
5. **Project scaffold** — Full agent codebase ready to run

## CLI Commands

### Create & Register

```bash
# Interactive wizard (recommended)
npx create-said-agent

# Non-interactive scaffold
npx create-said-agent my-agent --template nanobot --yes

# Register existing wallet on-chain
npx create-said-agent register --keypair wallet.json --name "MyAgent" --description "Does things"

# Verify on-chain (costs 0.01 SOL)
npx create-said-agent verify --keypair wallet.json

# Check registration status
npx create-said-agent status --wallet WALLET_ADDRESS
```

### Trust & Reputation

```bash
# Check any agent's SAID Score (with transparent breakdown)
npx create-said-agent score --wallet WALLET_ADDRESS

# Submit feedback for an agent (1-5 stars)
npx create-said-agent feedback --wallet WALLET_ADDRESS --rating 5 --comment "Great work"

# Browse the agent directory
npx create-said-agent discover --limit 20

# View top trusted agents
npx create-said-agent leaderboard --limit 10

# Network statistics
npx create-said-agent stats
```

## Templates

### Nanobot (Python) — Recommended
Lightweight agent with:
- Python runtime, minimal dependencies
- Built-in Solana tools (balance, transfers, identity verification)
- Telegram integration support
- SAID identity baked in

### Eliza OS
Full multi-agent framework:
- Character-driven agents with bio, lore, style
- Discord, Telegram, Twitter clients
- Plugin system with included SAID identity plugin
- VERIFY_AGENT and MY_IDENTITY actions

### OpenClaw
Full-featured agent platform:
- Clawdbot/Valent framework integration
- Multi-channel support
- Advanced memory + skill system
- Needs VPS or Mac Mini

## What Gets Created

```
my-agent/
├── wallet.json          # Solana keypair (KEEP PRIVATE)
├── said.json            # SAID registration metadata
├── .env / .env.example  # Environment config
├── package.json         # Dependencies
├── README.md            # Template-specific docs
└── src/ or characters/  # Agent source code
```

## Security

**Wallet keys are generated locally and never sent anywhere.** The registration process only sends:
- Public key (wallet address)
- Agent metadata (name, description)
- Cryptographic signature proving ownership

## Why SAID Protocol?

SAID is the **enforcement layer for AI agents** on Solana:

- **6,700+ registered agents** across the network
- **On-chain staking/slashing** — real economic consequences for bad actors
- **Cross-chain messaging** — 10 chains supported via x402
- **ERC-8004 compatible** — works with the emerging agent identity standard
- **16+ ecosystem integrations** — ClawPump, Daemon, Xona Orbit, and more

Unlike reputation-only projects (AgentKarma RIP), SAID backs scores with real stake. Bad agents get slashed. Good agents earn trust.

## After Creation

```bash
cd my-agent

# For nanobot template:
pip install git+https://github.com/kaiclawd/said-nanobot.git
cp config.json ~/.nanobot/config.json
nanobot agent -m "Hello!"

# Check your score:
npx create-said-agent score --wallet YOUR_WALLET

# Go on-chain (optional, 0.01 SOL):
npx create-said-agent verify --keypair wallet.json
```

## SAID Ecosystem

| Repo | Description |
|------|-------------|
| [said](https://github.com/SAID-Protocol/said) | On-chain Solana program |
| [said-api](https://github.com/SAID-Protocol/said-api) | REST API for agent registry |
| [said-sdk](https://github.com/SAID-Protocol/said-sdk) | TypeScript SDK + CLI (v0.7.0) |
| [said-website](https://github.com/SAID-Protocol/said-website) | Agent directory & profiles |
| [said-mcp-server](https://github.com/kaiclawd/said-mcp-server) | MCP trust layer (11 tools) |
| [said-score-api](https://github.com/kaiclawd/said-score-api) | Transparent scoring API |
| [said-escrow](https://github.com/kaiclawd/said-escrow) | Trust-gated escrow (Anchor) |
| [plugin-said](https://github.com/SAID-Protocol/plugin-said) | ElizaOS plugin (v3.0.0) |
| **create-said-agent** | **This scaffolding tool** |

## Requirements

- Node.js 18+ (20+ recommended)
- Python 3.8+ (for nanobot template)
- ~0.01 SOL for on-chain verification (optional)

## Links

- **Website:** [saidprotocol.com](https://www.saidprotocol.com)
- **Docs:** [saidprotocol.com/docs](https://www.saidprotocol.com/docs.html)
- **GitHub:** [SAID-Protocol/create-said-agent](https://github.com/SAID-Protocol/create-said-agent)
- **npm:** [create-said-agent](https://www.npmjs.com/package/create-said-agent)

## License

MIT
