import fs from 'fs-extra';
import path from 'path';
import { Keypair } from '@solana/web3.js';
import chalk from 'chalk';

interface ScaffoldOptions {
  projectName: string;
  projectPath: string;
  template: 'nanobot' | 'openclaw';
  agentName: string;
  description: string;
  twitter?: string;
  website?: string;
  anthropicKey?: string;
  telegramToken?: string;
  telegramUserId?: string;
}

/**
 * Generate a new keypair and save it
 */
export function generateKeypair(projectPath: string): Keypair {
  const keypair = Keypair.generate();
  const keypairPath = path.join(projectPath, 'wallet.json');
  fs.writeJsonSync(keypairPath, Array.from(keypair.secretKey));
  return keypair;
}

/**
 * Load an existing keypair
 */
export function loadKeypair(keypairPath: string): Keypair {
  const secretKey = fs.readJsonSync(keypairPath);
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

/**
 * Scaffold the light template (simple chatbot)
 */
function scaffoldLight(options: ScaffoldOptions): void {
  const { projectPath, agentName, description, twitter, website } = options;
  
  // package.json
  const packageJson = {
    name: options.projectName,
    version: '0.1.0',
    type: 'module',
    scripts: {
      start: 'node src/index.js',
      dev: 'node --watch src/index.js',
      register: 'node scripts/register.js'
    },
    dependencies: {
      '@anthropic-ai/sdk': '^0.30.0',
      '@solana/web3.js': '^1.98.0',
      'said-sdk': '^0.1.0',
      'dotenv': '^16.4.5'
    }
  };
  fs.writeJsonSync(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });

  // .env.example
  const envExample = `# Anthropic API Key (get from console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-...

# Solana RPC (optional - defaults to mainnet)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
`;
  fs.writeFileSync(path.join(projectPath, '.env.example'), envExample);
  fs.writeFileSync(path.join(projectPath, '.env'), envExample);

  // .gitignore
  const gitignore = `node_modules/
.env
wallet.json
said.json
`;
  fs.writeFileSync(path.join(projectPath, '.gitignore'), gitignore);

  // src/index.js
  const srcDir = path.join(projectPath, 'src');
  fs.ensureDirSync(srcDir);
  
  const indexJs = `import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
import fs from 'fs';
import readline from 'readline';

config();

// Load SAID identity
const saidInfo = JSON.parse(fs.readFileSync('./said.json', 'utf8'));

console.log('\\n🤖 ${agentName}');
console.log('SAID Identity:', saidInfo.pda);
console.log('Profile:', saidInfo.profile);
console.log('\\n---\\n');

const client = new Anthropic();
const conversationHistory = [];

const systemPrompt = \`You are ${agentName}.
${description}

Your on-chain identity (SAID PDA): \${saidInfo.pda}
Your profile: \${saidInfo.profile}

Be helpful, concise, and authentic.\`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function chat(userMessage) {
  conversationHistory.push({ role: 'user', content: userMessage });
  
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: conversationHistory
  });
  
  const assistantMessage = response.content[0].text;
  conversationHistory.push({ role: 'assistant', content: assistantMessage });
  
  return assistantMessage;
}

function prompt() {
  rl.question('You: ', async (input) => {
    if (input.toLowerCase() === 'exit') {
      console.log('Goodbye!');
      rl.close();
      return;
    }
    
    const response = await chat(input);
    console.log(\`\\n${agentName}: \${response}\\n\`);
    prompt();
  });
}

console.log('Chat with ${agentName} (type "exit" to quit)\\n');
prompt();
`;
  fs.writeFileSync(path.join(srcDir, 'index.js'), indexJs);

  // scripts/register.js
  const scriptsDir = path.join(projectPath, 'scripts');
  fs.ensureDirSync(scriptsDir);
  
  const registerJs = `import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import fs from 'fs';
import { config } from 'dotenv';

config();

const SAID_API = 'https://api.saidprotocol.com';
const SAID_PROGRAM_ID = new PublicKey('5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G');

// Load wallet
const secretKey = JSON.parse(fs.readFileSync('./wallet.json', 'utf8'));
const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
const wallet = keypair.publicKey.toString();

console.log('Wallet:', wallet);

// Check balance
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
const balance = await connection.getBalance(keypair.publicKey);
console.log('Balance:', balance / 1e9, 'SOL');

if (balance < 5000000) { // 0.005 SOL
  console.log('\\n⚠️  Insufficient balance. Need ~0.005 SOL for registration.');
  console.log('Fund your wallet:', wallet);
  process.exit(1);
}

// Register via API
console.log('\\nRegistering on SAID Protocol...');

const response = await fetch(\`\${SAID_API}/api/register/prepare\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    wallet,
    name: '${agentName}',
    description: '${description}'${twitter ? `,\n    twitter: '${twitter}'` : ''}${website ? `,\n    website: '${website}'` : ''}
  })
});

const result = await response.json();

if (result.error) {
  console.error('Error:', result.error);
  process.exit(1);
}

console.log('\\n✅ Registration prepared!');
console.log('PDA:', result.pda);
console.log('\\nNext: Sign and submit the transaction (coming soon)');
`;
  fs.writeFileSync(path.join(scriptsDir, 'register.js'), registerJs);

  // README.md
  const readme = `# ${agentName}

${description}

## SAID Identity

This agent is registered on [SAID Protocol](https://www.saidprotocol.com) — Solana's identity layer for AI agents.

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Add your Anthropic API key to \`.env\`:
   \`\`\`
   ANTHROPIC_API_KEY=sk-ant-...
   \`\`\`

3. Run the agent:
   \`\`\`bash
   npm start
   \`\`\`

## Files

- \`wallet.json\` - Solana keypair (keep secret!)
- \`said.json\` - SAID registration info
- \`src/index.js\` - Main agent code

## Links

- Profile: See \`said.json\` for your profile URL
- Docs: https://www.saidprotocol.com/docs.html
`;
  fs.writeFileSync(path.join(projectPath, 'README.md'), readme);
}

