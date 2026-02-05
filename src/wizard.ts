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
  template: 'light' | 'crypto';
  agentName: string;
  description: string;
  twitter?: string;
  website?: string;
}

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
      website: answers.website || undefined
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
      
      const result = await registerAgent({
        keypair,
        name: answers.agentName,
        description: answers.description,
        projectPath,
        twitter: answers.twitter || undefined,
        website: answers.website || undefined,
        capabilities: answers.template === 'crypto' 
          ? ['solana', 'defi', 'wallet'] 
          : ['chat', 'assistant']
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

  // Done!
  console.log('');
  console.log(chalk.green('✨ Agent created successfully!'));
  console.log('');
  console.log(chalk.cyan('Next steps:'));
  console.log('');
  console.log(chalk.gray(`  1. cd ${answers.projectName}`));
  console.log(chalk.gray('  2. Add your Anthropic API key to .env'));
  console.log(chalk.gray('  3. npm start'));
  console.log('');
  
  if (answers.template === 'crypto') {
    console.log(chalk.cyan('Your agent can:'));
    console.log(chalk.gray('  • Check SOL and token balances'));
    console.log(chalk.gray('  • Get real-time token prices'));
    console.log(chalk.gray('  • More tools coming soon...'));
    console.log('');
  }
  
  console.log(chalk.cyan('Upgrade to on-chain (optional):'));
  console.log(chalk.gray('  • Fund wallet with 0.005 SOL'));
  console.log(chalk.gray('  • Run: npm run anchor'));
  console.log(chalk.gray('  • Get verified badge: npm run verify (0.01 SOL)'));
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
      template: (options.template as 'light' | 'crypto') || 'light',
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
          name: 'light - Simple chatbot with SAID identity', 
          value: 'light' 
        },
        { 
          name: 'crypto - Full Solana agent with wallet & DeFi tools', 
          value: 'crypto' 
        }
      ],
      default: options.template || 'light'
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
    }
  ]);

  return runScaffold(answers, options, sponsorship);
}
