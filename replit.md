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
- **Question Storage**: Questions are uploaded to IPFS for decentralized storage. The IPFS CID (encoded as a field) is stored on-chain. When a new browser discovers a market, it fetches the question text from IPFS using the on-chain CID.
- **IPFS Fallback**: If IPFS upload fails, questions are stored locally with a hash fallback. The system tries multiple IPFS gateways when fetching.
- **Contract Redeployment**: After modifying `main.leo`, the contract must be redeployed to the Aleo testnet for changes to take effect.

## Development
The frontend runs on port 5000 using Vite's development server.

## Deployment
Static deployment - builds to `dist` folder via `npm run build`.
