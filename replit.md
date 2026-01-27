# ZK Dark Pool

A privacy-preserving prediction market platform built on the Aleo blockchain using zero-knowledge proofs.

## Project Overview

This is a decentralized prediction market that allows users to bet on binary outcomes (YES/NO) without revealing their position, bet size, or strategy to other participants. Individual bets are encrypted while aggregate pool data remains visible for price discovery.

## Technology Stack

- **Frontend**: React 18 + Vite (port 5000)
- **Backend**: Node.js + Express API (port 3001)
- **Database**: MongoDB (requires MONGODB_URI environment variable)
- **Blockchain**: Aleo Testnet with Leo smart contracts
- **Wallet**: Leo Wallet browser extension

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
    ├── server.js             # API endpoints
    └── package.json
```

## Environment Variables

- `MONGODB_URI`: MongoDB connection string for the question indexer (optional for basic operation)
- `VITE_INDEXER_URL`: Backend indexer URL (for production)

## Running the Application

The application runs with two workflows:
1. **Backend API**: Runs on port 3001, handles question indexing
2. **Frontend**: Runs on port 5000, serves the React application

Both workflows start automatically when the Repl is run.

## Key Features

- Privacy-First: Bet amounts and outcomes are encrypted on-chain
- Zero-Knowledge Proofs: Winners claim without revealing bet details
- Leo Wallet Integration: Browser extension for signing transactions
- Real-time market data from Aleo blockchain
