#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { runWizard } from './wizard.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const { version } = pkg;

console.log(chalk.cyan(`
╔═══════════════════════════════════════════╗
║                                           ║
║   🤖 create-said-agent v${version.padEnd(17)}║
║                                           ║
║   Scaffold, register, and run a           ║
║   SAID-verified AI agent on Solana        ║
║                                           ║
╚═══════════════════════════════════════════╝
`));

import { loadKeypair, registerOnAPI, registerOnChain, getVerified, getStatus } from './onchain.js';
import { PublicKey } from '@solana/web3.js';
import { getScore, submitFeedback, discoverAgents, getLeaderboard, getStats, getRiskAssessment, getCreditScore, assessAgent, getStakingInfo, getTrustCrisisReport } from './api.js';

program
  .name('create-said-agent')
  .description('Create a SAID-verified AI agent in one command')
  .version(version);

// Default command: scaffold wizard
program
  .argument('[project-name]', 'Name of the project directory')
  .option('-t, --template <template>', 'Template to use (nanobot | eliza | openclaw)', 'nanobot')
  .option('--skip-install', 'Skip npm install')
  .option('--skip-register', 'Skip SAID registration')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .option('--name <name>', 'Agent name (human readable)')
  .option('--description <desc>', 'Agent description')
  .action(async (projectName, options) => {
    if (!projectName && !options.yes) {
      // If a subcommand was matched, commander handles it; this only fires for scaffold
    }
    try {
      await runWizard(projectName, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// register subcommand
program
  .command('register')
  .description('Register agent on-chain and via API')
  .requiredOption('--keypair <path>', 'Path to Solana keypair JSON file')
  .requiredOption('--name <name>', 'Agent name')
  .requiredOption('--description <desc>', 'Agent description')
  .option('--twitter <handle>', 'Twitter handle')
  .option('--website <url>', 'Website URL')
  .option('--rpc <url>', 'Solana RPC URL', 'https://api.mainnet-beta.solana.com')
  .action(async (opts) => {
    try {
      const keypair = loadKeypair(opts.keypair);
      const wallet = keypair.publicKey.toString();
      console.log(chalk.cyan(`\n🔑 Wallet: ${wallet}\n`));

      console.log(chalk.yellow('📡 Registering on API...'));
      await registerOnAPI(keypair, opts.name, opts.description, {
        twitter: opts.twitter,
        website: opts.website,
      });
      console.log(chalk.green('  ✅ API registration complete'));

      console.log(chalk.yellow('⛓️  Registering on-chain...'));
      const txHash = await registerOnChain(keypair, opts.rpc);
      console.log(chalk.green('  ✅ On-chain registration complete'));

      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), keypair.publicKey.toBuffer()],
        new PublicKey('5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G')
      );

      console.log(chalk.green(`\n✅ Done!`));
      console.log(chalk.white(`  PDA: ${pda.toString()}`));
      console.log(chalk.white(`  TX:  ${txHash}`));
      console.log(chalk.gray(`  Explorer: https://solscan.io/tx/${txHash}\n`));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`\n❌ Registration failed: ${msg}\n`));
      process.exit(1);
    }
  });

// verify subcommand
program
  .command('verify')
  .description('Verify agent on-chain (costs 0.01 SOL)')
  .requiredOption('--keypair <path>', 'Path to Solana keypair JSON file')
  .option('--rpc <url>', 'Solana RPC URL', 'https://api.mainnet-beta.solana.com')
  .action(async (opts) => {
    try {
      const keypair = loadKeypair(opts.keypair);
      const wallet = keypair.publicKey.toString();
      console.log(chalk.cyan(`\n🔑 Wallet: ${wallet}\n`));

      console.log(chalk.yellow('🔍 Verifying agent on-chain...'));
      const txHash = await getVerified(keypair, opts.rpc);
      console.log(chalk.green(`\n✅ Verified!`));
      console.log(chalk.white(`  TX: ${txHash}`));
      console.log(chalk.gray(`  Explorer: https://solscan.io/tx/${txHash}\n`));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`\n❌ Verification failed: ${msg}\n`));
      process.exit(1);
    }
  });

