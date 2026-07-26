"""
Solana tools for nanobot agents with SAID identity and economic enforcement.
"""

import json
import os
import urllib.request
from pathlib import Path

try:
    from solana.rpc.api import Client
    from solders.pubkey import Pubkey
    SOLANA_AVAILABLE = True
except ImportError:
    SOLANA_AVAILABLE = False

# Load SAID identity
def load_said_identity():
    """Load the agent's SAID identity from said.json"""
    said_path = Path(__file__).parent.parent / "said.json"
    if said_path.exists():
        with open(said_path) as f:
            return json.load(f)
    return None

# Load wallet
def load_wallet():
    """Load the agent's wallet from wallet.json"""
    wallet_path = Path(__file__).parent.parent / "wallet.json"
    if wallet_path.exists():
        with open(wallet_path) as f:
            return json.load(f)
    return None

SAID_IDENTITY = load_said_identity()
WALLET = load_wallet()

# RPC connection
RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
SAID_API = "https://api.saidprotocol.com"


def _fetch_json(url: str, timeout: int = 10) -> dict:
    """Fetch JSON from a URL."""
    with urllib.request.urlopen(url, timeout=timeout) as response:
        return json.loads(response.read().decode())


def get_sol_balance(wallet_address: str = None) -> dict:
    """
    Get SOL balance for a wallet address.
    If no address provided, uses the agent's own wallet.
    """
    if not SOLANA_AVAILABLE:
        return {"error": "Solana SDK not installed. Run: pip install solana"}
    
    address = wallet_address or (SAID_IDENTITY.get("wallet") if SAID_IDENTITY else None)
    if not address:
        return {"error": "No wallet address provided"}
    
    try:
        client = Client(RPC_URL)
        pubkey = Pubkey.from_string(address)
        response = client.get_balance(pubkey)
        lamports = response.value
        sol = lamports / 1_000_000_000
        
        return {
            "wallet": address,
            "balance_sol": sol,
            "balance_lamports": lamports
        }
    except Exception as e:
        return {"error": str(e)}


def get_my_identity() -> dict:
    """Get this agent's SAID identity information."""
    if not SAID_IDENTITY:
        return {"error": "SAID identity not found. Check said.json"}
    
    return {
        "name": SAID_IDENTITY.get("name"),
        "wallet": SAID_IDENTITY.get("wallet"),
        "pda": SAID_IDENTITY.get("pda"),
        "profile": SAID_IDENTITY.get("profile"),
        "status": SAID_IDENTITY.get("status", "PENDING"),
        "description": SAID_IDENTITY.get("description")
    }


def verify_agent(wallet_address: str) -> dict:
    """
    Verify another agent's SAID identity and trust score.
    
    Returns identity info, trust score, tier, and verification status.
    """
    try:
        data = _fetch_json(f"{SAID_API}/api/verify/{wallet_address}")
        return {
            "verified": True,
            "name": data.get("name"),
            "wallet": data.get("wallet"),
            "trustScore": data.get("trustScore", 0),
            "tier": data.get("tier", "unranked"),
            "isVerified": data.get("verified", False),
            "profile": f"https://www.saidprotocol.com/agent.html?wallet={wallet_address}"
        }
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {"verified": False, "error": "Agent not found in SAID registry"}
        return {"verified": False, "error": str(e)}
    except Exception as e:
        return {"verified": False, "error": str(e)}


def check_enforcement(wallet_address: str) -> dict:
    """
    Check staking/slashing enforcement data for an agent.
    
    This is SAID's unique differentiator — real economic consequences.
    Agents stake SOL as collateral and get slashed for bad behavior.
    No other agent trust protocol has economic enforcement.
    
    Returns:
        staked: SOL amount staked as collateral
        slashed: whether agent has been slashed
        slashCount: number of slash events
        enforcementTier: economic | reputation | none
        hasSkinInTheGame: whether agent has staked collateral
    """
    try:
        data = _fetch_json(f"{SAID_API}/api/enforcement/{wallet_address}")
        staked = data.get("stakedAmount", data.get("staked", 0))
        slash_count = data.get("slashCount", 0)
        slashed = data.get("slashed", slash_count > 0)
        tier = data.get("enforcementTier", "economic" if staked > 0 else "none")
        
        return {
            "wallet": wallet_address,
            "staked": staked,
            "slashed": slashed,
            "slashCount": slash_count,
            "enforcementTier": tier,
            "hasSkinInTheGame": staked > 0,
        }
    except Exception as e:
        return {"error": str(e)}


