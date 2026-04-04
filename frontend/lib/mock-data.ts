import { Transaction, Rule, Agent, ScanEntry } from "./types"

export const mockTransactions: Transaction[] = [
  {
    id: "1",
    status: "approved",
    description: "Swap USDC → ETH on Uniswap V3",
    agent: "Trading bot",
    amount: "$142.50",
    amountUsd: 142.50,
    time: "2 min ago",
    tier: "auto",
    to: "Uniswap V3 Router",
    from: "0x1a2b...9f3e",
    network: "Ethereum Mainnet",
    gas: "$2.40",
    contractVerified: true,
    aiAssessment: {
      riskScore: 2,
      riskLevel: "low",
      checks: [
        { label: "Uniswap V3 Router is a verified, whitelisted contract", passed: true },
        { label: "Transaction amount within daily limit ($500/$500)", passed: true },
        { label: "Standard swap calldata, no unusual function selectors", passed: true },
        { label: "No PII detected in calldata", passed: true },
      ]
    }
  },
  {
    id: "2",
    status: "approved",
    description: "Transfer to 0x8f2a...3b1c",
    agent: "Manual",
    amount: "$45.00",
    amountUsd: 45.00,
    time: "18 min ago",
    tier: "auto",
    to: "0x8f2a...3b1c",
    from: "0x1a2b...9f3e",
    network: "Ethereum Mainnet",
    gas: "$1.80",
    contractVerified: false,
    aiAssessment: {
      riskScore: 8,
      riskLevel: "low",
      checks: [
        { label: "Address is in your whitelist", passed: true },
        { label: "Amount under per-transaction limit", passed: true },
        { label: "No smart contract interaction", passed: true },
      ]
    }
  },
  {
    id: "3",
    status: "confirmed",
    description: "Send 1.2 ETH to new address",
    agent: "DeFi manager",
    amount: "$2,847.60",
    amountUsd: 2847.60,
    time: "1h ago",
    tier: "confirmed",
    to: "0x8f2a...3b1c",
    from: "0x1a2b...9f3e",
    network: "Ethereum Mainnet",
    gas: "$3.20",
    contractVerified: false,
    aiAssessment: {
      riskScore: 45,
      riskLevel: "medium",
      checks: [
        { label: "New address - not previously used", passed: false },
        { label: "Amount above $1,000 threshold", passed: false },
        { label: "Address not found in scam databases", passed: true },
        { label: "No smart contract interaction", passed: true },
      ]
    }
  },
  {
    id: "4",
    status: "blocked",
    description: "Approve unlimited USDT spending",
    agent: "Trading bot",
    amount: "∞",
    amountUsd: 0,
    time: "3h ago",
    tier: "blocked",
    to: "Unknown Contract",
    from: "0x1a2b...9f3e",
    network: "Ethereum Mainnet",
    gas: "$4.50",
    contractVerified: false,
    aiAssessment: {
      riskScore: 95,
      riskLevel: "high",
      checks: [
        { label: "Unlimited token approval detected", passed: false },
        { label: "Contract not verified on Etherscan", passed: false },
        { label: "Hard-blocked by policy: Block unlimited approvals", passed: false },
      ]
    }
  },
  {
    id: "5",
    status: "approved",
    description: "Deposit 500 USDC to Aave V3",
    agent: "DeFi manager",
    amount: "$500.00",
    amountUsd: 500,
    time: "5h ago",
    tier: "auto",
    to: "Aave V3 Pool",
    from: "0x1a2b...9f3e",
    network: "Ethereum Mainnet",
    gas: "$3.10",
    contractVerified: true,
    aiAssessment: {
      riskScore: 4,
      riskLevel: "low",
      checks: [
        { label: "Aave V3 Pool is a verified, whitelisted protocol", passed: true },
        { label: "Standard supply() calldata, no anomaly detected", passed: true },
        { label: "Amount within configured daily limit", passed: true },
        { label: "No PII in calldata", passed: true },
      ]
    }
  },
  {
    id: "6",
    status: "approved",
    description: "Swap 0.05 WETH → USDC on 1inch",
    agent: "Trading bot",
    amount: "$118.40",
    amountUsd: 118.40,
    time: "6h ago",
    tier: "auto",
    to: "1inch Router V5",
    from: "0x1a2b...9f3e",
    network: "Ethereum Mainnet",
    gas: "$2.70",
    contractVerified: true,
    aiAssessment: {
      riskScore: 6,
      riskLevel: "low",
      checks: [
        { label: "1inch Router V5 is allowlisted", passed: true },
        { label: "Swap amount within daily limit", passed: true },
        { label: "No unusual selectors in calldata", passed: true },
      ]
    }
  },
  {
    id: "7",
    status: "confirmed",
    description: "Borrow 1000 USDC from Compound",
    agent: "DeFi manager",
    amount: "$1,000.00",
    amountUsd: 1000,
    time: "8h ago",
    tier: "confirmed",
    to: "Compound cUSDC",
    from: "0x1a2b...9f3e",
    network: "Ethereum Mainnet",
    gas: "$5.20",
    contractVerified: true,
    aiAssessment: {
      riskScore: 52,
      riskLevel: "medium",
      checks: [
        { label: "Compound cUSDC is an approved protocol", passed: true },
        { label: "Amount above $500 confirmation threshold", passed: false },
        { label: "First borrow from this contract this week", passed: false },
        { label: "No unusual function selectors", passed: true },
      ]
    }
  },
  {
    id: "8",
    status: "blocked",
    description: "Transfer to sanctioned address",
    agent: "Trading bot",
    amount: "$340.00",
    amountUsd: 340,
    time: "Yesterday",
    tier: "blocked",
    to: "0x7f9e...2d4c",
    from: "0x1a2b...9f3e",
    network: "Ethereum Mainnet",
    gas: "$1.90",
    contractVerified: false,
    aiAssessment: {
      riskScore: 98,
      riskLevel: "high",
      checks: [
        { label: "Destination found in OFAC sanctions list", passed: false },
        { label: "Address flagged in ChainAbuse database", passed: false },
        { label: "Hard-blocked: sanctioned counterparty", passed: false },
      ]
    }
  },
  {
    id: "9",
    status: "approved",
    description: "Stake 0.5 ETH to Lido",
    agent: "DeFi manager",
    amount: "$1,190.00",
    amountUsd: 1190,
    time: "Yesterday",
    tier: "confirmed",
    to: "Lido stETH",
    from: "0x1a2b...9f3e",
    network: "Ethereum Mainnet",
    gas: "$4.00",
    contractVerified: true,
    aiAssessment: {
      riskScore: 38,
      riskLevel: "medium",
      checks: [
        { label: "Lido stETH contract is verified", passed: true },
        { label: "Amount above $1,000 threshold — confirmation required", passed: false },
        { label: "Standard submit() calldata", passed: true },
        { label: "No PII detected", passed: true },
      ]
    }
  },
  {
    id: "10",
    status: "approved",
    description: "Gas top-up to relayer",
    agent: "Trading bot",
    amount: "$12.00",
    amountUsd: 12,
    time: "2 days ago",
    tier: "auto",
    to: "0x4d5e...7a8b",
    from: "0x1a2b...9f3e",
    network: "Ethereum Mainnet",
    gas: "$0.80",
    contractVerified: false,
    aiAssessment: {
      riskScore: 1,
      riskLevel: "low",
      checks: [
        { label: "Address is in your whitelist (Coinbase)", passed: true },
        { label: "Amount well under per-transaction limit", passed: true },
      ]
    }
  },
]

