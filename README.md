# ZK Dark Pool

A privacy-preserving prediction market platform built on the Aleo blockchain using zero-knowledge proofs.

## Overview

ZK Dark Pool is a decentralized prediction market that allows users to bet on binary outcomes (YES/NO) while keeping their individual positions completely hidden through zero-knowledge cryptography. Unlike traditional prediction markets where all bets are publicly visible on-chain, ZK Dark Pool encrypts individual positions while maintaining verifiable aggregate pool data.

## How It Works

### Privacy Model

| What's Public | What's Private |
|---------------|----------------|
| Market question (hash on-chain) | Individual bet amounts |
| Total YES pool size | Individual bet outcomes |
| Total NO pool size | Bettor identities |
| Market creator address | Bet records (encrypted) |
| Resolution outcome | Claiming process details |

### User Flow

1. **Create Market**: Users submit a prediction question. The question text is stored in PostgreSQL, a hash is stored on-chain.
2. **Place Bets**: Bets are encrypted as Aleo "records" - only the bettor can see their position.
3. **Market Resolution**: Only the creator can resolve when the resolution block height is reached.
4. **Claim Winnings**: Winners prove ownership via ZK proof without revealing bet details.

## Technology Stack

- **Frontend**: React 18 + Vite (port 5000)
- **Backend**: Node.js + Express API (port 3001)
- **Database**: PostgreSQL for question text indexing
- **Blockchain**: Aleo Testnet
- **Smart Contract**: Leo Language (`dark_pool_marketv2.aleo`)
- **Wallet**: Leo Wallet browser extension

## Project Structure

```
ZK-Dark-Pool/
├── Leo Programs/             # Aleo Smart Contracts
│   └── src/main.leo          # dark_pool_marketv2.aleo
├── frontend/                 # React Application
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── pages/            # Route pages
│   │   ├── services/         # AleoService, IPFSService
│   │   └── config.js         # Aleo configuration
│   └── vite.config.js
└── backend/                  # Express API
    └── server.js             # PostgreSQL-backed question indexer
```

## Smart Contract

The Leo smart contract (`dark_pool_marketv2.aleo`) provides:

### Records (Private State)
- `Bet` - Encrypted bet owned by user (market_id, outcome, amount)
- `WinClaim` - Proof of winning claim

### Structs (Public State)
- `MarketInfo` - Market metadata (creator, resolution_height, resolved, winning_outcome)
- `PoolState` - Aggregate pool totals (total_yes, total_no, total_pool)

### Transitions
- `create_market(market_id, resolution_height, question_hash)` - Create new market
- `place_bet(market_id, outcome, amount)` - Place encrypted bet
- `resolve_market(market_id, winning_outcome)` - Resolve market (creator only)
- `claim_winnings(bet)` - Claim winnings with ZK proof

## Running Locally

### Prerequisites
- Node.js 20+
- Leo Wallet browser extension
- ALEO tokens on Testnet

### Installation

```bash
# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd backend && npm install
```

### Development

The application runs with two workflows:
1. **Backend API** (port 3001): Question indexing via PostgreSQL
2. **Frontend** (port 5000): React application with Vite

Both start automatically in Replit.

## Data Flow

### When Creating a Market

1. User enters question in frontend
2. Frontend generates market ID from question hash
3. Frontend uploads to IPFS (optional) and gets hash
4. User signs transaction with Leo Wallet
5. Transaction submitted to Aleo blockchain
6. Question text saved to PostgreSQL via `/api/index`
7. Market appears in listing with question text

### Why Some Markets Show "Market #ID"

Markets created before the indexing system was set up don't have their question text stored. The blockchain only stores a hash, not the full text. To fix:

1. Click "Track Existing" on the Markets page
2. Enter the Market ID and original question
3. Click "Add Market"

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/index` | POST | Index a market question |
| `/api/questions` | GET | Get all indexed questions |
| `/api/question/:marketId` | GET | Get question by market ID |
| `/api/health` | GET | Health check |

## Security

- All private data encrypted using Aleo's native encryption
- ZK proofs generated client-side in the wallet
- No private keys stored in browser
- All signing done in Leo Wallet
- No trusted third parties for privacy

## Links

- [Aleo Documentation](https://developer.aleo.org/)
- [Leo Language](https://leo-lang.org/)
- [Leo Wallet](https://leo.app/)
- [Provable Explorer](https://testnet.explorer.provable.com/)

## License

MIT License
