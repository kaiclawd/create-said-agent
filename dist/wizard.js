import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import ora from 'ora';
import { scaffold, loadKeypair } from './scaffold.js';
import { registerAgent } from './register.js';
/**
 * Check if sponsorship is available and display status
 */
async function checkSponsorship() {
    const spinner = ora('Checking sponsorship availability...').start();
    try {
        const response = await fetch('https://api.saidprotocol.com/api/register/sponsored/status');
        const status = await response.json();
        if (status.available) {
            spinner.succeed(chalk.green(`Sponsorship available! ${status.slotsRemaining} of ${status.slotsTotal} free slots remaining`));
            return { available: true, remaining: status.slotsRemaining || 0 };
        }
        else {
            spinner.warn(chalk.yellow('Sponsorship pool exhausted. Registration will require 0.005 SOL.'));
            return { available: false, remaining: 0 };
        }
    }
    catch {
        spinner.warn('Could not check sponsorship status');
        return { available: false, remaining: 0 };
    }
}
/**
 * Run the interactive wizard
 */
export async function runWizard(projectName, options = {}) {
    // Check sponsorship first
    const sponsorship = await checkSponsorship();
    console.log('');
    // Gather project info
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'projectName',
            message: 'Project name:',
            default: projectName || 'my-agent',
            validate: (input) => {
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
            default: (answers) => {
                // Convert project-name to Project Name
                return answers.projectName
                    .split('-')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
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
            filter: (input) => input.startsWith('@') ? input : input ? `@${input}` : ''
        },
        {
            type: 'input',
            name: 'website',
            message: 'Website (optional):'
        }
    ]);
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
    }
    catch (error) {
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
        }
        catch (error) {
            installSpinner.warn('Failed to install dependencies. Run npm install manually.');
        }
    }
    // Step 3: Register on SAID
    if (!options.skipRegister) {
        console.log('');
        if (sponsorship.available) {
            // Free registration available
            const registerSpinner = ora('Registering on SAID Protocol (sponsored - FREE)...').start();
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
                    registerSpinner.succeed(chalk.green('Registered on SAID Protocol (sponsored)'));
                    if (result.pda) {
                        console.log(chalk.gray(`  PDA: ${result.pda}`));
                    }
                    if (result.profile) {
                        console.log(chalk.gray(`  Profile: ${result.profile}`));
                    }
                }
                else {
                    registerSpinner.warn(`Registration note: ${result.error}`);
                }
            }
            catch (error) {
                registerSpinner.warn(`Could not register: ${error.message}`);
            }
        }
        else {
            // No sponsorship - manual registration required
            console.log(chalk.yellow('⚠️  Sponsorship pool is full. Manual registration required:'));
            console.log('');
            console.log(chalk.gray('  1. Fund your wallet with ~0.005 SOL:'));
            const keypair = loadKeypair(path.join(projectPath, 'wallet.json'));
            console.log(chalk.white(`     ${keypair.publicKey.toString()}`));
            console.log('');
            console.log(chalk.gray('  2. Run:'));
            console.log(chalk.white(`     cd ${answers.projectName} && npm run register`));
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
    console.log(chalk.gray('Docs: https://www.saidprotocol.com/docs.html'));
    console.log('');
}