/**
 * Scaffold the crypto template (full Solana agent)
 */
function scaffoldCrypto(options: ScaffoldOptions): void {
  const { projectPath, agentName, description, twitter, website } = options;
  
  // package.json
  const packageJson = {
    name: options.projectName,
    version: '0.1.0',
    type: 'module',
    scripts: {
      start: 'node src/index.js',
      dev: 'node --watch src/index.js',
      register: 'node scripts/register.js'
    },
    dependencies: {
      '@anthropic-ai/sdk': '^0.30.0',
      '@solana/web3.js': '^1.98.0',
      '@solana/spl-token': '^0.4.9',
      'said-sdk': '^0.1.0',
      'dotenv': '^16.4.5',
      'bs58': '^6.0.0'
    }
  };
  fs.writeJsonSync(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });

  // .env.example
  const envExample = `# Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-...

# Solana RPC (use a paid RPC for production)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Optional: Helius/QuickNode for better performance
# SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
`;
  fs.writeFileSync(path.join(projectPath, '.env.example'), envExample);
  fs.writeFileSync(path.join(projectPath, '.env'), envExample);

  // .gitignore
  const gitignore = `node_modules/
.env
wallet.json
said.json
`;
  fs.writeFileSync(path.join(projectPath, '.gitignore'), gitignore);

  // src directory structure
  const srcDir = path.join(projectPath, 'src');
  const toolsDir = path.join(srcDir, 'tools');
  fs.ensureDirSync(srcDir);
  fs.ensureDirSync(toolsDir);

  // src/index.js - Main agent with tools
  const indexJs = `import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
import fs from 'fs';
import readline from 'readline';
import { getBalance, getTokenBalances, transfer, getPrice } from './tools/solana.js';

config();

// Load SAID identity
const saidInfo = JSON.parse(fs.readFileSync('./said.json', 'utf8'));

console.log('\\n🤖 ${agentName}');
console.log('SAID Identity:', saidInfo.pda);
console.log('Wallet:', saidInfo.wallet);
console.log('Profile:', saidInfo.profile);
console.log('\\n---\\n');

const client = new Anthropic();
const conversationHistory = [];

const systemPrompt = \`You are ${agentName}, a crypto-native AI agent on Solana.
${description}

Your on-chain identity (SAID PDA): \${saidInfo.pda}
Your wallet: \${saidInfo.wallet}
Your profile: \${saidInfo.profile}

You have access to Solana tools:
- Check SOL and token balances
- Transfer SOL (with user confirmation)
- Get token prices

Be helpful, accurate with numbers, and always confirm before transactions.\`;

// Tool definitions
const tools = [
  {
    name: 'get_balance',
    description: 'Get SOL balance of a wallet',
    input_schema: {
      type: 'object',
      properties: {
        wallet: { type: 'string', description: 'Solana wallet address (optional, defaults to own wallet)' }
      }
    }
  },
  {
    name: 'get_token_balances',
    description: 'Get all token balances for a wallet',
    input_schema: {
      type: 'object',
      properties: {
        wallet: { type: 'string', description: 'Solana wallet address (optional, defaults to own wallet)' }
      }
    }
  },
  {
    name: 'get_price',
    description: 'Get current price of a token',
    input_schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Token symbol (e.g., SOL, BONK)' }
      },
      required: ['symbol']
    }
  }
];

// Tool handlers
async function handleTool(name, input) {
  const wallet = saidInfo.wallet;
  
  switch (name) {
    case 'get_balance':
      return await getBalance(input.wallet || wallet);
    case 'get_token_balances':
      return await getTokenBalances(input.wallet || wallet);
    case 'get_price':
      return await getPrice(input.symbol);
    default:
      return { error: 'Unknown tool' };
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function chat(userMessage) {
  conversationHistory.push({ role: 'user', content: userMessage });
  
  let response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages: conversationHistory
  });
  
  // Handle tool use
  while (response.stop_reason === 'tool_use') {
    const toolUse = response.content.find(c => c.type === 'tool_use');
    console.log(\`\\n[Using tool: \${toolUse.name}]\`);
    
    const toolResult = await handleTool(toolUse.name, toolUse.input);
    console.log('[Result:', JSON.stringify(toolResult).slice(0, 100), ']\\n');
    
    conversationHistory.push({ role: 'assistant', content: response.content });
    conversationHistory.push({
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(toolResult)
      }]
    });
    
    response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: conversationHistory
    });
  }
  
  const assistantMessage = response.content.find(c => c.type === 'text')?.text || '';
  conversationHistory.push({ role: 'assistant', content: response.content });
  
  return assistantMessage;
}

function prompt() {
  rl.question('You: ', async (input) => {
    if (input.toLowerCase() === 'exit') {
      console.log('Goodbye!');
      rl.close();
      return;
    }
    
    try {
      const response = await chat(input);
      console.log(\`\\n${agentName}: \${response}\\n\`);
    } catch (error) {
      console.error('Error:', error.message);
    }
    prompt();
  });
}

console.log('Chat with ${agentName} (type "exit" to quit)\\n');
prompt();
`;
  fs.writeFileSync(path.join(srcDir, 'index.js'), indexJs);

  // src/tools/solana.js
  const solanaTools = `import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { config } from 'dotenv';

config();

const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
);

export async function getBalance(wallet) {
  try {
    const pubkey = new PublicKey(wallet);
    const balance = await connection.getBalance(pubkey);
    return {
      wallet,
      balance: balance / LAMPORTS_PER_SOL,
      unit: 'SOL'
    };
  } catch (error) {
    return { error: error.message };
  }
}

export async function getTokenBalances(wallet) {
  try {
    const pubkey = new PublicKey(wallet);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    });
    
    const balances = tokenAccounts.value
      .map(account => ({
        mint: account.account.data.parsed.info.mint,
        balance: account.account.data.parsed.info.tokenAmount.uiAmount,
        decimals: account.account.data.parsed.info.tokenAmount.decimals
      }))
      .filter(b => b.balance > 0);
    
    return { wallet, tokens: balances };
  } catch (error) {
    return { error: error.message };
  }
}

export async function getPrice(symbol) {
  try {
    // Use CoinGecko API (free, no key needed)
    const ids = {
      'SOL': 'solana',
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BONK': 'bonk',
      'WIF': 'dogwifcoin',
      'JUP': 'jupiter-exchange-solana'
    };
    
    const id = ids[symbol.toUpperCase()];
    if (!id) {
      return { error: \`Unknown token: \${symbol}\` };
    }
    
    const response = await fetch(
      \`https://api.coingecko.com/api/v3/simple/price?ids=\${id}&vs_currencies=usd\`
    );
    const data = await response.json();
    
    return {
      symbol: symbol.toUpperCase(),
      price: data[id]?.usd,
      currency: 'USD'
    };
  } catch (error) {
    return { error: error.message };
  }
}

export async function transfer(to, amount, keypairPath) {
  // Transfer implementation would go here
  // Requires user confirmation flow
  return { error: 'Transfer not implemented in demo' };
}
`;
  fs.writeFileSync(path.join(toolsDir, 'solana.js'), solanaTools);

  // scripts/register.js (same as light template)
  const scriptsDir = path.join(projectPath, 'scripts');
  fs.ensureDirSync(scriptsDir);
  
  const registerJs = `import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import fs from 'fs';
import { config } from 'dotenv';

config();

const SAID_API = 'https://api.saidprotocol.com';

// Load wallet
const secretKey = JSON.parse(fs.readFileSync('./wallet.json', 'utf8'));
const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
const wallet = keypair.publicKey.toString();

console.log('Wallet:', wallet);

// Check balance
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
const balance = await connection.getBalance(keypair.publicKey);
console.log('Balance:', balance / 1e9, 'SOL');

if (balance < 5000000) {
  console.log('\\n⚠️  Insufficient balance. Need ~0.005 SOL for registration.');
  console.log('Fund your wallet:', wallet);
  process.exit(1);
}

console.log('\\nRegistering on SAID Protocol...');

const response = await fetch(\`\${SAID_API}/api/register/prepare\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    wallet,
    name: '${agentName}',
    description: '${description}'${twitter ? `,\n    twitter: '${twitter}'` : ''}${website ? `,\n    website: '${website}'` : ''}
  })
});

const result = await response.json();

if (result.error) {
  console.error('Error:', result.error);
  process.exit(1);
}

console.log('\\n✅ Registration prepared!');
console.log('PDA:', result.pda);
`;
  fs.writeFileSync(path.join(scriptsDir, 'register.js'), registerJs);

  // README.md
  const readme = `# ${agentName}

${description}

A crypto-native AI agent with Solana tools, registered on [SAID Protocol](https://www.saidprotocol.com).

## Features

- 💬 Natural language chat interface
- 💰 Check SOL and token balances
- 📊 Get real-time token prices
- 🔐 SAID-verified on-chain identity

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Add your Anthropic API key to \`.env\`:
   \`\`\`
   ANTHROPIC_API_KEY=sk-ant-...
   \`\`\`

3. Run the agent:
   \`\`\`bash
   npm start
   \`\`\`

## Example Commands

- "What's my SOL balance?"
- "Check the price of BONK"
- "Show my token holdings"
- "What's the balance of vitalik.sol?"

## Files

- \`wallet.json\` - Solana keypair (keep secret!)
- \`said.json\` - SAID registration info
- \`src/index.js\` - Main agent code
- \`src/tools/solana.js\` - Solana tool implementations

## SAID Identity

Your agent is registered on SAID Protocol with verifiable on-chain identity.
See \`said.json\` for your PDA and profile URL.
`;
  fs.writeFileSync(path.join(projectPath, 'README.md'), readme);
}