def trust_gate(wallet_address: str, amount_usd: float = None) -> dict:
    """
    Run a trust gate check on an agent before transacting.
    
    Combines identity verification + enforcement data + risk assessment
    into a single allow/deny/review verdict with escrow recommendations.
    
    Args:
        wallet_address: Agent's Solana wallet address
        amount_usd: Transaction amount in USDC (optional, for tailored advice)
    
    Returns:
        verdict: allow | review | deny
        riskLevel: minimal | low | moderate | elevated | high | critical
        escrowPercent: recommended escrow hold %
        maxTxValueUSDC: max recommended transaction value
    """
    try:
        url = f"{SAID_API}/api/risk/{wallet_address}"
        data = _fetch_json(url)
        
        risk = data.get("riskLevel", "unknown")
        risk_to_verdict = {
            "low": "allow",
            "minimal": "allow",
            "moderate": "review",
            "elevated": "deny",
            "high": "deny",
            "critical": "deny",
        }
        verdict = risk_to_verdict.get(risk, "review")
        
        result = {
            "wallet": wallet_address,
            "verdict": verdict,
            "riskLevel": risk,
            "escrowPercent": data.get("escrowPercent", 100 if verdict == "deny" else 0),
            "maxTxValueUSDC": data.get("maxTxValueUSDC", 10 if verdict == "deny" else 1000),
        }
        
        if amount_usd:
            result["requestedAmount"] = amount_usd
            result["withinLimit"] = amount_usd <= result["maxTxValueUSDC"]
        
        return result
    except Exception as e:
        return {"error": str(e)}


# Tool definitions for nanobot
TOOLS = [
    {
        "name": "get_sol_balance",
        "description": "Get SOL balance for a Solana wallet. If no address provided, returns your own balance.",
        "function": get_sol_balance,
        "parameters": {
            "type": "object",
            "properties": {
                "wallet_address": {
                    "type": "string",
                    "description": "Solana wallet address (optional, defaults to own wallet)"
                }
            }
        }
    },
    {
        "name": "get_my_identity", 
        "description": "Get your SAID identity information including wallet, PDA, and profile link.",
        "function": get_my_identity,
        "parameters": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "verify_agent",
        "description": "Verify another agent's SAID identity and trust score by wallet address.",
        "function": verify_agent,
        "parameters": {
            "type": "object",
            "properties": {
                "wallet_address": {
                    "type": "string",
                    "description": "The Solana wallet address to verify"
                }
            },
            "required": ["wallet_address"]
        }
    },
    {
        "name": "check_enforcement",
        "description": "Check staking/slashing enforcement data for an agent. Shows if they have real SOL collateral at stake (skin-in-the-game) and whether they've been slashed.",
        "function": check_enforcement,
        "parameters": {
            "type": "object",
            "properties": {
                "wallet_address": {
                    "type": "string",
                    "description": "The Solana wallet address to check"
                }
            },
            "required": ["wallet_address"]
        }
    },
    {
        "name": "trust_gate",
        "description": "Run a trust gate check before transacting with an agent. Returns allow/deny/review verdict with escrow recommendations. Combines identity + enforcement + risk assessment.",
        "function": trust_gate,
        "parameters": {
            "type": "object",
            "properties": {
                "wallet_address": {
                    "type": "string",
                    "description": "The Solana wallet address to check"
                },
                "amount_usd": {
                    "type": "number",
                    "description": "Transaction amount in USDC (optional, for tailored escrow advice)"
                }
            },
            "required": ["wallet_address"]
        }
    }
]
