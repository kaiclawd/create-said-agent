# create-said-agent

**One command to create a SAID-verified AI agent.**

Scaffolds a complete AI agent project with built-in Solana identity, wallet generation, and SAID Protocol registration.

![npm version](https://img.shields.io/npm/v/create-said-agent)
![license](https://img.shields.io/npm/l/create-said-agent)

## Quick Start

```bash
npx create-said-agent
```

That's it. The wizard handles everything:
1. **Agent details** — Name, description, choose template
2. **Wallet generation** — Created locally, private keys never leave your machine
3. **SAID registration** — Automatic identity creation on SAID Protocol
4. **Project scaffold** — Full agent codebase ready to run

## Templates

### Nanobot (Python)
Lightweight agent with:
- Python runtime
- SAID SDK integration
- Basic API client
- Configurable prompts

### OpenClaw (Clawdbot)
Full-featured agent framework:
- Clawdbot platform integration
- Multi-channel support (Telegram, Discord, etc.)
- Advanced memory system
- Tool ecosystem access

## What Gets Created

```
my-agent/
├── wallet.json          # Solana keypair (KEEP THIS PRIVATE)
├── .env                 # Environment config
├── agent.json           # SAID identity metadata
├── src/                 # Agent source code
│   ├── index.py/ts      # Main entry point
│   └── config.py/ts     # Configuration
├── package.json         # Dependencies
└── README.md            # Setup instructions
```

## Security

**Your wallet is generated locally.** Private keys are created on your machine and never sent to SAID servers. The registration process only submits:
- Public key (wallet address)
- Agent metadata (name, description)
- AgentCard URL (if provided)

## After Creation

```bash
cd your-agent-name

# Fund your wallet (get SOL from faucet or transfer)
# For devnet: https://faucet.solana.com
# For mainnet: transfer from your wallet

# Verify your agent (optional, 0.01 SOL)
npx said verify -k wallet.json

# Run your agent
npm start  # or python src/index.py
```

## Options

```bash
npx create-said-agent --help

Options:
  -n, --name <name>        Agent name
  -t, --template <type>    Template (nanobot|openclaw)
  --skip-register          Skip SAID registration
  --mainnet                Use Solana mainnet (default: devnet)
```

## Part of SAID Protocol

This tool is part of the [SAID Protocol](https://github.com/kaiclawd/said) ecosystem:

- **SAID Program** — On-chain identity (Solana mainnet)
- **SAID API** — REST endpoints for agent registry
- **SAID SDK** — CLI tools and TypeScript SDK
- **SAID Website** — Agent directory and profiles
- **create-said-agent** — This scaffolding tool

## Examples

### Basic Creation
```bash
npx create-said-agent
# Follow the prompts
```

### Advanced (Skip Prompts)
```bash
npx create-said-agent \
  --name "TraderBot" \
  --template nanobot \
  --mainnet
```

### Verify After Creation
```bash
cd TraderBot
npx said verify -k wallet.json
```

## Requirements

- Node.js 18+ (for the scaffold tool)
- Python 3.8+ (if using Nanobot template)
- Solana CLI (optional, for manual wallet operations)

## Links

- **SAID Protocol:** [saidprotocol.com](https://www.saidprotocol.com)
- **Documentation:** [saidprotocol.com/docs](https://www.saidprotocol.com/docs.html)
- **GitHub:** [github.com/kaiclawd/create-said-agent](https://github.com/kaiclawd/create-said-agent)
- **npm:** [npmjs.com/package/create-said-agent](https://www.npmjs.com/package/create-said-agent)

## License

MIT

---

## 🏛️ Built for Colosseum Agent Hackathon

Created during the Colosseum AI Agent Hackathon (Feb 2-13, 2026).

**Goal:** Make agent creation trivial. One command gets you a working agent with verifiable on-chain identity.

**Published:** v0.3.10 on npm  
**Part of:** [SAID Protocol](https://github.com/kaiclawd/said) — identity infrastructure for AI agents
