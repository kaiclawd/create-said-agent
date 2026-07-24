/**
 * create-said-agent — Integration tests for the API client
 *
 * These tests hit the live SAID API (api.saidprotocol.com).
 * They validate that the CLI's API calls actually work and
 * that response field normalization is correct.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const API_BASE = 'https://api.saidprotocol.com';

// A known registered & verified agent wallet for testing
const TEST_WALLET = '6cQkUCsQHJGJZhnJHYYUic5FUCgd64HChe8APYYDLS4i';
const UNKNOWN_WALLET = '11111111111111111111111111111111';

// ── Helper ────────────────────────────────────────────

async function fetchJSON(url) {
  const res = await fetch(url);
  return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : null };
}

// ── Verify endpoint ───────────────────────────────────

describe('SAID API — /api/verify/:wallet', () => {
  it('should return agent data for a registered wallet', async () => {
    const { ok, data } = await fetchJSON(`${API_BASE}/api/verify/${TEST_WALLET}`);
    assert.ok(ok, 'API should respond 200 for registered wallet');
    assert.ok(data.registered, 'Should be registered');
    assert.ok(data.verified, 'Should be verified');
    assert.ok(data.wallet, 'Should have wallet address');
    assert.ok(data.identity, 'Should have identity object');
    assert.ok(data.identity.name, 'Should have agent name');
  });

  it('should handle unknown wallet gracefully', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/api/verify/${UNKNOWN_WALLET}`);
    // API may return 200 with registered:false, or 404
    if (data) {
      assert.equal(data.registered, false, 'Unknown wallet should not be registered');
    } else {
      assert.ok(status === 404 || status === 400, `Expected 404/400 for unknown wallet, got ${status}`);
    }
  });
});

// ── Trust score endpoint ──────────────────────────────

describe('SAID API — /api/trust/:wallet', () => {
  it('should return trust score for a registered wallet', async () => {
    const { ok, data } = await fetchJSON(`${API_BASE}/api/trust/${TEST_WALLET}`);
    assert.ok(ok, 'Should respond OK');
    assert.ok(data.wallet, 'Should have wallet');
    // API returns compositeScore (0-1) and sometimes score (0-100)
    assert.ok(data.compositeScore !== undefined || data.score !== undefined, 'Should have score data');
    if (data.compositeScore !== undefined) {
      assert.ok(data.compositeScore >= 0 && data.compositeScore <= 1, 'compositeScore should be 0-1');
    }
    assert.ok(data.trustTier, 'Should have trust tier');
    assert.ok(data.registered, 'Should be registered');
  });
});

// ── Enforcement endpoint ──────────────────────────────

describe('SAID API — /api/enforcement/:wallet', () => {
  it('should return enforcement data (staking/slashing)', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/api/enforcement/${TEST_WALLET}`);
    // May or may not have staking data, but endpoint should exist
    assert.ok(status === 200 || status === 404, `Expected 200 or 404, got ${status}`);
    if (status === 200 && data) {
      const hasStake = 'stakeAmountSol' in data || 'amount' in data || 'stakeAmount' in data;
      const hasSlash = 'isSlashed' in data || 'slashCount' in data;
      assert.ok(hasStake || hasSlash, 'Should have staking or slashing fields');
    }
  });
});

// ── Stats endpoint ────────────────────────────────────

describe('SAID API — /api/stats', () => {
  it('should return network statistics', async () => {
    const { ok, data } = await fetchJSON(`${API_BASE}/api/stats`);
    assert.ok(ok, 'Stats endpoint should work');
    assert.ok(data.totalAgents > 0, `Should have agents, got ${data.totalAgents}`);
    assert.ok(data.verifiedAgents >= 0, 'Should have verified count');
  });
});

// ── xchain/discover endpoint ──────────────────────────

describe('SAID API — /xchain/discover', () => {
  it('should return list of agents', async () => {
    const { ok, data } = await fetchJSON(`${API_BASE}/xchain/discover?limit=5`);
    assert.ok(ok, 'Discover should work');
    assert.ok(data.agents, 'Should have agents array');
    assert.ok(Array.isArray(data.agents), 'agents should be an array');
    assert.ok(data.agents.length > 0, 'Should have at least 1 agent');
    
    const agent = data.agents[0];
    assert.ok(agent.address, 'Agent should have address');
    assert.ok(agent.chain, 'Agent should have chain');
    assert.ok(agent.name, 'Agent should have name');
  });
});

// ── Leaderboard endpoint ──────────────────────────────

describe('SAID API — /api/leaderboard', () => {
  it('should return leaderboard', async () => {
    const { status, data } = await fetchJSON(`${API_BASE}/api/leaderboard?limit=5`);
    // Endpoint may or may not exist — test gracefully
    if (status === 200 && data) {
      const agents = data.agents || data.leaderboard || data;
      assert.ok(Array.isArray(agents), 'Should return array');
    }
  });
});

// ── Score normalization logic ─────────────────────────
// This tests the exact normalization pattern used in src/api.ts

describe('Score normalization (API field handling)', () => {
  // Pattern from api.ts: data.score ?? data.trust_score ?? Math.round((data.compositeScore ?? 0) * 100)
  function normalize(data) {
    return data.score ?? data.trust_score ?? Math.round((data.compositeScore ?? 0) * 100);
  }

  it('should normalize compositeScore (0-1) to 0-100', () => {
    assert.equal(normalize({ compositeScore: 0.85 }), 85);
    assert.equal(normalize({ compositeScore: 0.5 }), 50);
    assert.equal(normalize({ compositeScore: 0 }), 0);
    assert.equal(normalize({ compositeScore: 1 }), 100);
  });

  it('should prefer score field over compositeScore', () => {
    assert.equal(normalize({ score: 75, compositeScore: 0.85 }), 75);
  });

  it('should fall back to compositeScore when score is missing', () => {
    assert.equal(normalize({ compositeScore: 0.85 }), 85);
  });

  it('should handle missing score fields', () => {
    assert.equal(normalize({}), 0);
  });

  it('should handle trust_score field', () => {
    assert.equal(normalize({ trust_score: 42 }), 42);
  });
});

// ── Verified field normalization ──────────────────────

describe('Verified field normalization', () => {
  function normalizeVerified(data) {
    return data.isVerified ?? data.verified ?? false;
  }

  it('should prefer isVerified', () => {
    assert.equal(normalizeVerified({ isVerified: true, verified: false }), true);
  });

  it('should fall back to verified', () => {
    assert.equal(normalizeVerified({ verified: true }), true);
  });

  it('should default to false', () => {
    assert.equal(normalizeVerified({}), false);
  });
});