/**
 * Scaffold the nanobot template (full agent with channels)
 */
function scaffoldNanobot(options: ScaffoldOptions): void {
  const { projectPath, projectName, agentName, description, twitter, website } = options;
  
  // Create directories
  fs.ensureDirSync(path.join(projectPath, 'tools'));
  
  // config.json for nanobot
  const telegramEnabled = !!options.telegramToken;
  const telegramAllowFrom = options.telegramUserId ? [options.telegramUserId] : [];
  
  const config = {
    agents: {
      defaults: {
        model: "anthropic/claude-sonnet-4-20250514",
        systemPrompt: `You are ${agentName}, an AI agent with verified on-chain identity on Solana via SAID Protocol.

${description}

Your identity is verifiable at your SAID profile. Be helpful, concise, and authentic.`
      }
    },
    providers: {
      anthropic: {
        apiKey: "${ANTHROPIC_API_KEY}"
      }
    },
    channels: {
      telegram: {
        enabled: telegramEnabled,
        token: "${TELEGRAM_BOT_TOKEN}",
        allowFrom: telegramAllowFrom
      },
      whatsapp: {
        enabled: false,
        allowFrom: []
      }
    },
    tools: {
      web: {
        search: {
          apiKey: "${BRAVE_SEARCH_API_KEY}"
        }
      }
    }
  };
  fs.writeJsonSync(path.join(projectPath, 'config.json'), config, { spaces: 2 });
  
  // Solana tools
  const solanaTools = `"""
Solana tools for nanobot agents with SAID identity.
"""

import json
import os
from pathlib import Path
import urllib.request

# Load SAID identity
def load_said_identity():
    said_path = Path(__file__).parent.parent / "said.json"
    if said_path.exists():
        with open(said_path) as f:
            return json.load(f)
    return None

SAID_IDENTITY = load_said_identity()

def get_sol_balance(wallet_address: str = None) -> dict:
    """Get SOL balance for a wallet address."""
    try:
        from solana.rpc.api import Client
        from solders.pubkey import Pubkey
    except ImportError:
        return {"error": "Install solana: pip install solana"}
    
    address = wallet_address or (SAID_IDENTITY.get("wallet") if SAID_IDENTITY else None)
    if not address:
        return {"error": "No wallet address"}
    
    try:
        client = Client(os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com"))
        pubkey = Pubkey.from_string(address)
        lamports = client.get_balance(pubkey).value
        return {"wallet": address, "balance_sol": lamports / 1e9}
    except Exception as e:
        return {"error": str(e)}

def get_my_identity() -> dict:
    """Get this agent's SAID identity."""
    if not SAID_IDENTITY:
        return {"error": "SAID identity not found"}
    return {
        "name": SAID_IDENTITY.get("name"),
        "wallet": SAID_IDENTITY.get("wallet"),
        "pda": SAID_IDENTITY.get("pda"),
        "profile": SAID_IDENTITY.get("profile"),
        "status": SAID_IDENTITY.get("status", "PENDING")
    }

def verify_agent(wallet_address: str) -> dict:
    """Verify another agent's SAID identity."""
    try:
        url = f"https://api.saidprotocol.com/api/agents/{wallet_address}"
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            return {
                "verified": True,
                "name": data.get("name"),
                "wallet": data.get("wallet"),
                "isVerified": data.get("isVerified"),
                "profile": f"https://www.saidprotocol.com/agent.html?wallet={wallet_address}"
            }
    except Exception as e:
        return {"verified": False, "error": str(e)}
`;
  fs.writeFileSync(path.join(projectPath, 'tools', 'solana.py'), solanaTools);
  
  // .env.example
  const envExample = `# Required: LLM Provider
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC...

# Optional: Web Search  
BRAVE_SEARCH_API_KEY=BSA-...

# Optional: Custom Solana RPC
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
`;
  fs.writeFileSync(path.join(projectPath, '.env.example'), envExample);
  
  // Write actual .env with provided values
  const envActual = `# LLM Provider
ANTHROPIC_API_KEY=${options.anthropicKey || ''}

# Telegram Bot
TELEGRAM_BOT_TOKEN=${options.telegramToken || ''}

# Web Search  
BRAVE_SEARCH_API_KEY=

# Custom Solana RPC
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
`;
  fs.writeFileSync(path.join(projectPath, '.env'), envActual);
  
  // .gitignore
  fs.writeFileSync(path.join(projectPath, '.gitignore'), `wallet.json
.env
__pycache__/
*.pyc
`);
  
  // README.md
  const readme = `# ${agentName}

An AI agent powered by [nanobot](https://github.com/HKUDS/nanobot) with verified identity on [SAID Protocol](https://www.saidprotocol.com).

## Quick Start

### 1. Install nanobot

\`\`\`bash
pip install git+https://github.com/kaiclawd/said-nanobot.git
\`\`\`

### 2. Configure

\`\`\`bash
# Copy config to nanobot directory
mkdir -p ~/.nanobot
cp config.json ~/.nanobot/config.json

# Set API key
export ANTHROPIC_API_KEY="sk-ant-..."
\`\`\`

### 3. Run

**CLI mode:**
\`\`\`bash
nanobot agent -m "Hello! Who are you?"
\`\`\`

**Telegram/WhatsApp mode:**
\`\`\`bash
nanobot gateway
\`\`\`

## Telegram Setup

1. Create bot with [@BotFather](https://t.me/BotFather)
2. Get your user ID from [@userinfobot](https://t.me/userinfobot)  
3. Update config.json with token and allowFrom
4. Run \`nanobot gateway\`

## SAID Identity

Your agent has verified on-chain identity. Check \`said.json\` for details.

**Upgrade to on-chain:**
\`\`\`bash
# Fund wallet with ~0.005 SOL, then:
npx said-sdk register -k wallet.json -n "${agentName}"
\`\`\`

## Links

- [SAID Protocol](https://www.saidprotocol.com)
- [said-nanobot](https://github.com/kaiclawd/said-nanobot) (nanobot fork with Solana tools)
`;
  fs.writeFileSync(path.join(projectPath, 'README.md'), readme);
}

