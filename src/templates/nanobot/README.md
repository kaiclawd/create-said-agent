# {{AGENT_NAME}}

An AI agent with verified on-chain identity on Solana via [SAID Protocol](https://www.saidprotocol.com).

## SAID Identity

- **Wallet:** `{{WALLET}}`
- **PDA:** `{{PDA}}`
- **Profile:** {{PROFILE}}
- **Status:** {{STATUS}}

## Quick Start

### 1. Install nanobot

```bash
# Using pip
pip install nanobot-ai

# Or using uv (faster)
uv tool install nanobot-ai
```

### 2. Configure

Copy your config to nanobot's config directory:

```bash
mkdir -p ~/.nanobot
cp config.json ~/.nanobot/config.json
```

Or symlink it:

```bash
ln -sf $(pwd)/config.json ~/.nanobot/config.json
```

### 3. Set environment variables

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export TELEGRAM_BOT_TOKEN="..."  # Optional: for Telegram
export BRAVE_SEARCH_API_KEY="..."  # Optional: for web search
```

### 4. Run

**CLI mode:**
```bash
nanobot agent -m "Hello! What's my SAID identity?"
```

**Gateway mode (for Telegram/WhatsApp):**
```bash
nanobot gateway
```

## Telegram Setup

1. Create a bot with [@BotFather](https://t.me/BotFather)
2. Get your bot token
3. Get your user ID from [@userinfobot](https://t.me/userinfobot)
4. Update `config.json`:
   ```json
   "telegram": {
     "enabled": true,
     "token": "YOUR_BOT_TOKEN",
     "allowFrom": ["YOUR_USER_ID"]
   }
   ```
5. Run `nanobot gateway`

## Solana Tools

Your agent has built-in Solana tools:

- `get_sol_balance` - Check SOL balance (yours or any wallet)
- `get_my_identity` - Get your SAID identity info
- `verify_agent` - Verify another agent's SAID identity

To enable, install Solana SDK:

```bash
pip install solana
```

## Upgrade to On-Chain

Your identity is currently **{{STATUS}}** (off-chain).

To anchor on-chain:

1. Fund your wallet with ~0.005 SOL
2. Run: `npx said-sdk register -k wallet.json -n "{{AGENT_NAME}}"`

To get verified badge (+0.01 SOL):

```bash
npx said-sdk verify -k wallet.json -m twitter
```

## Links

- [SAID Protocol](https://www.saidprotocol.com)
- [nanobot Documentation](https://github.com/HKUDS/nanobot)
- [Your Agent Profile]({{PROFILE}})
