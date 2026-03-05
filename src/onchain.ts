import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
} from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import chalk from 'chalk';
import { createHash } from 'crypto';
import fs from 'fs';

const PROGRAM_ID = new PublicKey('5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G');
const API_BASE = 'https://api.saidprotocol.com';
const DEFAULT_RPC = 'https://api.mainnet-beta.solana.com';

function getDiscriminator(name: string): Buffer {
  const hash = createHash('sha256').update(name).digest();
  return hash.subarray(0, 8);
}

function getAgentPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), owner.toBuffer()],
    PROGRAM_ID
  );
}

function getTreasuryPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('treasury')],
    PROGRAM_ID
  );
}

export function loadKeypair(keypairPath: string): Keypair {
  const raw = fs.readFileSync(keypairPath, 'utf8');
  const secretKey = new Uint8Array(JSON.parse(raw));
  return Keypair.fromSecretKey(secretKey);
}

export async function registerOnChain(
  keypair: Keypair,
  rpc: string = DEFAULT_RPC
): Promise<string> {
  const connection = new Connection(rpc, 'confirmed');
  const owner = keypair.publicKey;
  const wallet = owner.toString();
  const metadataUri = `${API_BASE}/api/cards/${wallet}.json`;

  const discriminator = getDiscriminator('global:register_agent');
  const uriBytes = Buffer.from(metadataUri, 'utf8');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(uriBytes.length, 0);
  const data = Buffer.concat([discriminator, lenBuf, uriBytes]);

  const [agentPDA] = getAgentPDA(owner);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: agentPDA, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const { blockhash } = await connection.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: owner,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  tx.sign([keypair]);

  const sig = await connection.sendTransaction(tx, { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  return sig;
}

export async function registerOnAPI(
  keypair: Keypair,
  name: string,
  description: string,
  options: { twitter?: string; website?: string; capabilities?: string[] } = {}
): Promise<void> {
  const wallet = keypair.publicKey.toString();
  const timestamp = Date.now();
  const msg = `SAID:register:${wallet}:${name}:${timestamp}`;
  const msgBytes = new TextEncoder().encode(msg);
  const signature = bs58.encode(nacl.sign.detached(msgBytes, keypair.secretKey));

  const response = await fetch(`${API_BASE}/api/register/sponsored`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet,
      name,
      description,
      signature,
      timestamp,
      ...options,
    }),
  });

  if (response.status === 409) {
    console.log(chalk.yellow('  ⚠ Already registered on API (409) — proceeding'));
    return;
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API registration failed (${response.status}): ${body}`);
  }
}

export async function getVerified(
  keypair: Keypair,
  rpc: string = DEFAULT_RPC
): Promise<string> {
  const connection = new Connection(rpc, 'confirmed');
  const owner = keypair.publicKey;

  const [agentPDA] = getAgentPDA(owner);
  const [treasuryPDA] = getTreasuryPDA();

  // Check if registered
  const acct = await connection.getAccountInfo(agentPDA);
  if (!acct) {
    throw new Error('Agent not registered on-chain. Run `create-said-agent register` first.');
  }

  // Check balance
  const balance = await connection.getBalance(owner);
  const cost = 0.01 * 1e9;
  console.log(chalk.cyan(`  Current balance: ${(balance / 1e9).toFixed(4)} SOL`));
  console.log(chalk.cyan(`  Verification costs: 0.01 SOL`));
  if (balance < cost + 5000) {
    throw new Error(`Insufficient SOL. Need at least 0.01 SOL + fees.`);
  }

  const discriminator = getDiscriminator('global:get_verified');

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: agentPDA, isSigner: false, isWritable: true },
      { pubkey: treasuryPDA, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: discriminator,
  });

  const { blockhash } = await connection.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: owner,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  tx.sign([keypair]);

  const sig = await connection.sendTransaction(tx, { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  return sig;
}

export async function getStatus(
  walletAddress: string,
  rpc: string = DEFAULT_RPC
): Promise<void> {
  const connection = new Connection(rpc, 'confirmed');
  const wallet = new PublicKey(walletAddress);
  const [agentPDA] = getAgentPDA(wallet);

  console.log(chalk.cyan('\n📋 Agent Status'));
  console.log(chalk.gray(`  Wallet: ${walletAddress}`));
  console.log(chalk.gray(`  PDA:    ${agentPDA.toString()}`));

  // On-chain check
  const acct = await connection.getAccountInfo(agentPDA);
  if (acct) {
    console.log(chalk.green('  ✅ Registered on-chain'));
    // Try to parse verified flag — account data after 8-byte discriminator
    // We don't know exact layout so just show raw size
    console.log(chalk.gray(`  Account size: ${acct.data.length} bytes`));
  } else {
    console.log(chalk.red('  ❌ Not registered on-chain'));
  }

  // API check
  try {
    const res = await fetch(`${API_BASE}/api/cards/${walletAddress}.json`);
    if (res.ok) {
      const data = await res.json() as Record<string, unknown>;
      console.log(chalk.green('  ✅ Registered on API'));
      if (data.name) console.log(chalk.white(`  Name: ${data.name}`));
      if (data.description) console.log(chalk.white(`  Description: ${data.description}`));
      if (data.verified) console.log(chalk.green('  ✅ Verified'));
      else console.log(chalk.yellow('  ⏳ Not verified'));
    } else {
      console.log(chalk.red('  ❌ Not found on API'));
    }
  } catch {
    console.log(chalk.red('  ❌ Could not reach API'));
  }
  console.log();
}
