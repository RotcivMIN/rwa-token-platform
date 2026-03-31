# RWAG — RWA ETF Tokenization Platform

> **QF5208 Tokenization in Financial Services** — NUS AY2025/26 Semester 2 Course Project

A full-stack RWA (Real World Asset) ETF tokenization platform demonstrating compliant digital securities issuance on Ethereum. Built on [Scaffold-ETH 2](https://scaffoldeth.io).

## Features

- **ERC-20 Token** with whitelist-gated transfers (KYC compliance)
- **tryTransfer()** — soft-fail transfers that log blocked attempts on-chain (audit trail)
- **Mint / Burn** — restricted to admin, modeling real-world creation/redemption
- **Pausable** — emergency circuit breaker for all token operations
- **Dashboard** — total supply, holder distribution, whitelist status
- **Transaction Log** — transfers, mints, burns, and blocked events in one view

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity 0.8.30, OpenZeppelin v5, Hardhat |
| Frontend | Next.js 15, React 19, wagmi, viem, DaisyUI |
| Network | Ethereum Sepolia Testnet |
| RPC | Infura (primary) + Alchemy (fallback) |
| Framework | Scaffold-ETH 2 |

## Contract

- **Address**: [`0xd595461EAfBfcfCa68b81e95a5AEf79356A4705C`](https://sepolia.etherscan.io/address/0xd595461EAfBfcfCa68b81e95a5AEf79356A4705C) (Sepolia)
- **Token**: RWAG (RWA Gold ETF Token)
- **Tests**: 19 test cases across 6 categories, 100% passing

## Quick Start

```bash
# Install dependencies
yarn install

# Start local dev
yarn chain        # Terminal 1: local Hardhat node
yarn deploy       # Terminal 2: deploy contracts
yarn start        # Terminal 3: Next.js dev server at localhost:3000
```

## Project Structure

```
packages/
├── hardhat/
│   ├── contracts/    # RWAToken.sol + IRWAToken.sol
│   ├── deploy/       # Deployment scripts
│   └── test/         # 19 test cases
└── nextjs/
    ├── app/          # Pages: dashboard, whitelist, mint-burn, transactions, transfer
    ├── components/   # Header, RainbowKit connect button
    └── hooks/        # useRWAToken, useWhitelist, useMintBurn, useTransactionLog
```

## License

MIT

> [!NOTE]
> 🤖 Scaffold-ETH 2 is AI-ready! It has everything agents need to build on Ethereum. Check `.agents/`, `.claude/`, `.opencode` or `.cursor/` for more info.

Built on [Scaffold-ETH 2](https://github.com/scaffold-eth/scaffold-eth-2).
