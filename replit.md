# ZK Dark Pool - Private Prediction Market

## Overview
A privacy-focused prediction market built on Aleo using zero-knowledge proofs. Users can bet on outcomes without revealing their positions.

## Project Structure
```
frontend/           # React + Vite frontend application
├── src/
│   ├── components/ # React components
│   ├── pages/      # Page components
│   ├── services/   # API services
│   ├── hooks/      # Custom React hooks
│   ├── styles/     # CSS styles
│   ├── App.jsx     # Main app component
│   └── main.jsx    # Entry point
├── package.json    # Node.js dependencies
└── vite.config.js  # Vite configuration
Leo Programs/       # Aleo/Leo smart contract programs
```

## Tech Stack
- **Frontend**: React 18, Vite 5, React Router 6
- **Blockchain**: Aleo (zero-knowledge blockchain)
- **Wallet Integration**: Leo Wallet Adapter

## Smart Contract Features
The Leo smart contract includes:
- `markets` mapping: Stores market info (creator, resolution height, resolved status)
- `pools` mapping: Stores pool state (total YES/NO bets)
- `market_count` mapping: Tracks total number of markets
- `market_ids` mapping: Sequential index of market IDs for enumeration
- `market_questions` mapping: Stores question hash for each market

## Important Notes
- **Question Storage**: Questions are uploaded to IPFS when creating markets. A deterministic hash of the question is stored on-chain. The IPFS service maintains a local index mapping hashes to questions and CIDs.
- **Cross-Browser Limitation**: Currently, question text can only be retrieved if the browser has previously seen the market (stored in local index). Full cross-browser discovery of question text would require either storing the IPFS CID on-chain (which exceeds field size limits) or a public indexer service.
- **Current Workaround**: Users can use "Track Existing" to manually add markets with their question text. The on-chain data (market ID, pool sizes, resolution status) is always fully discoverable.
- **Contract Redeployment**: After modifying `main.leo`, the contract must be redeployed to the Aleo testnet for changes to take effect.

## Backend Indexer
A simple Express backend runs on port 3001 and provides question indexing:
- `POST /api/index` - Store hash → question mapping
- `GET /api/question/:hash` - Retrieve question by hash
- `GET /api/health` - Health check
- Data is persisted to `backend/questions.json`
- Vite proxies `/api` requests to the backend

## Development
The frontend runs on port 5000 using Vite's development server.

## Deployment
Static deployment - builds to `dist` folder via `npm run build`.
