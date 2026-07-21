import chalk from 'chalk';

const API_BASE = 'https://api.saidprotocol.com';

export interface TrustScore {
  wallet: string;
  score: number;
  level: string;
  breakdown?: {
    category: string;
    points: number;
    source: string;
  }[];
}

export interface AgentInfo {
  wallet: string;
  name: string;
  description: string;
  isVerified: boolean;
  isOnChain: boolean;
  twitter?: string;
  website?: string;
  capabilities?: string[];
  createdAt?: string;
  stakeAmount?: number;
  status?: string;
}

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  name: string;
  score: number;
  level: string;
  isVerified: boolean;
}

export interface DiscoverResult {
  total: number;
  agents: AgentInfo[];
}

export interface Stats {
  totalAgents: number;
  verifiedAgents: number;
  onChainAgents: number;
  stakedAgents: number;
  totalStake: number;
}

/**
 * Get an agent's trust score
 */
export async function getScore(wallet: string): Promise<void> {
  console.log(chalk.cyan(`\n📊 Fetching SAID Score for ${wallet.slice(0, 8)}...${wallet.slice(-4)}...\n`));
  
  try {
    const res = await fetch(`${API_BASE}/api/trust/${wallet}`);
    
    if (!res.ok) {
      if (res.status === 404) {
        console.log(chalk.yellow(`  ⚠️  Agent not found. Register first: npx create-said-agent register --keypair wallet.json`));
      } else {
        console.log(chalk.red(`  ❌ API error (${res.status})`));
      }
      return;
    }
    
    const data = await res.json() as any;
    const score = data.score ?? data.trust_score ?? 0;
    const level = score >= 80 ? '🟢 HIGH' : score >= 50 ? '🟡 MEDIUM' : score > 0 ? '🟠 LOW' : '⚪ NONE';
    
    console.log(chalk.white(`  Wallet:  ${wallet}`));
    console.log(chalk.white(`  Score:   ${chalk.bold(String(score))}/100`));
    console.log(chalk.white(`  Level:   ${level}`));
    
    // Try to get agent name
    const agentRes = await fetch(`${API_BASE}/api/agents/${wallet}`);
    if (agentRes.ok) {
      const agent = await agentRes.json() as any;
      if (agent.name) console.log(chalk.white(`  Name:    ${agent.name}`));
      if (agent.isVerified) console.log(chalk.green('  ✅ Verified on-chain'));
    }
    
    // Try transparent breakdown
    const breakdownRes = await fetch(`${API_BASE}/v1/breakdown/${wallet}`);
    if (breakdownRes.ok) {
      const breakdown = await breakdownRes.json() as any;
      if (breakdown.breakdown && breakdown.breakdown.length > 0) {
        console.log(chalk.cyan('\n  Score Breakdown:'));
        for (const item of breakdown.breakdown) {
          console.log(chalk.gray(`    ${item.category}: +${item.points} (${item.source})`));
        }
      }
    }
    
    console.log(chalk.gray(`\n  Profile: https://www.saidprotocol.com/agent.html?wallet=${wallet}\n`));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  ❌ Failed to fetch score: ${msg}\n`));
  }
}

/**
 * Submit feedback for an agent
 */
export async function submitFeedback(
  targetWallet: string,
  rating: number,
  comment: string,
  signerWallet?: string
): Promise<void> {
  if (rating < 1 || rating > 5) {
    console.error(chalk.red('\n  ❌ Rating must be 1-5\n'));
    process.exit(1);
  }
  
  console.log(chalk.cyan(`\n💬 Submitting feedback for ${targetWallet.slice(0, 8)}...${targetWallet.slice(-4)}...\n`));
  
  try {
    const res = await fetch(`${API_BASE}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetWallet,
        rating,
        comment,
        fromWallet: signerWallet || 'anonymous',
        timestamp: Date.now(),
      }),
    });
    
    if (!res.ok) {
      const body = await res.text();
      console.error(chalk.red(`\n  ❌ Feedback failed (${res.status}): ${body}\n`));
      process.exit(1);
    }
    
    const data = await res.json() as any;
    console.log(chalk.green('  ✅ Feedback submitted!'));
    if (data.newScore !== undefined) {
      const level = data.newScore >= 80 ? '🟢 HIGH' : data.newScore >= 50 ? '🟡 MEDIUM' : '🟠 LOW';
      console.log(chalk.white(`  New score: ${data.newScore}/100 ${level}`));
    }
    console.log(chalk.gray(`\n  Profile: https://www.saidprotocol.com/agent.html?wallet=${targetWallet}\n`));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  ❌ Failed: ${msg}\n`));
    process.exit(1);
  }
}

/**
 * Discover agents on SAID Protocol
 */
export async function discoverAgents(limit: number = 20): Promise<void> {
  console.log(chalk.cyan(`\n🔍 Browsing SAID Agent Directory...\n`));
  
  try {
    const res = await fetch(`${API_BASE}/xchain/discover?limit=${limit}`);
    
    if (!res.ok) {
      // Fallback to stats endpoint
      const statsRes = await fetch(`${API_BASE}/api/stats`);
      if (statsRes.ok) {
        const stats = await statsRes.json() as any;
        console.log(chalk.white(`  Total agents: ${stats.totalAgents || stats.total || 'N/A'}`));
        console.log(chalk.white(`  Verified:     ${stats.verifiedAgents || stats.verified || 'N/A'}`));
      }
      console.log(chalk.gray(`\n  Browse at: https://www.saidprotocol.com\n`));
      return;
    }
    
    const data = await res.json() as any;
    const agents = data.agents || data;
    
    if (Array.isArray(agents) && agents.length > 0) {
      console.log(chalk.white(`  Found ${agents.length} agents:\n`));
      for (const agent of agents.slice(0, limit)) {
        const name = agent.name || 'Unknown';
        const wallet = agent.wallet || agent.address || '';
        const verified = agent.isVerified ? '✅' : '⏳';
        const desc = agent.description ? agent.description.slice(0, 60) : '';
        console.log(`  ${verified} ${chalk.bold(name.padEnd(20))} ${chalk.gray(wallet.slice(0, 12) + '...')}`);
        if (desc) console.log(chalk.gray(`     ${desc}`));
      }
    } else {
      console.log(chalk.gray('  No agents found in directory.'));
    }
    
    console.log(chalk.gray(`\n  Full directory: https://www.saidprotocol.com\n`));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  ❌ Failed: ${msg}\n`));
  }
}

/**
 * Show leaderboard of top trusted agents
 */
export async function getLeaderboard(limit: number = 10): Promise<void> {
  console.log(chalk.cyan(`\n🏆 SAID Protocol Leaderboard — Top ${limit} Agents\n`));
  
  try {
    // Try the leaderboard/breakdown endpoint
    const res = await fetch(`${API_BASE}/v1/leaderboard?limit=${limit}`);
    
    if (!res.ok) {
      // Fallback: use discover + sort
      const discoverRes = await fetch(`${API_BASE}/xchain/discover?limit=100`);
      if (discoverRes.ok) {
        const data = await discoverRes.json() as any;
        const agents = (data.agents || data || []).filter((a: any) => a.isVerified);
        console.log(chalk.white(`  Verified agents: ${agents.length}\n`));
        
        for (let i = 0; i < Math.min(limit, agents.length); i++) {
          const agent = agents[i];
          const name = agent.name || 'Unknown';
          const wallet = agent.wallet || '';
          console.log(`  ${chalk.bold(`#${i + 1}`.padEnd(5))} ✅ ${chalk.bold(name.padEnd(20))} ${chalk.gray(wallet.slice(0, 12) + '...')}`);
        }
      } else {
        console.log(chalk.gray('  Leaderboard not available right now.'));
        console.log(chalk.gray(`  Check: https://www.saidprotocol.com\n`));
      }
      return;
    }
    
    const data = await res.json() as any;
    const entries = data.leaderboard || data.agents || [];
    
    if (entries.length === 0) {
      console.log(chalk.gray('  No scored agents yet.'));
      console.log(chalk.gray('  Be the first! Register and verify your agent.\n'));
      return;
    }
    
    for (const entry of entries.slice(0, limit)) {
      const rank = entry.rank || entries.indexOf(entry) + 1;
      const name = entry.name || 'Unknown';
      const score = entry.score || 0;
      const level = score >= 80 ? '🟢' : score >= 50 ? '🟡' : '🟠';
      const wallet = entry.wallet || '';
      
      console.log(`  ${chalk.bold(`#${rank}`.padEnd(5))} ${level} ${chalk.bold(name.padEnd(20))} ${chalk.white(`${score}/100`)} ${chalk.gray(wallet.slice(0, 12) + '...')}`);
    }
    
    console.log(chalk.gray(`\n  Full leaderboard: https://www.saidprotocol.com\n`));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  ❌ Failed: ${msg}\n`));
  }
}

/**
 * Get SAID Protocol network stats
 */
export async function getStats(): Promise<void> {
  console.log(chalk.cyan('\n📈 SAID Protocol Network Stats\n'));
  
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    
    if (!res.ok) {
      console.log(chalk.gray('  Stats not available right now.\n'));
      return;
    }
    
    const data = await res.json() as any;
    
    const total = data.totalAgents || data.total || 0;
    const verified = data.verifiedAgents || data.verified || 0;
    const onChain = data.onChainAgents || data.onChain || 0;
    const staked = data.stakedAgents || data.staked || 0;
    
    console.log(chalk.white(`  Total Agents:     ${chalk.bold(String(total))}`));
    console.log(chalk.white(`  Verified:         ${chalk.bold(String(verified))} ${chalk.green(`(${total > 0 ? Math.round(verified / total * 100) : 0}%)`)}`));
    if (onChain > 0) console.log(chalk.white(`  On-chain:         ${chalk.bold(String(onChain))}`));
    if (staked > 0) console.log(chalk.white(`  Staked:           ${chalk.bold(String(staked))}`));
    
    // Try v1/stats for more detail
    const v1Res = await fetch(`${API_BASE}/v1/stats`);
    if (v1Res.ok) {
      const v1Data = await v1Res.json() as any;
      if (v1Data.totalFeedback !== undefined) {
        console.log(chalk.white(`  Total Feedback:   ${chalk.bold(String(v1Data.totalFeedback))}`));
      }
      if (v1Data.avgScore !== undefined) {
        console.log(chalk.white(`  Average Score:    ${chalk.bold(String(v1Data.avgScore))}/100`));
      }
    }
    
    console.log(chalk.gray(`\n  Website: https://www.saidprotocol.com`));
    console.log(chalk.gray(`  API:    ${API_BASE}\n`));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  ❌ Failed: ${msg}\n`));
  }
}
