# ZK Dark Pool

A privacy-preserving prediction market platform built on the Aleo blockchain using zero-knowledge proofs.

## Project Overview

This is a decentralized prediction market that allows users to bet on binary outcomes (YES/NO) without revealing their position, bet size, or strategy to other participants. Individual bets are encrypted while aggregate pool data remains visible for price discovery.

## Technology Stack

- **Frontend**: React 18 + Vite (port 5000)
- **Backend**: Node.js + Express API (port 3001)
- **Database**: PostgreSQL (uses DATABASE_URL for question indexing)
- **Blockchain**: Aleo Testnet with Leo smart contracts
- **Wallet**: Leo Wallet browser extension
- **Program ID**: `dark_pool_marketv2.aleo`

## Project Structure

```
ZK-Dark-Pool/
├── Leo Programs/             # Aleo Smart Contracts
│   └── dark_pool_market/
├── frontend/                 # React Application (Vite)
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── pages/            # Route pages
│   │   ├── services/         # API & Blockchain services
│   │   └── config.js         # App configuration
│   └── vite.config.js
└── backend/                  # Express API
    ├── server.js             # API endpoints (PostgreSQL)
    └── package.json
```

## How It Works

1. **Creating Markets**: Users create prediction markets with a question. The question text is stored in PostgreSQL, and a hash is stored on-chain.
2. **Placing Bets**: Bets are encrypted on-chain as private "records" - only the bettor can see their position.
3. **Market Resolution**: Only the market creator can resolve when the resolution block height is reached.
4. **Claiming Winnings**: Winners prove ownership via ZK proof without revealing bet details.

## Important Notes

- Markets created before the indexing system was set up will show as "Market #ID" 
- Use "Track Existing" button on Markets page to add question text for older markets
- The frontend proxies /api calls to the backend on port 3001

## Running the Application

The application runs with two workflows:
1. **Backend API**: Runs on port 3001, handles question indexing via PostgreSQL
2. **Frontend**: Runs on port 5000, serves the React application

Both workflows start automatically when the Repl is run.

## Key Features

- Privacy-First: Bet amounts and outcomes are encrypted on-chain
- Zero-Knowledge Proofs: Winners claim without revealing bet details
- Leo Wallet Integration: Browser extension for signing transactions
- Real-time market data from Aleo blockchain
- PostgreSQL persistence for question text indexing