export const mockRules: Rule[] = [
  {
    id: "1",
    name: "Daily spending limit",
    description: "Auto-approve transactions under this amount per day",
    enabled: true,
    type: "limit",
    config: { limit: 500 }
  },
  {
    id: "2",
    name: "Per-transaction limit",
    description: "Require confirmation for any single transaction above this amount",
    enabled: true,
    type: "limit",
    config: { limit: 200 }
  },
  {
    id: "3",
    name: "Trusted addresses",
    description: "Auto-approve transactions to these addresses",
    enabled: true,
    type: "whitelist",
    config: { 
      addresses: [
        { address: "0x8f2a...3b1c", label: "My Ledger" },
        { address: "0x4d5e...7a8b", label: "Coinbase" },
        { address: "0x2c3d...1e2f", label: "Family wallet" },
      ] 
    }
  },
  {
    id: "4",
    name: "Approved contracts",
    description: "Allow interactions with verified DeFi protocols",
    enabled: true,
    type: "whitelist",
    config: {
      contracts: [
        { name: "Uniswap V3", enabled: true },
        { name: "Aave V3", enabled: true },
        { name: "Compound", enabled: true },
        { name: "1inch", enabled: true },
        { name: "Lido", enabled: false },
        { name: "Curve", enabled: false },
      ]
    }
  },
  {
    id: "5",
    name: "Block unlimited token approvals",
    description: "Hard-block any ERC-20 approve() with max uint256",
    enabled: true,
    type: "block",
  },
  {
    id: "6",
    name: "Strip personal data from calldata",
    description: "Remove names, emails, invoice numbers before broadcast",
    enabled: true,
    type: "custom",
  },
  {
    id: "7",
    name: "Quiet hours",
    description: "Require manual confirmation during these hours regardless of amount",
    enabled: false,
    type: "time",
    config: { from: "02:00", to: "06:00", timezone: "UTC" }
  },
]

