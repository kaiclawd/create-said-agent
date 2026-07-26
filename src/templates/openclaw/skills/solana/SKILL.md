---
name: solana-crypto
description: Solana blockchain tools. Check balances, verify SAID agents, get trust scores, risk assessments, credit scores, and sign transactions. Use for any Solana wallet or blockchain operations.
---

# Solana & Crypto Skill

Blockchain tools for Solana AI agents with SAID identity.

## Tools

### Check SOL Balance
```bash
curl -X POST "https://api.mainnet-beta.solana.com" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getBalance","params":["WALLET_ADDRESS"]}'
```

### Verify SAID Agent
```bash
curl "https://api.saidprotocol.com/api/verify/WALLET_ADDRESS"
```

### Get Agent Profile
```bash
curl "https://api.saidprotocol.com/api/verify/WALLET_ADDRESS"
```

### Get Agent Feedback
```bash
curl "https://api.saidprotocol.com/api/agents/WALLET_ADDRESS/feedback"
```

### View Leaderboard
```bash
curl "https://api.saidprotocol.com/api/leaderboard"
```

### Protocol Stats
```bash
curl "https://api.saidprotocol.com/api/stats"
```

## SAID Protocol API

| Endpoint | Purpose |
|----------|---------|
| `/api/verify/:wallet` | Full agent profile + trust score + verification |
| `/api/agents/:wallet/feedback` | Agent reviews and feedback |
| `/api/leaderboard` | Top agents by reputation |
| `/api/stats` | Protocol-wide statistics |
| `/api/cards/:wallet.json` | ERC-8004 Agent Card (JSON-LD) |

## Using the SAID SDK

For complex operations, use the SDK instead of raw HTTP:

```bash
npx @said-protocol/client verify --wallet WALLET_ADDRESS
npx @said-protocol/client trust --wallet WALLET_ADDRESS
npx @said-protocol/client risk --wallet WALLET_ADDRESS
npx @said-protocol/client credit --wallet WALLET_ADDRESS
npx @said-protocol/client leaderboard --limit 10
npx @said-protocol/client stats
```

### MCP Server (for AI agents)

Add SAID trust tools to any MCP-compatible AI agent:

```json
{
  "mcpServers": {
    "said": {
      "command": "npx",
      "args": ["-y", "@said-protocol/client", "--mcp"]
    }
  }
}
```

This gives your agent 12 trust-related tools (verify, score, risk, credit, etc.)

## Wallet Operations

Your wallet keypair is at `./wallet.json`. Never share this file!

### Sign a Message
```javascript
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const keypair = Keypair.fromSecretKey(/* wallet.json */);
const message = new TextEncoder().encode("Hello");
const signature = nacl.sign.detached(message, keypair.secretKey);
console.log(bs58.encode(signature));
```

## Trust Levels

| Status | Meaning |
|--------|---------|
| PENDING | Registered off-chain |
| REGISTERED | On-chain (~0.003 SOL) |
| VERIFIED | Verified badge (+0.01 SOL) |

## Links

- SAID Protocol: https://www.saidprotocol.com
- SDK: https://www.npmjs.com/package/@said-protocol/client
- Solana Explorer: https://solscan.io
