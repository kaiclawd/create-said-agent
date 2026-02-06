import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import ora from 'ora';
import { scaffold, loadKeypair } from './scaffold.js';
import { registerAgent, checkRegistrationStatus } from './register.js';

interface WizardOptions {
  template?: string;
  skipInstall?: boolean;
  skipRegister?: boolean;
  yes?: boolean;
  name?: string;
  description?: string;
}

interface WizardAnswers {
  projectName: string;
  template: 'nanobot' | 'openclaw';
  agentName: string;
  description: string;
  twitter?: string;
  website?: string;
  skills?: string[];
  anthropicKey?: string;
  telegramToken?: string;
  telegramUserId?: string;
}

// Skills available for nanobot (what's actually built)
const NANOBOT_SKILLS = [
  { name: 'Solana & Crypto — balances, verify agents, trust scores', value: 'solana' },
  { name: 'Research & Analysis — web search, data gathering', value: 'research' },
  { name: 'Code & Development — generate, debug, file ops', value: 'coding' },
  { name: 'Automation — scheduling, cron jobs', value: 'automation' },
  { name: 'Messaging — Telegram, WhatsApp', value: 'messaging' },
];

// Skills available for openclaw (full Clawdbot capabilities)
const OPENCLAW_SKILLS = [
  { name: 'Trading & DeFi — swaps, prices, portfolio', value: 'trading' },
  { name: 'Social Media — Twitter, Discord, Telegram', value: 'social' },
  { name: 'Research & Analysis — search, data, market intel', value: 'research' },
  { name: 'Content Creation — writing, images, video', value: 'content' },
  { name: 'Customer Support — chat, FAQ, tickets', value: 'support' },
  { name: 'Code & Development — generate, debug, deploy', value: 'coding' },
  { name: 'Data Processing — scraping, ETL, formatting', value: 'data' },
  { name: 'Automation — scheduling, workflows', value: 'automation' },
  { name: 'Solana & Crypto — balances, transfers, DeFi', value: 'solana' },
  { name: 'Payments & Finance — invoicing, accounting', value: 'finance' },
];

interface SponsorshipStatus {
  available: boolean;
  slotsRemaining?: number;
  slotsTotal?: number;
}

/**
 * Check if sponsorship is available and display status
 */
async function checkSponsorship(): Promise<{ available: boolean; remaining: number }> {
  const spinner = ora('Checking sponsorship availability...').start();
  
  try {
    const response = await fetch('https://api.saidprotocol.com/api/register/sponsored/status');
    const status = await response.json() as SponsorshipStatus;
    
    if (status.available) {
      spinner.succeed(chalk.green(`Sponsorship available! ${status.slotsRemaining} of ${status.slotsTotal} free slots remaining`));
      return { available: true, remaining: status.slotsRemaining || 0 };
    } else {
      spinner.warn(chalk.yellow('Sponsorship pool exhausted. Registration will require 0.005 SOL.'));
      return { available: false, remaining: 0 };
    }
  } catch {
    spinner.warn('Could not check sponsorship status');
    return { available: false, remaining: 0 };
  }
}

/**
 * Run the scaffold and registration process
 */
