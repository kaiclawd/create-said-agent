import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import fs from 'fs-extra';
import path from 'path';

const API_BASE = 'https://api.saidprotocol.com';

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

interface SponsoredResponse {
  success?: boolean;
  sponsored?: boolean;
  pda?: string;
  metadataUri?: string;
  profile?: string;
  badge?: string;
  slotsRemaining?: number;
  error?: string;
}

interface StatusResponse {
  available: boolean;
  slotsRemaining?: number;
  slotsTotal?: number;
  message: string;
}

/**
 * Generate the message to sign for registration
 */
function getRegistrationMessage(wallet: string, name: string, timestamp: number): string {
  return `SAID:register:${wallet}:${name}:${timestamp}`;
}

/**
 * Sign a message with a keypair
 */
function signMessage(message: string, keypair: Keypair): string {
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
  return bs58.encode(signature);
}

/**
 * Register an agent on SAID Protocol (pending - free, instant)
 */
export async function registerAgent(options: RegisterOptions): Promise<RegisterResult> {
  const { keypair, name, description, projectPath, twitter, website, capabilities } = options;
  const wallet = keypair.publicKey.toString();
  
  try {
    // Call pending registration endpoint (free, off-chain)
    const response = await fetch(`${API_BASE}/api/register/pending`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet,
        name,
        description,
        twitter,
        website,
        capabilities
      })
    });
    
    const result = await response.json() as SponsoredResponse;
    
    if (response.ok && result.success) {
      // Save SAID info to project
      const saidJson = {
        wallet,
        pda: result.pda,
        name,
        description,
        metadataUri: result.metadataUri,
        profile: result.profile,
        badge: result.badge,
        status: 'PENDING',
        registeredAt: new Date().toISOString(),
      };
      
      await fs.writeJson(path.join(projectPath, 'said.json'), saidJson, { spaces: 2 });
      
      return {
        success: true,
        sponsored: false,
        pda: result.pda,
        profile: result.profile,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Registration failed'
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Network error';
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Check if sponsorship is available
 */
export async function checkRegistrationStatus(): Promise<{
  available: boolean;
  remaining: number;
  total: number;
  message: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/register/sponsored/status`);
    const result = await response.json() as StatusResponse;
    return {
      available: result.available,
      remaining: result.slotsRemaining || 0,
      total: result.slotsTotal || 100,
      message: result.message
    };
  } catch {
    return {
      available: false,
      remaining: 0,
      total: 100,
      message: 'Could not reach SAID API'
    };
  }
}
