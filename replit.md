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

## Development
The frontend runs on port 5000 using Vite's development server.

## Deployment
Static deployment - builds to `dist` folder via `npm run build`.
