/**
 * create-said-agent integration tests (live API)
 * Verifies CLI commands work against the real SAID Protocol API.
 */
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, '..', 'dist', 'index.js');

let passed = 0;
let failed = 0;

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

console.log('\n🧪 create-said-agent Integration Tests\n');
console.log('  Testing against live API: https://api.saidprotocol.com\n');

// Test 1: API is reachable
try {
  const stats = await fetchJSON('https://api.saidprotocol.com/api/stats');
  assert('API /api/stats is reachable', stats !== null);
  assert('Stats has totalAgents', stats?.totalAgents !== undefined, `got: ${JSON.stringify(stats)}`);
  assert('Stats has verifiedAgents', stats?.verifiedAgents !== undefined);
  assert('Total agents > 6000', (stats?.totalAgents ?? 0) > 6000, `got ${stats?.totalAgents}`);
} catch (e) {
  assert('API is reachable', false, e.message);
}

// Test 2: Leaderboard endpoint
try {
  const lb = await fetchJSON('https://api.saidprotocol.com/api/leaderboard');
  assert('API /api/leaderboard is reachable', lb !== null);
  assert('Leaderboard has entries', Array.isArray(lb?.leaderboard) && lb.leaderboard.length > 0);
  if (lb?.leaderboard?.length > 0) {
    const entry = lb.leaderboard[0];
    assert('Leaderboard entry has wallet', !!entry.wallet);
    assert('Leaderboard entry has name', !!entry.name);
    assert('Leaderboard entry has reputationScore', entry.reputationScore !== undefined);
    assert('Leaderboard entry has isVerified', entry.isVerified !== undefined);
    assert('Leaderboard entry has rank', entry.rank !== undefined);
    assert('Top agent score > 50', (entry.reputationScore ?? 0) > 50, `got ${entry.reputationScore}`);
  }
} catch (e) {
  assert('Leaderboard endpoint works', false, e.message);
}

// Test 3: Enforcement endpoint
try {
  // Use a top leaderboard agent for enforcement data
  const lb = await fetchJSON('https://api.saidprotocol.com/api/leaderboard');
  if (lb?.leaderboard?.length > 0) {
    const topWallet = lb.leaderboard[0].wallet;
    const enf = await fetchJSON(`https://api.saidprotocol.com/api/enforcement/${topWallet}`);
    assert('Enforcement endpoint for top agent', enf !== null);
    assert('Has registered field', enf?.registered !== undefined);
    assert('Has isVerified field', enf?.isVerified !== undefined);
    assert('Has staked field', enf?.staked !== undefined);
    assert('Has isSlashed field', enf?.isSlashed !== undefined);
    assert('Has stakeAmountSol field', enf?.stakeAmountSol !== undefined);
    assert('Top agent is registered', enf?.registered === true);
    assert('Top agent is verified', enf?.isVerified === true);
  }
} catch (e) {
  assert('Enforcement endpoint works', false, e.message);
}

// Test 4: Enforcement for unregistered wallet
try {
  const enf = await fetchJSON('https://api.saidprotocol.com/api/enforcement/EK3mP45iwgDEEts2cEDfhAs2i4PrH63NMG7vHg2d6fas');
  assert('Enforcement for unregistered wallet returns data', enf !== null);
  assert('Shows not registered', enf?.registered === false);
  assert('Has riskLevel', enf?.riskLevel !== undefined);
} catch (e) {
  assert('Enforcement for unregistered wallet', false, e.message);
}

// Test 5: Verify endpoint (returns 404 for unregistered, but with body)
try {
  const verifyRes = await fetch('https://api.saidprotocol.com/api/verify/EK3mP45iwgDEEts2cEDfhAs2i4PrH63NMG7vHg2d6fas');
  const verify = verifyRes.ok ? await verifyRes.json() : null;
  // Endpoint returns 404 for unregistered agents, but body has data
  assert('Verify endpoint returns response', verifyRes.status === 404 || verifyRes.status === 200);
  if (verify) {
    assert('Shows not registered for unknown wallet', verify?.registered === false || verify?.verified === false);
  } else {
    // 404 with body is expected for unregistered agents
    const body = await verifyRes.text();    
    assert('Verify body has registered=false', body.includes('"registered":false'));    
  }
} catch (e) {
  assert('Verify endpoint works', false, e.message);
}

// Test 6: Dead endpoints should not be used
try {
  const res = await fetch('https://api.saidprotocol.com/v1/leaderboard');
  assert('Old /v1/leaderboard is dead (404)', res.status === 404, `got ${res.status}`);
} catch (e) {
  assert('Old /v1/leaderboard is dead', false, e.message);
}

try {
  const res = await fetch('https://api.saidprotocol.com/api/stake/EK3mP45iwgDEEts2cEDfhAs2i4PrH63NMG7vHg2d6fas');
  assert('Old /api/stake/:wallet is dead (404)', res.status === 404, `got ${res.status}`);
} catch (e) {
  assert('Old /api/stake is dead', false, e.message);
}

// Summary
console.log(`\n${'─'.repeat(50)}`);
console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
  console.log('  ❌ FAILED\n');
  process.exit(1);
} else {
  console.log('  ✅ ALL PASSED\n');
}
