import chalk from 'chalk';

const API_BASE = 'https://api.saidprotocol.com';

/**
 * Get a SAID Reputation Passport for an agent.
 * Passports are signed trust documents usable in MCP, A2A, x402, and AP2 flows.
 */
export async function getPassport(wallet: string): Promise<void> {
  console.log(chalk.cyan(`\n🛂 Fetching SAID Reputation Passport for ${wallet.slice(0, 8)}...${wallet.slice(-4)}...\n`));

  try {
    const [verifyRes, enforcementRes] = await Promise.all([
      fetch(`${API_BASE}/api/verify/${wallet}`),
      fetch(`${API_BASE}/api/enforcement/${wallet}`),
    ]);

    if (!verifyRes.ok && !enforcementRes.ok) {
      console.log(chalk.yellow(`  ⚠️  Agent not found or API unavailable.\n`));
      return;
    }

    const verifyData = verifyRes.ok ? await verifyRes.json() as any : {};
    const enforcementData = enforcementRes.ok ? await enforcementRes.json() as any : {};

    const registered = verifyData.registered ?? false;
    if (!registered) {
      console.log(chalk.yellow(`  ⚠️  Agent not registered in SAID Protocol\n`));
      return;
    }

    const score = verifyData.reputationScore ?? verifyData.score ?? 0;
    const verified = verifyData.verified ?? false;
    const staked = enforcementData.staked ?? false;
    const stakeSOL = enforcementData.stakeAmountSol ?? 0;
    const slashedCount = enforcementData.slashedCount ?? 0;
    const feedbackCount = verifyData.feedbackCount ?? 0;

    // Calculate verdict
    let verdict: string;
    let riskLevel: string;
    let verdictColor: (s: string) => string;

    if (!verified && score < 30) {
      verdict = 'untrusted';
      riskLevel = 'critical';
      verdictColor = chalk.red;
    } else if (score >= 75 && verified && staked && slashedCount === 0) {
      verdict = 'trusted';
      riskLevel = 'low';
      verdictColor = chalk.green;
    } else if (score >= 40) {
      verdict = 'provisional';
      riskLevel = 'medium';
      verdictColor = chalk.yellow;
    } else {
      verdict = 'insufficient_evidence';
      riskLevel = 'unknown';
      verdictColor = chalk.gray;
    }

    // Calculate escrow percentage
    let escrowPct = 100;
    if (verdict === 'trusted') escrowPct = Math.max(0, 10 - Math.floor(stakeSOL));
    else if (verdict === 'provisional') escrowPct = Math.max(20, 80 - Math.floor(stakeSOL * 5));
    else if (verdict === 'untrusted') escrowPct = 100;

    console.log(chalk.white(`  ${verdictColor('━ VERDICT: ' + verdict.toUpperCase() + ' ━')}`));
    console.log(chalk.white(`  Risk Level:     ${riskLevel}`));
    console.log(chalk.white(`  Trust Score:    ${score}/100`));
    console.log(chalk.white(`  Verified:       ${verified ? '✅' : '❌'}`));
    console.log(chalk.white(`  Staked:         ${staked ? stakeSOL.toFixed(4) + ' SOL' : 'None'}`));
    console.log(chalk.white(`  Slashed:        ${slashedCount > 0 ? `⚠️  ${slashedCount}x` : 'Clean'}`));
    console.log(chalk.white(`  Feedback:       ${feedbackCount} reviews`));
    console.log(chalk.white(`  Escrow Rate:    ${escrowPct}%`));

    // Show serialization formats
    console.log(chalk.cyan(`\n  📦 Integration Formats:`));
    console.log(chalk.gray(`     MCP _meta:    { saidScore: ${score}, saidTier: "${verdict}", saidRisk: "${riskLevel}" }`));
    console.log(chalk.gray(`     x402 headers: X-SAID-Verdict: ${verdict}, X-SAID-Score: ${score}`));
    console.log(chalk.gray(`     A2A card:     type: "said-reputation-passport"`));
    console.log(chalk.gray(`     AP2 mandate:  type: "said-trust"`));

    console.log(chalk.gray(`\n  SDK: import { buildPassport } from '@said-protocol/client/passport'`));
    console.log(chalk.gray(`  Profile: https://www.saidprotocol.com/agent.html?wallet=${wallet}\n`));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  ❌ Failed: ${msg}\n`));
  }
}

/**
 * Run an x402 Enforcement Oracle check on a wallet.
 * Returns allow/require_escrow/block verdict with economic context.
 */
export async function enforceCheck(wallet: string, payee?: string): Promise<void> {
  console.log(chalk.cyan(`\n⚖️  SAID Enforcement Oracle Check\n`));

  try {
    const [verifyRes, enforcementRes] = await Promise.all([
      fetch(`${API_BASE}/api/verify/${wallet}`),
      fetch(`${API_BASE}/api/enforcement/${wallet}`),
    ]);

    const verifyData = verifyRes.ok ? await verifyRes.json() as any : {};
    const enforcementData = enforcementRes.ok ? await enforcementRes.json() as any : {};

    const registered = verifyData.registered ?? false;
    const score = verifyData.reputationScore ?? verifyData.score ?? 0;
    const verified = verifyData.verified ?? false;
    const staked = enforcementData.staked ?? false;
    const stakeSOL = enforcementData.stakeAmountSol ?? 0;
    const slashedCount = enforcementData.slashedCount ?? 0;

    let action: string;
    let actionColor: (s: string) => string;
    let escrowPct = 0;
    let maxTxUSDC = 10000;

    if (!registered || (!staked && score < 20)) {
      action = 'BLOCK';
      actionColor = chalk.red;
      escrowPct = 100;
      maxTxUSDC = 0;
    } else if (slashedCount >= 3 || (score < 40 && !staked)) {
      action = 'REQUIRE_ESCROW';
      actionColor = chalk.yellow;
      escrowPct = 80;
      maxTxUSDC = 100;
    } else if (staked && verified && score >= 75 && slashedCount === 0) {
      action = 'ALLOW';
      actionColor = chalk.green;
      escrowPct = 0;
      maxTxUSDC = 10000;
    } else {
      action = 'REQUIRE_ESCROW';
      actionColor = chalk.yellow;
      escrowPct = Math.max(10, 50 - Math.floor(stakeSOL * 5));
      maxTxUSDC = Math.max(100, Math.floor(score * 50));
    }

    console.log(chalk.white(`  Payer:    ${wallet.slice(0, 8)}...${wallet.slice(-4)}`));
    if (payee) {
      console.log(chalk.white(`  Payee:    ${payee.slice(0, 8)}...${payee.slice(-4)}`));
    }
    console.log(chalk.white(`  ${actionColor('━━ ACTION: ' + action + ' ━━')}`));
    console.log(chalk.white(`  Score:          ${score}/100`));
    console.log(chalk.white(`  Staked:         ${staked ? stakeSOL.toFixed(4) + ' SOL' : 'None'}`));
    console.log(chalk.white(`  Slashed:        ${slashedCount > 0 ? slashedCount + 'x' : 'Clean'}`));
    console.log(chalk.white(`  Verified:       ${verified ? '✅' : '❌'}`));

    if (action === 'BLOCK') {
      console.log(chalk.red(`\n  🚫 Payment BLOCKED — agent is untrusted or unregistered`));
      console.log(chalk.gray(`     Reason: ${!registered ? 'Not registered' : 'Score too low + no stake'}`));
    } else if (action === 'REQUIRE_ESCROW') {
      console.log(chalk.yellow(`\n  ⚠️  Escrow required — ${escrowPct}% of transaction`));
      console.log(chalk.gray(`     Max recommended: $${maxTxUSDC} USDC`));
    } else {
      console.log(chalk.green(`\n  ✅ Payment ALLOWED — agent is trusted`));
      console.log(chalk.gray(`     No escrow needed. Max: $${maxTxUSDC} USDC`));
    }

    console.log(chalk.gray(`\n  Deploy this as middleware:`));
    console.log(chalk.gray(`  import { createX402Oracle } from '@said-protocol/client/enforcement-oracle'`));
    console.log(chalk.gray(`  Profile: https://www.saidprotocol.com/agent.html?wallet=${wallet}\n`));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  ❌ Failed: ${msg}\n`));
  }
}

