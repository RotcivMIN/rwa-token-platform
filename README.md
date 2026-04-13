# RWAG — RWA ETF Tokenization Platform

> **QF5208 Tokenization in Financial Services** — NUS AY2025/26 Semester 2 Course Project

A full-stack RWA (Real World Asset) ETF tokenization platform demonstrating compliant digital securities issuance on Ethereum. Built on [Scaffold-ETH 2](https://scaffoldeth.io). Frontend deployed on Vercel.

## Features

- **ERC-20 Token** with whitelist-gated transfers (KYC compliance)
- **Multi-Admin Management** — owner can grant/revoke admin privileges via on-chain roles
- **Decoupled Admin & Whitelist** — admin privileges and whitelist are independent; adding an admin does NOT auto-whitelist, ensuring explicit control over both permissions
- **tryTransfer()** — soft-fail transfers that log blocked attempts on-chain (audit trail)
- **Mint / Burn** — restricted to admin, modeling real-world creation/redemption
- **Pausable** — emergency circuit breaker for all token operations
- **Dashboard** — total supply, holder distribution, whitelist status
- **Admin Panel** — add/remove admins with real-time on-chain verification
- **Transaction Log** — transfers, mints, burns, and blocked events in one view

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity 0.8.30, OpenZeppelin v5, Hardhat |
| Frontend | Next.js 15, React 19, wagmi, viem, DaisyUI |
| Network | Ethereum Sepolia Testnet |
| RPC | Infura (primary) + Alchemy (fallback) |
| Hosting | Vercel |
| Framework | Scaffold-ETH 2 |

## Contract

- **Address**: [`0xaa6203B5E81E5D5680f24a5d3C106aE5112f65b6`](https://sepolia.etherscan.io/address/0xaa6203B5E81E5D5680f24a5d3C106aE5112f65b6) (Sepolia)
- **Token**: RWAG (RWA ETF Gold Token)
- **Initial Supply**: 1,000,000 RWAG
- **Tests**: 23 test cases across 7 categories, 100% passing

### Design Decisions

- **Admin ≠ Whitelist**: Admin privileges and whitelist membership are fully decoupled. When adding an admin, the operator must separately whitelist them if token transfer capability is needed. This explicit design prevents accidental privilege escalation and ensures operational clarity — removing an admin reminds operators to also review whitelist status.
- **tryTransfer()**: Returns `(bool, string)` instead of reverting, enabling on-chain audit trails for blocked transfers without breaking caller contracts.

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
│   └── test/         # 23 test cases (7 categories)
└── nextjs/
    ├── app/          # Pages: dashboard, whitelist, mint-burn, transactions, transfer, admin
    ├── components/   # Header, RainbowKit connect button
    └── hooks/        # useRWAToken, useWhitelist, useMintBurn, useTransactionLog
```

## License

MIT

Built on [Scaffold-ETH 2](https://github.com/scaffold-eth/scaffold-eth-2).
