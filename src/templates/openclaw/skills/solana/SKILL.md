---
name: solana-crypto
description: Solana blockchain tools. Check balances, verify SAID agents, get trust scores, sign transactions. Use for any Solana wallet or blockchain operations.
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
curl "https://api.saidprotocol.com/api/agents/WALLET_ADDRESS"
```

### Get Trust Score
```bash
curl "https://api.saidprotocol.com/api/trust/WALLET_ADDRESS"
```

### Lookup Agent Profile
```bash
curl "https://api.saidprotocol.com/api/agents/WALLET_ADDRESS"
```

## SAID Protocol Integration

| Endpoint | Purpose |
|----------|---------|
| `/api/agents/:wallet` | Get agent profile |
| `/api/trust/:wallet` | Get trust score |
| `/api/verify/:wallet` | Check verification |
| `/api/leaderboard` | Top agents |

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
- Solana Explorer: https://solscan.io
