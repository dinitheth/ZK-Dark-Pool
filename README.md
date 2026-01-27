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

- **Frontend**: React 18 + Vite
- **Backend**: Vercel Serverless Functions
- **Database**: PostgreSQL (Neon)
- **Blockchain**: Aleo Testnet Beta
- **Smart Contract**: Leo Language (`dark_pool_marketv2.aleo`)
- **Wallet**: Leo Wallet browser extension

## Deployment

This project is configured for **Vercel** deployment.

### Prerequisites

1. **Neon PostgreSQL Database** - Free tier available at [neon.tech](https://neon.tech)
2. **GitHub Repository** - Push this project to GitHub
3. **Vercel Account** - Free at [vercel.com](https://vercel.com)

### Database Setup

Run this SQL in Neon's SQL Editor to create the tables:

```sql
CREATE TABLE IF NOT EXISTS market_questions (
    market_id VARCHAR(255) PRIMARY KEY,
    question TEXT NOT NULL,
    hash VARCHAR(255),
    ipfs_cid VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS markets_cache (
    market_id VARCHAR(255) PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Vercel Deployment

1. Push this repository to GitHub
2. Go to [vercel.com](https://vercel.com) and import your GitHub repo
3. Add environment variable:
   - **Name:** `DATABASE_URL`
   - **Value:** Your Neon PostgreSQL connection string
4. Click Deploy

### Project Structure

```
ZK-Dark-Pool/
├── api/                      # Vercel Serverless Functions
│   ├── index.js              # API handler (all routes)
│   └── package.json          # API dependencies
├── frontend/                 # React Application
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── pages/            # Route pages
│   │   ├── services/         # AleoService, MarketStorage
│   │   └── config.js         # Aleo configuration
│   └── vite.config.js
├── Leo Programs/             # Aleo Smart Contracts
│   └── src/main.leo          # dark_pool_marketv2.aleo
├── vercel.json               # Vercel configuration
└── README.md
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

## API Endpoints

All endpoints are handled by the serverless function at `/api`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/index` | POST | Index a market question |
| `/api/questions` | GET | Get all indexed questions |
| `/api/question/:marketId` | GET | Get question by market ID |
| `/api/markets/cached` | GET | Get cached markets for instant loading |
| `/api/markets/cache` | POST | Update market cache |
| `/api/health` | GET | Health check |

## Features

- **Cache-First Architecture**: Markets load instantly from PostgreSQL cache, blockchain refreshes in background
- **Wallet Balance Detection**: Shows "Insufficient Balance" when funds are low
- **Network Notice**: Prompts users to switch to Aleo Testnet Beta
- **Delayed Loading Indicator**: Shows helpful message after 3 seconds if blockchain is slow

## Currency

- **1 ALEO = 1,000,000 microcredits**
- All on-chain values are stored in microcredits
- UI displays converted ALEO values

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
- [Neon PostgreSQL](https://neon.tech/)
- [Vercel](https://vercel.com/)

## License

MIT License