/**
 * Trust Oracle check for ERC-8183 marketplace flows.
 * Evaluates whether an agent can be trusted for commerce transactions.
 */
export async function trustOracleCheck(wallet: string): Promise<void> {
  console.log(chalk.cyan(`\n🔮 SAID Trust Oracle — ERC-8183 Evaluator\n`));

  try {
    const [verifyRes, enforcementRes] = await Promise.all([
      fetch(`${API_BASE}/api/verify/${wallet}`),
      fetch(`${API_BASE}/api/enforcement/${wallet}`),
    ]);

    const verifyData = verifyRes.ok ? await verifyRes.json() as any : {};
    const enforcementData = enforcementRes.ok ? await enforcementRes.json() as any : {};

    const registered = verifyData.registered ?? false;
    if (!registered) {
      console.log(chalk.yellow(`  ⚠️  Agent not registered. Cannot evaluate.\n`));
      return;
    }

    const score = verifyData.reputationScore ?? verifyData.score ?? 0;
    const verified = verifyData.verified ?? false;
    const staked = enforcementData.staked ?? false;
    const stakeSOL = enforcementData.stakeAmountSol ?? 0;
    const slashedCount = enforcementData.slashedCount ?? 0;
    const feedbackCount = verifyData.feedbackCount ?? 0;

    // ERC-8183 evaluation criteria
    const criteria = {
      deliverable_exists: score > 0,
      claim_substantive: feedbackCount >= 3,
      provider_trust_minimum: score >= 40,
      provider_staked: staked,
      clean_slash_history: slashedCount === 0,
      evidence_provided: feedbackCount >= 1,
    };

    const passed = Object.values(criteria).filter(Boolean).length;
    const total = Object.keys(criteria).length;

    let evaluation: string;
    let evalColor: (s: string) => string;

    if (passed >= 5 && score >= 75 && staked) {
      evaluation = 'PASS';
      evalColor = chalk.green;
    } else if (passed >= 3 && score >= 40) {
      evaluation = 'PARTIAL';
      evalColor = chalk.yellow;
    } else {
      evaluation = 'FAIL';
      evalColor = chalk.red;
    }

    console.log(chalk.white(`  Agent:    ${wallet.slice(0, 8)}...${wallet.slice(-4)}`));
    console.log(chalk.white(`  ${evalColor('━━ EVALUATION: ' + evaluation + ' ━━')}`));
    console.log(chalk.white(`  Criteria: ${passed}/${total} passed\n`));

    for (const [criterion, result] of Object.entries(criteria)) {
      const icon = result ? '✅' : '❌';
      const label = criterion.replace(/_/g, ' ');
      console.log(chalk.white(`  ${icon} ${label}`));
    }

    if (evaluation === 'PASS') {
      console.log(chalk.green(`\n  → Release 100% escrow`));
      console.log(chalk.gray(`  → Agent is trustworthy for ERC-8183 commerce`));
    } else if (evaluation === 'PARTIAL') {
      console.log(chalk.yellow(`\n  → Release 50% escrow, hold 50%`));
      console.log(chalk.gray(`  → Agent has some trust signals but needs more history`));
    } else {
      console.log(chalk.red(`\n  → Refund payer, do not release`));
      if (staked && slashedCount === 0) {
        console.log(chalk.gray(`  → Consider slashing recommendation: 10-25%`));
      }
    }

    console.log(chalk.gray(`\n  SDK: import { TrustOracle } from '@said-protocol/client/trust-oracle'`));
    console.log(chalk.gray(`  Profile: https://www.saidprotocol.com/agent.html?wallet=${wallet}\n`));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  ❌ Failed: ${msg}\n`));
  }
}