async function runScaffold(
  answers: WizardAnswers, 
  options: WizardOptions, 
  sponsorship: { available: boolean; remaining: number }
): Promise<void> {
  const projectPath = path.resolve(process.cwd(), answers.projectName);
  
  console.log('');
  console.log(chalk.cyan('Creating your agent...'));
  console.log('');

  // Step 1: Scaffold the project
  const scaffoldSpinner = ora('Scaffolding project...').start();
  try {
    await scaffold({
      projectName: answers.projectName,
      projectPath,
      template: answers.template,
      agentName: answers.agentName,
      description: answers.description,
      twitter: answers.twitter || undefined,
      website: answers.website || undefined,
      anthropicKey: answers.anthropicKey || undefined,
      telegramToken: answers.telegramToken || undefined,
      telegramUserId: answers.telegramUserId || undefined
    });
    scaffoldSpinner.succeed('Project scaffolded');
  } catch (error: any) {
    scaffoldSpinner.fail('Failed to scaffold project');
    throw error;
  }

  // Step 2: Install dependencies
  if (!options.skipInstall) {
    const installSpinner = ora('Installing dependencies...').start();
    try {
      const { execSync } = await import('child_process');
      execSync('npm install', { cwd: projectPath, stdio: 'pipe' });
      installSpinner.succeed('Dependencies installed');
    } catch {
      installSpinner.warn('Failed to install dependencies. Run npm install manually.');
    }
  }

  // Step 3: Register on SAID (off-chain, instant, free)
  if (!options.skipRegister) {
    const registerSpinner = ora('Registering on SAID Protocol (instant, FREE)...').start();
    
    try {
      const keypair = loadKeypair(path.join(projectPath, 'wallet.json'));
      
      // Build capabilities from selected skills + template defaults
      const baseCapabilities = ['solana', 'wallet', 'chat', 'assistant'];
      const skills = answers.skills || [];
      const capabilities = [...new Set([...baseCapabilities, ...skills])];
      
      const result = await registerAgent({
        keypair,
        name: answers.agentName,
        description: answers.description,
        projectPath,
        twitter: answers.twitter || undefined,
        website: answers.website || undefined,
        capabilities
      });
      
      if (result.success) {
        registerSpinner.succeed(chalk.green('Registered on SAID Protocol'));
        if (result.pda) {
          console.log(chalk.gray(`  PDA: ${result.pda}`));
        }
        if (result.profile) {
          console.log(chalk.gray(`  Profile: ${result.profile}`));
        }
        console.log(chalk.yellow(`  Status: PENDING (off-chain)`));
      } else {
        registerSpinner.warn(`Registration note: ${result.error}`);
      }
    } catch (error: any) {
      registerSpinner.warn(`Could not register: ${error.message}`);
    }
  }

  // Done! Show clear summary
  console.log('');
  console.log(chalk.green(`✨ Agent "${answers.agentName}" created successfully!`));
  console.log('');
  
  // Show wallet prominently
  const walletPath = path.join(projectPath, 'wallet.json');
  try {
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    const { Keypair } = await import('@solana/web3.js');
    const keypair = Keypair.fromSecretKey(Uint8Array.from(walletData));
    console.log(chalk.cyan('📍 Your wallet: ') + chalk.white(keypair.publicKey.toString()));
    console.log(chalk.yellow('🔑 Private key: ') + chalk.gray(`saved in ${answers.projectName}/wallet.json`));
    console.log(chalk.red('⚠️  BACKUP wallet.json! Lose it = lose your identity'));
  } catch {}
  
  // Show profile link
  console.log(chalk.cyan('🔗 Profile: ') + chalk.gray(`https://www.saidprotocol.com/agent.html?wallet=...`));
  console.log(chalk.cyan('📁 Location: ') + chalk.gray(projectPath));
  console.log('');
  
  // Smart next steps based on template
  console.log(chalk.cyan('To run your agent:'));
  console.log('');
  console.log(chalk.white(`  cd ${answers.projectName}`));
  
  if (answers.template === 'nanobot') {
    if (!answers.anthropicKey) {
      console.log(chalk.yellow('  # Add your API key to .env first'));
    }
    console.log(chalk.white('  pip install git+https://github.com/kaiclawd/said-nanobot.git'));
    console.log(chalk.white('  mkdir -p ~/.nanobot && cp config.json ~/.nanobot/'));
    console.log(chalk.white('  nanobot agent -m "Hello!"'));
    if (answers.telegramToken) {
      console.log('');
      console.log(chalk.green('✓ Telegram configured! Run: nanobot gateway'));
    }
  } else {
    // OpenClaw template
    console.log(chalk.yellow('  ⚠️  Requires Node.js 22+ (check: node --version)'));
    console.log(chalk.white('  npx clawdbot configure'));
    console.log(chalk.gray('    ↳ Add API keys, connect Telegram/WhatsApp, etc.'));
    console.log(chalk.white('  npx clawdbot gateway'));
  }
  console.log('');
  
  console.log(chalk.cyan('Upgrade to on-chain (optional):'));
  console.log(chalk.gray('  • Fund wallet with 0.005 SOL'));
  console.log(chalk.gray('  • Run: npx said-sdk register'));
  console.log('');
  
  console.log(chalk.gray('Docs: https://www.saidprotocol.com/docs.html'));
  console.log('');
}