// status subcommand
program
  .command('status')
  .description('Check agent registration and verification status')
  .requiredOption('--wallet <address>', 'Solana wallet address')
  .option('--rpc <url>', 'Solana RPC URL', 'https://api.mainnet-beta.solana.com')
  .action(async (opts) => {
    try {
      await getStatus(opts.wallet, opts.rpc);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`\n❌ Status check failed: ${msg}\n`));
      process.exit(1);
    }
  });

// score subcommand
program
  .command('score')
  .description('Check an agent\'s SAID trust score')
  .requiredOption('--wallet <address>', 'Solana wallet address')
  .action(async (opts) => {
    await getScore(opts.wallet);
  });

// feedback subcommand
program
  .command('feedback')
  .description('Submit feedback for an agent')
  .requiredOption('--wallet <address>', 'Target agent\'s wallet address')
  .requiredOption('--rating <1-5>', 'Rating (1-5 stars)')
  .option('--comment <text>', 'Feedback comment')
  .option('--from <wallet>', 'Your wallet address (optional)')
  .action(async (opts) => {
    await submitFeedback(opts.wallet, parseInt(opts.rating, 10), opts.comment || '', opts.from);
  });

// discover subcommand
program
  .command('discover')
  .description('Browse the SAID agent directory')
  .option('--limit <n>', 'Number of agents to show', '20')
  .action(async (opts) => {
    await discoverAgents(parseInt(opts.limit, 10));
  });

// leaderboard subcommand
program
  .command('leaderboard')
  .description('Show top trusted SAID agents')
  .option('--limit <n>', 'Number of entries', '10')
  .action(async (opts) => {
    await getLeaderboard(parseInt(opts.limit, 10));
  });

// stats subcommand
program
  .command('stats')
  .description('Show SAID Protocol network statistics')
  .action(async () => {
    await getStats();
  });

// risk subcommand — assess transaction risk for an agent
program
  .command('risk')
  .description('Assess transaction risk for an agent (6-tier model with escrow recommendations)')
  .requiredOption('--wallet <address>', 'Solana wallet address')
  .option('--amount <usd>', 'Transaction amount in USDC (optional, for tailored advice)')
  .action(async (opts) => {
    const amount = opts.amount ? parseFloat(opts.amount) : undefined;
    await getRiskAssessment(opts.wallet, amount);
  });

// credit subcommand — SACRS credit score (FICO-compatible)
program
  .command('credit')
  .description('Get SACRS credit score for an agent (300-850 FICO-compatible)')
  .requiredOption('--wallet <address>', 'Solana wallet address')
  .action(async (opts) => {
    await getCreditScore(opts.wallet);
  });

// assess subcommand — policy-based trust decision
program
  .command('assess')
  .description('Evaluate an agent against a trust policy (allow/deny/review)')
  .requiredOption('--wallet <address>', 'Solana wallet address')
  .option('--policy <preset>', 'Policy preset: strict | balanced | permissive', 'balanced')
  .option('--min-score <n>', 'Minimum trust score (0-100)', '0')
  .option('--min-stake <sol>', 'Minimum stake in SOL', '0')
  .option('--require-verified', 'Require verified status')
  .action(async (opts) => {
    await assessAgent(opts.wallet, {
      preset: opts.policy,
      minScore: parseInt(opts.minScore, 10) || undefined,
      minStakeSOL: parseFloat(opts.minStake) || undefined,
      requireVerified: opts.requireVerified || undefined,
    });
  });

// stake subcommand — staking and enforcement info
program
  .command('stake')
  .description('View staking and slashing/enforcement info for an agent')
  .requiredOption('--wallet <address>', 'Solana wallet address')
  .action(async (opts) => {
    await getStakingInfo(opts.wallet);
  });

// trust-crisis subcommand — economic enforcement vs reputation analysis
program
  .command('trust-crisis')
  .description('Compare economic enforcement vs ERC-8004 reputation signals (arXiv Sybil study)')
  .requiredOption('--wallet <address>', 'Solana wallet address')
  .action(async (opts) => {
    await getTrustCrisisReport(opts.wallet);
  });

program.parse();
