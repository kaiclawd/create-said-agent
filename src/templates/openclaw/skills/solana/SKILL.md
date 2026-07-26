---
name: solana-crypto
description: Solana blockchain tools with SAID economic enforcement. Check balances, verify agents, check staking/slashing, run trust gates, sign transactions. Use for any Solana wallet or blockchain operations.
---

# Solana & Crypto Skill

Blockchain tools for Solana AI agents with SAID identity and economic enforcement.

## Tools

### Check SOL Balance
```bash
curl -X POST "https://api.mainnet-beta.solana.com" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getBalance","params":["WALLET_ADDRESS"]}'
```

### Verify SAID Agent (Identity + Trust Score)
```bash
curl "https://api.saidprotocol.com/api/verify/WALLET_ADDRESS"
```

### Check Enforcement (Staking & Slashing)
SAID's unique differentiator — agents stake SOL as collateral and get slashed for bad behavior.

```bash
curl "https://api.saidprotocol.com/api/enforcement/WALLET_ADDRESS"
```

Returns: `staked` (SOL), `slashed` (bool), `slashCount`, `enforcementTier` (economic/reputation/none).

### Check Risk Assessment
```bash
curl "https://api.saidprotocol.com/api/risk/WALLET_ADDRESS"
```

Returns: risk level, recommended escrow %, max transaction value, marketplace verdict (accept/review/reject).

### Lookup Agent Profile
```bash
curl "https://api.saidprotocol.com/api/agents/WALLET_ADDRESS"
```

## SAID Protocol API

| Endpoint | Purpose |
|----------|---------|
| `/api/verify/:wallet` | Identity + trust score |
| `/api/enforcement/:wallet` | Staking collateral + slashing history |
| `/api/risk/:wallet` | Risk assessment + escrow recommendations |
| `/api/agents/:wallet` | Agent profile metadata |
| `/api/leaderboard` | Top trusted agents |

## SDK Integration

```bash
npm install @said-protocol/client
```

```typescript
import { SAIDClient } from '@said-protocol/client';

const client = new SAIDClient();

// Check enforcement data
const enforcement = await client.getEnforcement('WALLET_ADDRESS');
console.log(`Staked: ${enforcement.staked} SOL`);
console.log(`Slashed: ${enforcement.slashed ? '⚠️ Yes' : '✅ Clean'}`);

// Run a trust gate check
const risk = await client.getRiskAssessment('WALLET_ADDRESS');
console.log(`Verdict: ${risk.marketplaceVerdict}`);
```

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
| STAKED | SOL staked as collateral (economic enforcement) |

## Enforcement Tiers

| Tier | Meaning |
|------|---------|
| `economic` | Agent has staked SOL — real economic skin-in-the-game |
| `reputation` | Registered but no stake — advisory trust only |
| `none` | No enforcement data |

## Links

- SAID Protocol: https://www.saidprotocol.com
- API: https://api.saidprotocol.com
- SDK: `@said-protocol/client` on npm
- Solana Explorer: https://solscan.io