export const mockAgents: Agent[] = [
  {
    id: "1",
    name: "Trading bot",
    ens: "trading.vanta.pranshu.eth",
    active: true,
    txnsToday: 14,
    volumeToday: 1247.50,
    blocked: 0,
    permissions: [
      { name: "Swap", allowed: true },
      { name: "Transfer", allowed: true },
      { name: "Approve", allowed: false },
      { name: "Deploy", allowed: false },
    ]
  },
  {
    id: "2",
    name: "DeFi manager",
    ens: "defi.vanta.pranshu.eth",
    active: true,
    txnsToday: 3,
    volumeToday: 3245.80,
    blocked: 1,
    permissions: [
      { name: "Swap", allowed: true },
      { name: "Transfer", allowed: true },
      { name: "Approve", allowed: false },
      { name: "Deploy", allowed: false },
    ]
  },
]

export const mockScanEntries: ScanEntry[] = [
  {
    id: "1",
    time: "14:23",
    result: "passed",
    description: "Swap 500 USDC → ETH via Uniswap V3",
    score: 2,
    checks: [
      { label: "Address verification — Uniswap V3 Router (0x68b3...a6Db) is verified on Etherscan", passed: true },
      { label: "Scam database check — not found in GoPlus, ChainAbuse", passed: true },
      { label: "Calldata analysis — standard exactInputSingle() function selector", passed: true },
      { label: "Amount analysis — $142.50, within normal pattern for this wallet", passed: true },
      { label: "PII scan — no personal data detected in calldata", passed: true },
      { label: "Behavioral check — swap amount consistent with 30-day history", passed: true },
    ]
  },
  {
    id: "2",
    time: "14:05",
    result: "passed",
    description: "Transfer 0.02 ETH to whitelisted address",
    score: 5,
    checks: [
      { label: "Address in whitelist — My Ledger (0x8f2a...3b1c)", passed: true },
      { label: "Amount under limit — $45 < $200 per-tx limit", passed: true },
    ]
  },
  {
    id: "3",
    time: "13:45",
    result: "flagged",
    description: "Send 1.2 ETH to new address",
    score: 45,
    checks: [
      { label: "New address — not in transaction history", passed: false },
      { label: "Amount above threshold — $2,847 > $1,000", passed: false },
      { label: "Scam database check — address not flagged", passed: true },
      { label: "No smart contract interaction", passed: true },
    ]
  },
  {
    id: "4",
    time: "11:20",
    result: "blocked",
    description: "Approve unlimited USDT to unknown contract",
    score: 95,
    checks: [
      { label: "Unlimited approval — max uint256 detected", passed: false },
      { label: "Contract verification — NOT verified on Etherscan", passed: false },
      { label: "Policy violation — blocked by \"Block unlimited approvals\" rule", passed: false },
    ]
  },
]

export const dashboardStats = {
  volumeProtected: 4218.50,
  threatsBlocked: 3,
  autoApproved: 14,
  tier1Count: 14,
  tier2Count: 1,
  tier3Count: 1,
}
