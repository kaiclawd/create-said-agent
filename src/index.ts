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

program
  .name('create-said-agent')
  .description('Create a SAID-verified AI agent in one command')
  .version(version)
  .argument('[project-name]', 'Name of the project directory')
  .option('-t, --template <template>', 'Template to use (light | crypto)', 'light')
  .option('--skip-install', 'Skip npm install')
  .option('--skip-register', 'Skip SAID registration')
  .action(async (projectName, options) => {
    try {
      await runWizard(projectName, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

program.parse();
