# ZK Dark Pool

A privacy-preserving prediction market platform built on the Aleo blockchain using zero-knowledge proofs.

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Solution](#solution)
4. [Key Features](#key-features)
5. [Real-World Use Cases](#real-world-use-cases)
6. [Technology Stack](#technology-stack)
7. [System Architecture](#system-architecture)
8. [Functional Requirements](#functional-requirements)
9. [Smart Contract Design](#smart-contract-design)
10. [Getting Started](#getting-started)
11. [Deployment](#deployment)
12. [Security Considerations](#security-considerations)
13. [License](#license)

---

## Overview

ZK Dark Pool is a decentralized prediction market platform that leverages zero-knowledge cryptography to enable private betting. Unlike traditional prediction markets where all bets are publicly visible on-chain, ZK Dark Pool encrypts individual positions while maintaining verifiable aggregate pool data.

Users can bet on binary outcomes (YES/NO) for various markets without revealing their position, bet size, or strategy to other participants. Only after market resolution can winners prove their ownership and claim winnings through cryptographic proofs.

---

## Problem Statement

### Traditional Prediction Markets

Existing blockchain-based prediction markets suffer from critical privacy issues:

1. **Position Exposure**: All bets are publicly visible, allowing sophisticated actors to front-run or copy successful traders.

2. **Strategy Leakage**: Large institutional players cannot participate without revealing their positions, which can move markets against them.

3. **Manipulation Vulnerability**: Visible order books enable market manipulation through fake signals and wash trading.

4. **Privacy Concerns**: Users may not want their predictions on sensitive topics (political, financial) to be publicly associated with their wallet addresses.

5. **Information Asymmetry**: Early movers are disadvantaged as later participants can see all existing positions before betting.

### The Dark Pool Concept

In traditional finance, dark pools are private exchanges where institutional investors trade large blocks without revealing their intentions to the public market. ZK Dark Pool brings this concept to prediction markets using cryptographic privacy.

---

## Solution

ZK Dark Pool solves these problems by implementing:

1. **Encrypted Bet Records**: Individual bets are stored as private records that only the owner can decrypt using their wallet's view key.

2. **Aggregate Transparency**: While individual positions are hidden, total pool sizes for YES and NO outcomes remain publicly visible for market price discovery.

3. **Zero-Knowledge Claims**: Winners prove ownership of winning bets without revealing their original bet details using ZK-SNARKs.

4. **On-Chain Privacy**: All privacy is enforced at the protocol level through Aleo's native encryption, not through trusted intermediaries.

---

## Key Features

### Privacy-First Design
- Bet amounts and outcomes are encrypted on-chain
- Only wallet owners can view their own positions
- Aggregate pool data visible for price discovery

### Trustless Operation
- No central authority controls funds
- Smart contract enforces all rules
- Permissionless market creation

### Zero-Knowledge Proofs
- Winners claim without revealing bet details
- Cryptographic verification of ownership
- No trusted setup required (using Aleo's Marlin)

### User Experience
- Wallet integration with Leo Wallet
- Real-time market data from blockchain
- Mobile-responsive interface

---

## Real-World Use Cases

### 1. Political Prediction Markets
Users can bet on election outcomes without publicly associating their political views with their wallet address. This protects voter privacy while enabling accurate forecasting.

### 2. Corporate Event Predictions
Employees or investors can bet on company milestones (product launches, earnings) without revealing insider positions that could trigger regulatory scrutiny.

### 3. Sports Betting
Bettors can place wagers without revealing their strategy to bookmakers who might adjust odds against them.

### 4. Financial Market Predictions
Traders can express views on asset prices, interest rates, or economic indicators without front-running risk.

### 5. Scientific and Research Predictions
Researchers can bet on experimental outcomes or paper replication without bias from knowing others' predictions.

### 6. Insurance and Risk Markets
Privacy-preserving markets for hedging personal or business risks without exposing vulnerability information.

---

## Technology Stack

### Blockchain Layer
| Component | Technology | Purpose |
|-----------|------------|---------|
| Network | Aleo Testnet | Privacy-focused L1 blockchain |
| Smart Contracts | Leo Language | ZK circuit compilation |
| Consensus | AleoBFT | Proof-of-stake consensus |
| Cryptography | Marlin ZK-SNARKs | Zero-knowledge proofs |

### Backend Layer
| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js (Vercel Serverless) | API execution |
| Database | MongoDB Atlas | Persistent question index |
| API | Express.js | Request handling |

### Frontend Layer
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 18 | UI component library |
| Build Tool | Vite | Fast development server |
| Routing | React Router v6 | SPA navigation |
| Styling | CSS Variables | Theming and dark mode |
| Hosting | Vercel | Global CDN |

### Wallet Integration
| Component | Technology | Purpose |
|-----------|------------|---------|
| Adapter | @demox-labs/aleo-wallet-adapter | Wallet connection |
| Wallet | Leo Wallet | Browser extension |
| Network | TestnetBeta | Development network |

### APIs and Services
| Component | Technology | Purpose |
|-----------|------------|---------|
| RPC | Provable API | Blockchain queries |
| Explorer | Provable Explorer | Transaction verification |

---

## System Architecture

```
+------------------------------------------------------------------+
|                         USER INTERFACE                            |
|  +------------------------------------------------------------+  |
|  |                    React Frontend (Vite)                    |  |
|  |  +------------+  +------------+  +------------+  +--------+ |  |
|  |  |  Markets   |  |  Create    |  | Portfolio  |  | Wallet | |  |
|  |  |   Page     |  |  Market    |  |   Page     |  | Button | |  |
|  |  +------------+  +------------+  +------------+  +--------+ |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
    |                                           |
    v                                           v
+-----------------------+           +-----------------------------+
|   WALLET INTEGRATION  |           |      BACKEND SERVICES       |
|  (Leo Wallet Adapter) |           |   (Vercel / Node.js API)    |
|                       |           |                             |
|  +-----------------+  |           |  +-----------------------+  |
|  | Sign / Decrypt  |  |           |  |   Indexer Endpoints   |  |
|  +-----------------+  |           |  | - POST /index         |  |
+-----------------------+           |  | - GET /questions      |  |
    |                               |  +-----------------------+  |
    v                               +-----------------------------+
+-----------------------+                       |
|    ALEO BLOCKCHAIN    |                       v
| (dark_pool_market.aleo)|          +-----------------------------+
|                       |           |          DATABASE           |
|  +-----------------+  |           |      (MongoDB Atlas)        |
|  | Public Mappings |  |           |                             |
|  | Private Records |  |           |  +-----------------------+  |
|  +-----------------+  |           |  |   Questions Index     |  |
+-----------------------+           |  |   Hash -> Details     |  |
    |                               |  +-----------------------+  |
    v                               +-----------------------------+
+-----------------------+
|   EXTERNAL SERVICES   |
| (Provable API / Expl) |
+-----------------------+

```

### Data Flow

1. **Market Creation**
   - User submits market parameters through frontend
   - Leo Wallet signs transaction
   - Transaction broadcast to Aleo network
   - Market stored in public `markets` mapping
   - Pool initialized in public `pools` mapping

2. **Placing Bets**
   - User selects outcome and amount
   - Frontend builds transaction with encrypted inputs
   - Leo Wallet signs and submits
   - Private `Bet` record created (only owner can decrypt)
   - Pool totals updated publicly

3. **Market Resolution**
   - Creator calls resolve with winning outcome
   - Market marked as resolved in mapping
   - Winning outcome stored publicly

4. **Claiming Winnings**
   - Winner provides encrypted Bet record
   - ZK proof verifies ownership and winning outcome
   - Winnings transferred without revealing bet details

---

## Functional Requirements

### FR-1: Market Management
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Users can create binary prediction markets | High |
| FR-1.2 | Markets have configurable resolution block height | High |
| FR-1.3 | Only market creator can resolve the market | High |
| FR-1.4 | Markets display aggregate YES/NO pool sizes | High |

### FR-2: Betting Operations
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | Users can place encrypted bets on YES or NO | High |
| FR-2.2 | Bet amounts are hidden from other users | High |
| FR-2.3 | Users can view their own bet history | High |
| FR-2.4 | Minimum bet amount enforced by contract | Medium |

### FR-3: Claiming and Settlement
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Winners can claim proportional winnings | High |
| FR-3.2 | Claims verified through ZK proofs | High |
| FR-3.3 | Losing bets cannot be claimed | High |

### FR-4: Wallet Integration
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | Support Leo Wallet browser extension | High |
| FR-4.2 | Auto-reconnect on page refresh | Medium |
| FR-4.3 | Display wallet balance and address | Medium |
| FR-4.4 | Handle transaction errors gracefully | High |

### FR-5: User Interface
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | Responsive design for mobile and desktop | High |
| FR-5.2 | Dark and light theme support | Low |
| FR-5.3 | Real-time market data updates | Medium |
| FR-5.4 | Transaction status feedback | High |

---

## Smart Contract Design

### Program: dark_pool_market.aleo

#### Data Structures

```leo
struct MarketInfo {
    creator: address,
    resolution_height: u32,
    resolved: bool,
    winning_outcome: u8
}

struct PoolState {
    total_yes: u64,
    total_no: u64,
    total_pool: u64
}

record Bet {
    owner: address,
    market_id: field,
    outcome: u8,
    amount: u64
}
```

#### Transitions

| Function | Visibility | Description |
|----------|------------|-------------|
| `create_market` | Public | Initialize new prediction market |
| `place_bet` | Private | Place encrypted bet, returns Bet record |
| `resolve_market` | Public | Set winning outcome (creator only) |
| `claim_winnings` | Private | Claim winnings with Bet record proof |

#### Mappings

| Name | Key | Value | Visibility |
|------|-----|-------|------------|
| `markets` | field | MarketInfo | Public |
| `pools` | field | PoolState | Public |

---

## Getting Started

### Prerequisites

- Node.js 20 or higher
- Leo Wallet browser extension
- ALEO tokens on Testnet (for transaction fees)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd zk-dark-pool

# Install frontend dependencies
cd Aleo/frontend
npm install

# Start development server
npm run dev
```

### Configuration

The application is configured in `src/config.js`:

```javascript
export const ALEO_CONFIG = {
    network: 'testnet',
    rpcUrl: 'https://api.explorer.provable.com/v1',
    programId: 'dark_pool_market.aleo',
    fees: {
        createMarket: 500000,
        placeBet: 100000,
        resolveMarket: 100000,
        claimWinnings: 100000,
    }
}
```

---

## Deployment

### 1. Database (MongoDB Atlas)
- Create a Cluster (M0 Free Tier).
- Create a Database User.
- Whitelist IP `0.0.0.0/0` (Network Access).
- Get Connection String.

### 2. Backend (Vercel)
- **Framework Preset**: Other
- **Root Directory**: `backend`
- **Environment Variables**:
    - `MONGODB_URI`: Your MongoDB Connection String.

### 3. Frontend (Vercel)
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Environment Variables**:
    - `VITE_INDEXER_URL`: The URL of your deployed Backend (e.g., `https://project-backend.vercel.app`).

### Smart Contract
The Leo program is deployed on Aleo Testnet:
- Program ID: `dark_pool_market.aleo`
- Network: Testnet

---

## Security Considerations

### Cryptographic Security
- All private data encrypted using Aleo's native encryption
- ZK proofs generated client-side in the wallet
- No trusted third parties for privacy

### Smart Contract Security
- Immutable once deployed
- All state transitions verified by network
- No admin keys or upgrade mechanisms

### Frontend Security
- No private keys stored in browser
- All signing done in Leo Wallet
- HTTPS required for production

### Operational Security
- Test thoroughly on testnet before mainnet
- Start with small amounts
- Verify transaction details in wallet

---

## Project Structure

```
ZK-Dark-Pool/
├── Leo Programs/             # Aleo Smart Contracts
│   ├── dark_pool_market/
│   │   ├── src/
│   │   │   └── main.leo
│   │   └── program.json
├── frontend/                 # React Application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route pages
│   │   ├── services/         # API & Blockchain services
│   │   ├── config.js         # App configuration
│   │   └── main.jsx          # Entry point
│   └── vite.config.js
└── backend/                  # Express API (Serverless)
    ├── server.js             # API Logic (Mongoose)
    ├── vercel.json           # Vercel Configuration
    └── package.json
```

---

## License

This project is open source and available under the MIT License.

---

## Links

- Aleo Documentation: https://developer.aleo.org/
- Leo Language: https://leo-lang.org/
- Leo Wallet: https://leo.app/
- Provable Explorer: https://testnet.explorer.provable.com/