/**
 * Scaffold the openclaw template (full Clawdbot framework)
 */
function scaffoldOpenclaw(options: ScaffoldOptions): void {
  const { projectPath, projectName, agentName, description } = options;
  
  // Create directories
  fs.ensureDirSync(path.join(projectPath, 'skills', 'solana'));
  
  // package.json
  const packageJson = {
    name: projectName,
    version: '0.1.0',
    scripts: {
      start: 'clawdbot gateway start',
      stop: 'clawdbot gateway stop',
      status: 'clawdbot status'
    },
    dependencies: {
      'clawdbot': 'latest'
    }
  };
  fs.writeJsonSync(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });
  
  // AGENTS.md
  const agentsMd = `# ${agentName}

${description}

## Setup

This agent runs on Clawdbot (OpenClaw).

1. Install: \`npm install\`
2. Configure: Copy config below to \`~/.clawdbot/config.yaml\`
3. Run: \`npm start\`

## SAID Identity

Check \`said.json\` for your on-chain identity.
`;
  fs.writeFileSync(path.join(projectPath, 'AGENTS.md'), agentsMd);
  
  // Clawdbot config template
  const configYaml = `# Clawdbot Configuration for ${agentName}
# Copy to ~/.clawdbot/config.yaml

llm:
  provider: anthropic
  model: claude-sonnet-4-20250514

channels:
  telegram:
    enabled: false
    token: \${TELEGRAM_BOT_TOKEN}

skills:
  - ./skills/solana
`;
  fs.writeFileSync(path.join(projectPath, 'config.yaml'), configYaml);
  
  // Solana skill SKILL.md
  const skillMd = `---
name: said-solana
version: 1.0.0
description: Solana wallet and transaction skill for SAID-verified AI agents.
---

# SAID Solana Skill

## Tools

- \`get_balance\` - Check SOL balance
- \`get_token_balances\` - Check SPL tokens
- \`send_sol\` - Transfer SOL
- \`sign_message\` - Sign messages
- \`verify_agent\` - Check SAID identity
- \`lookup_agent\` - Get SAID profile
`;
  fs.writeFileSync(path.join(projectPath, 'skills', 'solana', 'SKILL.md'), skillMd);
  
  // Solana skill index.js (simplified)
  const solanaSkill = `import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';

const RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC);

function loadWallet() {
  const sk = JSON.parse(fs.readFileSync('./wallet.json'));
  return Keypair.fromSecretKey(Uint8Array.from(sk));
}

export async function getBalance(address) {
  const pubkey = address ? new PublicKey(address) : loadWallet().publicKey;
  const lamports = await connection.getBalance(pubkey);
  return { address: pubkey.toString(), sol: lamports / LAMPORTS_PER_SOL };
}

export async function getTokenBalances(address) {
  const pubkey = address ? new PublicKey(address) : loadWallet().publicKey;
  const accounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
  });
  return accounts.value.map(a => ({
    mint: a.account.data.parsed.info.mint,
    amount: a.account.data.parsed.info.tokenAmount.uiAmount
  })).filter(t => t.amount > 0);
}

export async function sendSol(to, amount) {
  const wallet = loadWallet();
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey(to),
      lamports: Math.floor(amount * LAMPORTS_PER_SOL)
    })
  );
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(wallet);
  const sig = await connection.sendRawTransaction(tx.serialize());
  return { signature: sig, explorer: \`https://solscan.io/tx/\${sig}\` };
}

export async function verifyAgent(wallet) {
  const res = await fetch(\`https://api.saidprotocol.com/api/agents/\${wallet}\`);
  if (!res.ok) return { verified: false };
  const agent = await res.json();
  return { verified: true, name: agent.name, isVerified: agent.isVerified };
}

export const tools = [
  { name: 'get_balance', handler: getBalance },
  { name: 'get_token_balances', handler: getTokenBalances },
  { name: 'send_sol', handler: sendSol },
  { name: 'verify_agent', handler: verifyAgent }
];
`;
  fs.writeFileSync(path.join(projectPath, 'skills', 'solana', 'index.js'), solanaSkill);
  
  // .env.example
  fs.writeFileSync(path.join(projectPath, '.env.example'), `ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
`);
  fs.writeFileSync(path.join(projectPath, '.env'), `ANTHROPIC_API_KEY=
TELEGRAM_BOT_TOKEN=
SOLANA_RPC_URL=
`);
  
  // .gitignore
  fs.writeFileSync(path.join(projectPath, '.gitignore'), `wallet.json
.env
node_modules/
`);
  
  // README
  const readme = `# ${agentName}

${description}

An AI agent powered by [Clawdbot](https://github.com/clawdbot/clawdbot) with verified identity on [SAID Protocol](https://www.saidprotocol.com).

## Requirements

- Node.js 18+
- VPS or Mac Mini (400k+ lines of code)
- Telegram bot token (optional)

## Quick Start

\`\`\`bash
npm install
npm start
\`\`\`

## Solana Skill

Pre-installed with:
- Balance checks (SOL + tokens)
- SOL transfers
- Message signing
- SAID identity verification

## Configuration

Copy \`config.yaml\` to \`~/.clawdbot/config.yaml\` and configure.

## Links

- [Clawdbot Docs](https://docs.clawd.bot)
- [SAID Protocol](https://www.saidprotocol.com)
`;
  fs.writeFileSync(path.join(projectPath, 'README.md'), readme);
}

/**
 * Main scaffold function
 */
export async function scaffold(options: ScaffoldOptions): Promise<void> {
  const { projectPath, template } = options;
  
  // Create project directory
  fs.ensureDirSync(projectPath);
  
  // Generate wallet
  console.log(chalk.blue('Generating wallet...'));
  const keypair = generateKeypair(projectPath);
  console.log(chalk.gray(`  Address: ${keypair.publicKey.toString()}`));
  
  // Scaffold based on template
  console.log(chalk.blue(`Scaffolding ${template} template...`));
  
  if (template === 'nanobot') {
    scaffoldNanobot(options);
  } else if (template === 'openclaw') {
    scaffoldOpenclaw(options);
  } else {
    scaffoldNanobot(options); // Default to nanobot
  }
  
  console.log(chalk.green('✓ Project scaffolded'));
}
