"""
Solana tools for nanobot agents with SAID identity.
"""

import json
import os
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

def get_sol_balance(wallet_address: str = None) -> dict:
    """
    Get SOL balance for a wallet address.
    If no address provided, uses the agent's own wallet.
    
    Args:
        wallet_address: Solana wallet address (optional)
    
    Returns:
        dict with balance info
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
    """
    Get this agent's SAID identity information.
    
    Returns:
        dict with SAID identity info
    """
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
    Verify another agent's SAID identity.
    
    Args:
        wallet_address: The wallet address to verify
    
    Returns:
        dict with verification info
    """
    import urllib.request
    import json
    
    try:
        url = f"https://api.saidprotocol.com/api/agents/{wallet_address}"
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode())
            return {
                "verified": True,
                "name": data.get("name"),
                "wallet": data.get("wallet"),
                "pda": data.get("pda"),
                "isVerified": data.get("isVerified"),
                "reputationScore": data.get("reputationScore"),
                "profile": f"https://www.saidprotocol.com/agent.html?wallet={wallet_address}"
            }
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {"verified": False, "error": "Agent not found in SAID registry"}
        return {"verified": False, "error": str(e)}
    except Exception as e:
        return {"verified": False, "error": str(e)}

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
        "description": "Verify another agent's SAID identity by their wallet address.",
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
    }
]
