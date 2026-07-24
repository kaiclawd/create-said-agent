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
  reputationScore: number;
  feedbackCount: number;
  isVerified: boolean;
  twitter?: string | null;
}

export interface DiscoverResult {
  total: number;
  agents: AgentInfo[];
}

export interface Stats {
  totalAgents: number;
  verifiedAgents: number;
  averageReputation?: number;
}

/**
 * Get an agent's trust score
 */
export async function getScore(wallet: string): Promise<void> {
  console.log(chalk.cyan(`\n📊 Fetching SAID Score for ${wallet.slice(0, 8)}...${wallet.slice(-4)}...\n`));
  
  try {
    // Use /api/verify for agent data + /api/enforcement for staking/slashing
    const [verifyRes, enforcementRes] = await Promise.all([
      fetch(`${API_BASE}/api/verify/${wallet}`),
      fetch(`${API_BASE}/api/enforcement/${wallet}`),
    ]);
    
    if (!verifyRes.ok && !enforcementRes.ok) {
      if (verifyRes.status === 404) {
        console.log(chalk.yellow(`  ⚠️  Agent not found. Register first: npx create-said-agent register --keypair wallet.json`));
      } else {
        console.log(chalk.red(`  ❌ API error (${verifyRes.status})`));
      }
      return;
    }
    
    const verifyData = verifyRes.ok ? await verifyRes.json() as any : {};
    const enforcementData = enforcementRes.ok ? await enforcementRes.json() as any : {};
    
    const registered = verifyData.registered ?? false;
    const verified = verifyData.verified ?? false;
    
    if (!registered) {
      console.log(chalk.yellow(`  ⚠️  Agent not registered in SAID Protocol`));
      console.log(chalk.gray(`\n  Register: npx create-said-agent register --keypair wallet.json\n`));
      return;
    }
    
    // Score from leaderboard data (reputationScore) or enforcement risk
    const score = verifyData.reputationScore ?? verifyData.score ?? 0;
    const feedbackCount = verifyData.feedbackCount ?? 0;
    const level = score >= 80 ? '🟢 HIGH' : score >= 50 ? '🟡 MEDIUM' : score > 0 ? '🟠 LOW' : '⚪ NONE';
    
    console.log(chalk.white(`  Wallet:   ${wallet}`));
    if (verifyData.name) console.log(chalk.white(`  Name:     ${verifyData.name}`));
    console.log(chalk.white(`  Score:    ${chalk.bold(String(score))}/100`));
    console.log(chalk.white(`  Level:    ${level}`));
    console.log(chalk.white(`  Verified: ${verified ? '✅ Yes' : '❌ No'}`));
    if (feedbackCount > 0) console.log(chalk.white(`  Feedback: ${feedbackCount} reviews`));
    
    // Enforcement data
    const staked = enforcementData.staked ?? false;
    const stakeAmount = enforcementData.stakeAmountSol ?? 0;
    const isSlashed = enforcementData.isSlashed ?? false;
    
    if (staked) {
      console.log(chalk.green(`  Staked:   ${stakeAmount.toFixed(4)} SOL`));
    }
    if (isSlashed) {
      console.log(chalk.red(`  ⚠️  SLASHED: This agent has economic penalties`));
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
    const res = await fetch(`${API_BASE}/api/leaderboard`);
    
    if (!res.ok) {
      console.log(chalk.gray('  Leaderboard not available right now.'));
      console.log(chalk.gray(`  Check: https://www.saidprotocol.com\n`));
      return;
    }
    
    const data = await res.json() as any;
    const entries: any[] = data.leaderboard || data.agents || [];
    
    if (entries.length === 0) {
      console.log(chalk.gray('  No scored agents yet.'));
      console.log(chalk.gray('  Be the first! Register and verify your agent.\n'));
      return;
    }
    
    for (const entry of entries.slice(0, limit)) {
      const rank = entry.rank || 1;
      const name = entry.name || 'Unknown';
      const score = entry.reputationScore ?? entry.score ?? 0;
      const feedback = entry.feedbackCount ?? 0;
      const level = score >= 80 ? '🟢' : score >= 50 ? '🟡' : '🟠';
      const wallet = entry.wallet || '';
      
      console.log(`  ${chalk.bold(`#${rank}`.padEnd(5))} ${level} ${chalk.bold(name.padEnd(22))} ${chalk.white(`${score.toFixed(1)}/100`)} ${chalk.gray(`(${feedback} reviews)`)}`);
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
    const avgRep = data.averageReputation ?? data.avgScore;
    
    console.log(chalk.white(`  Total Agents:     ${chalk.bold(String(total))}`));
    console.log(chalk.white(`  Verified:         ${chalk.bold(String(verified))} ${chalk.green(`(${total > 0 ? Math.round(verified / total * 100) : 0}%)`)}`));
    if (avgRep !== undefined) {
      console.log(chalk.white(`  Average Score:    ${chalk.bold((avgRep * 100).toFixed(1))}/100`));
    }
    
    console.log(chalk.gray(`\n  Website: https://www.saidprotocol.com`));
    console.log(chalk.gray(`  API:    ${API_BASE}\n`));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  ❌ Failed: ${msg}\n`));
  }
}

// ============================================================
// TRUST ENFORCEMENT FEATURES (v0.6.0)
// Exposes SDK v0.11.0 capabilities: risk, credit, assess, stake
// ============================================================

/**
 * Get a risk assessment for an agent — includes escrow recommendations
 */
export async function getRiskAssessment(
  wallet: string,
  txAmountUsd?: number
): Promise<void> {
  console.log(chalk.cyan(`\n⚠️  Risk Assessment for ${wallet.slice(0, 8)}...${wallet.slice(-4)}\n`));

  try {
    // Use enforcement endpoint for risk data
    const enforcementRes = await fetch(`${API_BASE}/api/enforcement/${wallet}`);
    if (!enforcementRes.ok) {
      if (enforcementRes.status === 404) {
        console.log(chalk.yellow(`  ⚠️  Agent not found.`));
      } else {
        console.log(chalk.red(`  ❌ API error (${enforcementRes.status})`));
      }
      return;
    }

    const data = await enforcementRes.json() as any;
    const registered = data.registered ?? false;
    const isVerified = data.isVerified ?? false;
    const isSlashed = data.isSlashed ?? false;
    const stakeAmount = data.stakeAmountSol ?? 0;
    const riskLevel = data.riskLevel ?? 'unknown';
    const riskReasons: string[] = data.riskReasons ?? [];

    // Derive score from enforcement data
    // If registered + verified + staked → higher score
    // If slashed → score 0
    let score = 0;
    if (registered && isVerified) {
      score = 50; // Base for verified
      if (stakeAmount > 0) score += Math.min(30, Math.floor(stakeAmount * 10));
      if (!isSlashed) score += 20; // Clean record bonus
    } else if (registered) {
      score = 20; // Registered but not verified
    }

    // Determine risk tier
    let tier: string;
    let tierColor: (s: string) => string;
    let maxUsdc: string;
    let escrowPct: string;
    let escrowHours: string;
    let recommendation: string;

    if (isSlashed) {
      tier = 'PROHIBITED';
      tierColor = chalk.red.bold;
      maxUsdc = '$0';
      escrowPct = 'N/A';
      escrowHours = 'N/A';
      recommendation = '⛔ This agent has been slashed. Do not transact.';
    } else if (score >= 80) {
      tier = 'MINIMAL';
      tierColor = chalk.green.bold;
      maxUsdc = '$5,000+';
      escrowPct = '0%';
      escrowHours = 'None';
      recommendation = '✅ Trusted agent. Proceed normally.';
    } else if (score >= 60) {
      tier = 'LOW';
      tierColor = chalk.green;
      maxUsdc = '$1,000';
      escrowPct = '25%';
      escrowHours = '1 hour';
      recommendation = '✅ Generally safe. Light escrow for larger amounts.';
    } else if (score >= 40) {
      tier = 'MODERATE';
      tierColor = chalk.yellow;
      maxUsdc = '$250';
      escrowPct = '50%';
      escrowHours = '12 hours';
      recommendation = '⚠️  Use escrow. Verify recent activity before transacting.';
    } else if (score >= 20) {
      tier = 'ELEVATED';
      tierColor = chalk.yellow.bold;
      maxUsdc = '$50';
      escrowPct = '75%';
      escrowHours = '24 hours';
      recommendation = '⚠️  High risk. Full escrow recommended.';
    } else if (score > 0) {
      tier = 'HIGH';
      tierColor = chalk.red;
      maxUsdc = '$10';
      escrowPct = '100%';
      escrowHours = '48 hours';
      recommendation = '🔴 Very high risk. Avoid or use full escrow.';
    } else {
      tier = 'UNKNOWN';
      tierColor = chalk.gray;
      maxUsdc = '$0';
      escrowPct = '100%';
      escrowHours = '48 hours';
      recommendation = '❓ No trust data. Treat as untrusted.';
    }

    // Display risk assessment
    console.log(chalk.white(`  Score:         ${score}/100`));
    console.log(chalk.white(`  Risk Tier:     ${tierColor(tier)}`));
    console.log(chalk.white(`  Verified:      ${isVerified ? '✅ Yes' : '❌ No'}`));
    if (isSlashed) {
      console.log(chalk.red(`  ⚠️  SLASHED:    This agent has economic penalties`));
    }
    console.log('');
    console.log(chalk.cyan('  Transaction Recommendations:'));
    console.log(chalk.white(`  Max USDC:      ${maxUsdc}`));
    console.log(chalk.white(`  Escrow Hold:   ${escrowPct}`));
    console.log(chalk.white(`  Dispute Window:${escrowHours}`));

    // If amount provided, give tailored advice
    if (txAmountUsd !== undefined) {
      console.log('');
      console.log(chalk.cyan(`  For $${txAmountUsd} USDC transaction:`));
      const maxNum = parseInt(maxUsdc.replace(/[^0-9]/g, '')) || 0;
      if (txAmountUsd > maxNum && maxNum > 0) {
        console.log(chalk.yellow(`  ⚠️  Above recommended max ($${maxNum}). Use full escrow.`));
      } else if (txAmountUsd > 0 && tier !== 'MINIMAL') {
        const escrowAmount = (txAmountUsd * parseInt(escrowPct) / 100);
        console.log(chalk.white(`  Escrow amount: ~$${escrowAmount.toFixed(2)} USDC`));
      } else {
        console.log(chalk.green(`  ✅ Within safe range.`));
      }
    }

    console.log('');
    console.log(chalk.white(`  ${recommendation}`));
    console.log(chalk.gray(`\n  Profile: https://www.saidprotocol.com/agent.html?wallet=${wallet}\n`));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  ❌ Failed: ${msg}\n`));
  }
}

/**
 * Get SACRS credit score for an agent (FICO-compatible 300-850)
 */
export async function getCreditScore(wallet: string): Promise<void> {
  console.log(chalk.cyan(`\n💰 SACRS Credit Score for ${wallet.slice(0, 8)}...${wallet.slice(-4)}\n`));

  try {
    // Use enforcement endpoint for all data
    const enforcementRes = await fetch(`${API_BASE}/api/enforcement/${wallet}`);
    if (!enforcementRes.ok) {
      if (enforcementRes.status === 404) {
        console.log(chalk.yellow(`  ⚠️  Agent not found.`));
      } else {
        console.log(chalk.red(`  ❌ API error (${enforcementRes.status})`));
      }
      return;
    }

    const data = await enforcementRes.json() as any;
    const registered = data.registered ?? false;
    const isVerified = data.isVerified ?? false;
    const isSlashed = data.isSlashed ?? false;
    const stakeAmount = data.stakeAmountSol ?? 0;

    // Derive trust score from enforcement data
    const trustScore = registered && isVerified
      ? (50 + (stakeAmount > 0 ? Math.min(30, Math.floor(stakeAmount * 10)) : 0) + (!isSlashed ? 20 : 0))
      : registered ? 20 : 0;

    // SACRS Credit Score Calculation (FICO-compatible 300-850)
    // Maps SAID trust + enforcement data to a credit score
    // This mirrors the SDK v0.11.0 SACRS implementation

    // Base: map 0-100 trust score to 300-700 range
    const baseScore = 300 + (trustScore * 4); // 300-700

    // Verified bonus: +20 (identity confirmation)
    const verifiedBonus = isVerified ? 20 : 0;

    // Staking bonus: up to +80 based on stake amount (capped)
    const stakeBonus = Math.min(80, Math.floor(stakeAmount * 100)); // 1 SOL = 100 pts, capped at 80

    // Slashing penalty: -100 (severe)
    const slashPenalty = isSlashed ? -100 : 0;

    // Activity factor (derived from enforcement data)
    let activityFactor = 0;
    if (registered && isVerified && stakeAmount > 0) {
      activityFactor = Math.min(50, Math.floor(stakeAmount * 5));
    }

    const creditScore = Math.max(300, Math.min(850,
      Math.round(baseScore + verifiedBonus + stakeBonus + activityFactor + slashPenalty)
    ));

    // Determine rating band
    let rating: string;
    let rateTier: string;
    if (creditScore >= 750) {
      rating = '🌟 EXCELLENT';
      rateTier = 'Prime rate — no premium';
    } else if (creditScore >= 670) {
      rating = '✅ GOOD';
      rateTier = '+50 bps premium';
    } else if (creditScore >= 580) {
      rating = '⚠️  FAIR';
      rateTier = '+200 bps premium';
    } else if (creditScore >= 500) {
      rating = '🟠 POOR';
      rateTier = '+500 bps premium';
    } else {
      rating = '🔴 VERY POOR';
      rateTier = 'Uninsurable — enforcement risk';
    }

    // Probability of default (simplified inverse)
    const probDefault = Math.max(0.5, Math.min(50, (850 - creditScore) / 10));

    // Recommended max borrow (based on score)
    const maxBorrow = creditScore >= 750 ? 50000 :
                      creditScore >= 670 ? 10000 :
                      creditScore >= 580 ? 2500 :
                      creditScore >= 500 ? 500 : 0;

    // Recommended LTV
    const maxLtv = creditScore >= 750 ? 0.85 :
                   creditScore >= 670 ? 0.70 :
                   creditScore >= 580 ? 0.50 :
                   creditScore >= 500 ? 0.25 : 0;

    console.log(chalk.white(`  SACRS Score:   ${chalk.bold(String(creditScore))}/850`));
    console.log(chalk.white(`  Rating:        ${rating}`));
    console.log('');

    console.log(chalk.cyan('  Score Breakdown:'));
    console.log(chalk.gray(`    Base (trust score):    +${baseScore} (from trust ${trustScore}/100)`));
    if (verifiedBonus) console.log(chalk.gray(`    Verified:              +${verifiedBonus}`));
    if (stakeBonus) console.log(chalk.gray(`    Staking collateral:    +${stakeBonus} (${stakeAmount.toFixed(2)} SOL)`));
    if (activityFactor) console.log(chalk.gray(`    Activity history:      +${activityFactor}`));
    if (slashPenalty) console.log(chalk.red(`    Slashing penalty:      ${slashPenalty}`));
    console.log('');

    console.log(chalk.cyan('  Lending Terms:'));
    console.log(chalk.white(`    Max borrow:      $${maxBorrow.toLocaleString()} USDC`));
    console.log(chalk.white(`    Max LTV:         ${(maxLtv * 100).toFixed(0)}%`));
    console.log(chalk.white(`    Rate premium:   ${rateTier}`));
    console.log(chalk.white(`    Default prob:   ~${probDefault.toFixed(1)}%`));

    if (isSlashed) {
      console.log('');
      console.log(chalk.red.bold('  ⛔ RISK FLAG: Agent has been slashed — uninsurable'));
    }

    console.log(chalk.gray(`\n  Methodology: SACRS (Solana Agent Credit Rating System)`));
    console.log(chalk.gray(`  Profile: https://www.saidprotocol.com/agent.html?wallet=${wallet}\n`));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  ❌ Failed: ${msg}\n`));
  }
}

/**
 * Evaluate an agent against a trust policy (allow/deny/review)
 */
export async function assessAgent(
  wallet: string,
  policy: {
    preset?: string;
    minScore?: number;
    minStakeSOL?: number;
    requireVerified?: boolean;
  }
): Promise<void> {
  // Apply preset defaults
  const presets: Record<string, { minScore: number; minStakeSOL: number; requireVerified: boolean }> = {
    strict:    { minScore: 70, minStakeSOL: 1,   requireVerified: true  },
    balanced:  { minScore: 40, minStakeSOL: 0,   requireVerified: false },
    permissive:{ minScore: 0,  minStakeSOL: 0,   requireVerified: false },
  };

  const preset = policy.preset ? presets[policy.preset] : presets.balanced;
  const effectiveMinScore = policy.minScore ?? preset.minScore;
  const effectiveMinStake = policy.minStakeSOL ?? preset.minStakeSOL;
  const effectiveRequireVerified = policy.requireVerified ?? preset.requireVerified;

  const policyName = policy.preset || 'custom';

  console.log(chalk.cyan(`\n🔍 Policy Assessment: ${policyName.toUpperCase()}\n`));
  console.log(chalk.gray(`  Policy: minScore=${effectiveMinScore}, minStake=${effectiveMinStake}SOL, requireVerified=${effectiveRequireVerified}`));
  console.log(chalk.gray(`  Target: ${wallet.slice(0, 8)}...${wallet.slice(-4)}\n`));

  try {
    // Use enforcement endpoint for all trust + staking data
    const enforcementRes = await fetch(`${API_BASE}/api/enforcement/${wallet}`);
    if (!enforcementRes.ok) {
      if (enforcementRes.status === 404) {
        console.log(chalk.red.bold('  ❌ DENY'));
        console.log(chalk.gray('  ↳ Agent not found in SAID registry.'));
      } else {
        console.log(chalk.red(`  ❌ API error (${enforcementRes.status})`));
      }
      return;
    }

    const data = await enforcementRes.json() as any;
    const registered = data.registered ?? false;
    const isVerified = data.isVerified ?? false;
    const isSlashed = data.isSlashed ?? false;
    const stakeAmount = data.stakeAmountSol ?? 0;

    // Derive score from enforcement data
    const score = registered && isVerified
      ? (50 + (stakeAmount > 0 ? Math.min(30, Math.floor(stakeAmount * 10)) : 0) + (!isSlashed ? 20 : 0))
      : registered ? 20 : 0;

    // Evaluate each rule
    const checks: { name: string; passed: boolean; detail: string }[] = [];

    // Hard fail: slashed
    if (isSlashed) {
      checks.push({ name: 'No slashing', passed: false, detail: 'Agent has been slashed' });
    } else {
      checks.push({ name: 'No slashing', passed: true, detail: 'No slashing history' });
    }

    // Score check
    if (score >= effectiveMinScore) {
      checks.push({ name: `Score ≥ ${effectiveMinScore}`, passed: true, detail: `${score}/100` });
    } else {
      checks.push({ name: `Score ≥ ${effectiveMinScore}`, passed: false, detail: `${score}/100 (below threshold)` });
    }

    // Verified check
    if (effectiveRequireVerified) {
      checks.push({ name: 'Verified', passed: isVerified, detail: isVerified ? 'Verified on-chain' : 'Not verified' });
    }

    // Stake check
    if (effectiveMinStake > 0) {
      if (stakeAmount >= effectiveMinStake) {
        checks.push({ name: `Stake ≥ ${effectiveMinStake} SOL`, passed: true, detail: `${stakeAmount.toFixed(2)} SOL staked` });
      } else {
        checks.push({ name: `Stake ≥ ${effectiveMinStake} SOL`, passed: false, detail: `${stakeAmount.toFixed(2)} SOL (below minimum)` });
      }
    }

    // Determine overall decision
    const hardFail = isSlashed;
    const allPassed = checks.every(c => c.passed);

    let decision: string;
    let decisionColor: (s: string) => string;

    if (hardFail) {
      decision = 'DENY';
      decisionColor = chalk.red.bold;
    } else if (allPassed) {
      decision = '✅ ALLOW';
      decisionColor = chalk.green.bold;
    } else {
      // Partial pass = REVIEW (not deny, for non-hard failures)
      decision = '⚠️  REVIEW';
      decisionColor = chalk.yellow.bold;
    }

    // Display results
    for (const check of checks) {
      const icon = check.passed ? '✅' : '❌';
      console.log(`  ${icon} ${check.name}: ${chalk.gray(check.detail)}`);
    }

    console.log('');
    console.log(chalk.white(`  Decision: ${decisionColor(decision)}`));

    if (decision.includes('REVIEW')) {
      console.log(chalk.gray('  ↳ Manual review recommended. Consider escrow or reduced limits.'));
    } else if (decision.includes('DENY')) {
      console.log(chalk.gray('  ↳ Do not transact with this agent.'));
    } else {
      console.log(chalk.gray('  ↳ Agent meets all policy requirements.'));
    }

    console.log(chalk.gray(`\n  Profile: https://www.saidprotocol.com/agent.html?wallet=${wallet}\n`));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  ❌ Failed: ${msg}\n`));
  }
}

/**
 * Get staking and enforcement info for an agent
 */
export async function getStakingInfo(wallet: string): Promise<void> {
  console.log(chalk.cyan(`\n⛓️  Staking & Enforcement for ${wallet.slice(0, 8)}...${wallet.slice(-4)}\n`));

  try {
    // Use enforcement endpoint for all staking/slashing data
    const enforcementRes = await fetch(`${API_BASE}/api/enforcement/${wallet}`);
    if (!enforcementRes.ok) {
      console.log(chalk.red(`  ❌ API error (${enforcementRes.status})`));
      return;
    }
    const data = await enforcementRes.json() as any;

    // Also try to get agent info from verify
    const verifyRes = await fetch(`${API_BASE}/api/verify/${wallet}`);
    const verifyData = verifyRes.ok ? await verifyRes.json() as any : null;

    const registered = data.registered ?? false;
    const stakeAmount = data.stakeAmountSol ?? 0;
    const isSlashed = data.isSlashed ?? false;
    const slashCount = data.slashCount ?? 0;
    const staked = data.staked ?? false;
    const stakedAt = data.stakedAt;
    const cooldownUntil = data.cooldownUntil;
    const riskLevel = data.riskLevel ?? 'unknown';
    const riskReasons: string[] = data.riskReasons ?? [];

    // Agent info
    if (verifyData?.name) {
      console.log(chalk.white(`  Agent:         ${verifyData.name}`));
    }
    console.log(chalk.white(`  Wallet:        ${wallet}`));
    console.log(chalk.white(`  Registered:    ${registered ? '✅ Yes' : '❌ No'}`));
    console.log('');

    // Staking status
    console.log(chalk.cyan('  Economic Security:'));
    if (staked && stakeAmount > 0) {
      console.log(chalk.green(`    Status:        ✅ STAKED`));
      console.log(chalk.white(`    Amount:        ${stakeAmount.toFixed(4)} SOL`));
      if (stakedAt) {
        console.log(chalk.gray(`    Staked since:  ${new Date(stakedAt).toLocaleDateString()}`));
      }
      if (cooldownUntil) {
        const unlock = new Date(cooldownUntil);
        const isLocked = unlock > new Date();
        console.log(chalk.white(`    Cooldown:      ${isLocked ? '🔒 Until ' + unlock.toLocaleDateString() : '🔓 Ready'}`));
      }
    } else {
      console.log(chalk.gray(`    Status:        ⬜ Not staked`));
      console.log(chalk.gray(`    Amount:        0 SOL`));
    }

    // Enforcement status
    console.log('');
    console.log(chalk.cyan('  Enforcement:'));
    if (isSlashed) {
      console.log(chalk.red.bold(`    Status:        ⛔ SLASHED`));
      if (slashCount > 0) {
        console.log(chalk.red(`    Slash count:   ${slashCount}`));
      }
    } else {
      console.log(chalk.green(`    Status:        ✅ Good standing`));
    }

    // Risk assessment from on-chain data
    console.log('');
    console.log(chalk.cyan('  Risk Assessment:'));
    const riskIcon = riskLevel === 'low' ? '🟢' : riskLevel === 'medium' ? '🟡' : riskLevel === 'high' ? '🟠' : '🔴';
    console.log(chalk.white(`    Level:         ${riskIcon} ${riskLevel.toUpperCase()}`));
    if (riskReasons.length > 0) {
      for (const reason of riskReasons) {
        console.log(chalk.gray(`    Reason:        ${reason}`));
      }
    }

    // Economic trust level
    if (stakeAmount >= 10) {
      console.log(chalk.green(`\n    Trust level:   💎 HIGH (significant economic backing)`));
    } else if (stakeAmount >= 1) {
      console.log(chalk.green(`\n    Trust level:   🟢 MODERATE`));
    } else if (stakeAmount > 0) {
      console.log(chalk.yellow(`\n    Trust level:   🟡 LOW`));
    } else {
      console.log(chalk.gray(`\n    Trust level:   ⚪ NONE (no stake)`));
    }

    // What staking means
    console.log('');
    console.log(chalk.gray('  Staking provides economic guarantees:'));
    console.log(chalk.gray('    • Staked agents risk losing SOL if they misbehave'));
    console.log(chalk.gray('    • Slashing penalties are enforced on-chain'));
    console.log(chalk.gray('    • Higher stakes = stronger trust signal'));

    if (!staked && !isSlashed) {
      console.log('');
      console.log(chalk.cyan('  To stake:'));
      console.log(chalk.gray('    Visit https://www.saidprotocol.com/stake.html'));
    }

    console.log(chalk.gray(`\n  Profile: https://www.saidprotocol.com/agent.html?wallet=${wallet}\n`));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  ❌ Failed: ${msg}\n`));
  }
}