/**
 * Run the interactive wizard
 */
export async function runWizard(projectName?: string, options: WizardOptions = {}): Promise<void> {
  // Check sponsorship first
  const sponsorship = await checkSponsorship();
  console.log('');
  
  // Non-interactive mode with --yes flag
  if (options.yes && projectName) {
    const agentName = options.name || projectName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const answers: WizardAnswers = {
      projectName,
      template: (options.template as 'nanobot' | 'openclaw') || 'nanobot',
      agentName,
      description: options.description || `${agentName} - AI Agent powered by Claude`,
    };
    return runScaffold(answers, options, sponsorship);
  }
  
  // Gather project info interactively
  const answers = await inquirer.prompt<WizardAnswers>([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: projectName || 'my-agent',
      validate: (input: string) => {
        if (!input.match(/^[a-z0-9-]+$/)) {
          return 'Project name must be lowercase alphanumeric with dashes';
        }
        if (fs.existsSync(input)) {
          return `Directory "${input}" already exists`;
        }
        return true;
      }
    },
    {
      type: 'list',
      name: 'template',
      message: 'Template:',
      choices: [
        { 
          name: 'nanobot - Lightweight agent, runs anywhere (recommended)', 
          value: 'nanobot' 
        },
        { 
          name: 'openclaw - Full Clawdbot framework, needs VPS/Mac Mini', 
          value: 'openclaw' 
        }
      ],
      default: options.template || 'nanobot'
    },
    {
      type: 'input',
      name: 'agentName',
      message: 'Agent name (human readable):',
      default: (ans: any) => {
        // Convert project-name to Project Name
        return ans.projectName
          .split('-')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description:',
      default: 'An AI agent powered by Claude'
    },
    {
      type: 'input',
      name: 'twitter',
      message: 'Twitter handle (optional):',
      filter: (input: string) => input.startsWith('@') ? input : input ? `@${input}` : ''
    },
    {
      type: 'input',
      name: 'website',
      message: 'Website (optional):'
    },
    {
      type: 'checkbox',
      name: 'skills',
      message: (ans: any) => ans.template === 'nanobot' 
        ? 'What can your agent do? (select with space):' 
        : 'What skills should your agent have? (select with space):',
      choices: (ans: any) => ans.template === 'nanobot' ? NANOBOT_SKILLS : OPENCLAW_SKILLS,
      default: (ans: any) => ans.template === 'nanobot' ? ['solana', 'research'] : []
    },
    {
      type: 'password',
      name: 'anthropicKey',
      message: 'Anthropic API key (get one at console.anthropic.com):',
      mask: '*',
      when: (ans: any) => ans.template === 'nanobot', // Only ask for nanobot
      validate: (input: string) => {
        if (!input) return true; // Optional
        if (!input.startsWith('sk-ant-')) {
          return 'API key should start with sk-ant-';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'telegramToken',
      message: 'Telegram bot token (optional - get from @BotFather):',
      when: (ans: any) => ans.template === 'nanobot' // Only ask for nanobot
    },
    {
      type: 'input',
      name: 'telegramUserId',
      message: 'Your Telegram user ID (optional - get from @userinfobot):',
      when: (ans: any) => ans.template === 'nanobot' && !!ans.telegramToken
    }
  ]);

  return runScaffold(answers, options, sponsorship);
}
