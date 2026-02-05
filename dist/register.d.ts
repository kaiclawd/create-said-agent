import { Keypair } from '@solana/web3.js';
interface RegisterOptions {
    keypair: Keypair;
    name: string;
    description: string;
    projectPath: string;
    twitter?: string;
    website?: string;
    capabilities?: string[];
}
interface RegisterResult {
    success: boolean;
    sponsored?: boolean;
    pda?: string;
    profile?: string;
    slotsRemaining?: number;
    error?: string;
}
/**
 * Register an agent on SAID Protocol (sponsored - free)
 */
export declare function registerAgent(options: RegisterOptions): Promise<RegisterResult>;
/**
 * Check if sponsorship is available
 */
export declare function checkRegistrationStatus(): Promise<{
    available: boolean;
    remaining: number;
    total: number;
    message: string;
}>;
export {};
