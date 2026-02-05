import { Keypair } from '@solana/web3.js';
interface ScaffoldOptions {
    projectName: string;
    projectPath: string;
    template: 'light' | 'crypto';
    agentName: string;
    description: string;
    twitter?: string;
    website?: string;
}
/**
 * Generate a new keypair and save it
 */
export declare function generateKeypair(projectPath: string): Keypair;
/**
 * Load an existing keypair
 */
export declare function loadKeypair(keypairPath: string): Keypair;
/**
 * Main scaffold function
 */
export declare function scaffold(options: ScaffoldOptions): Promise<void>;
export {};
