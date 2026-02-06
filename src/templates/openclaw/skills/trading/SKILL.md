---
name: trading-defi
description: Trading and DeFi tools for Solana. Get token prices, swap quotes, portfolio tracking. Use for any trading, price checking, or DeFi operations.
---

# Trading & DeFi Skill

Solana DeFi tools for AI agents.

## Tools

### Get Token Price
```bash
curl "https://api.jup.ag/price/v2?ids=SOL,BONK,JUP"
```

### Get Swap Quote
```bash
# Get quote for swapping 1 SOL to USDC
curl "https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000"
```

### Token Search
```bash
curl "https://api.jup.ag/tokens/v1/search?query=bonk"
```

## Quick Reference

| Action | API |
|--------|-----|
| Price | `https://api.jup.ag/price/v2?ids=TOKEN` |
| Quote | `https://quote-api.jup.ag/v6/quote` |
| Token list | `https://api.jup.ag/tokens/v1` |
| Token search | `https://api.jup.ag/tokens/v1/search?query=X` |

## Common Token Mints

| Token | Mint |
|-------|------|
| SOL | `So11111111111111111111111111111111111111112` |
| USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| BONK | `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263` |
| JUP | `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN` |

## Example Workflow

1. **Check price:** Get current SOL price
2. **Get quote:** How much USDC for 1 SOL?
3. **Execute swap:** Sign and send transaction (requires wallet)

## Notes

- Jupiter is the main DEX aggregator on Solana
- Quotes are free, swaps require SOL for fees
- Always verify slippage before executing
