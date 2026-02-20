# ZK Dark Pool

A privacy-preserving prediction market platform built on the Aleo blockchain using zero-knowledge proofs, with **real token integration**, **proportional payout math**, **on-chain liquidity pools**, and **oracle-based market resolution**.

## Overview

ZK Dark Pool is a decentralized prediction market that allows users to bet on binary outcomes (YES/NO) while keeping their individual positions completely hidden through zero-knowledge cryptography. Unlike traditional prediction markets where all bets are publicly visible on-chain, ZK Dark Pool encrypts individual positions while maintaining verifiable aggregate pool data.

**Key differentiators:**
- **credits.aleo Token Integration** — All bets and payouts use real Aleo credits, not simulated balances
- **Proportional Winnings Math** — Payouts calculated as `(your_bet / winning_pool) × total_pool` using u128 intermediate precision to prevent overflow
- **CPMM Liquidity Pools** — Constant Product Market Maker (CPMM) pricing with `seed_liquidity` and `withdraw_liquidity` transitions
- **Oracle Resolution** — Markets can designate a trusted oracle address for automated resolution, or fall back to creator resolution

## How It Works

### Privacy Model

| What's Public | What's Private |
|---------------|----------------|
| Market question (hash on-chain) | Individual bet amounts |
| Total YES pool size | Individual bet outcomes |
| Total NO pool size | Bettor identities |
| Market creator address | Bet records (encrypted) |
| Oracle address | Claiming process details |
| Resolution outcome | LP token ownership |
| Implied odds / prices | Wallet-specific portfolio |

### User Flow

1. **Create Market**: Users submit a prediction question and optionally designate an oracle address. The question text is stored in PostgreSQL, a hash is stored on-chain.
2. **Seed Liquidity**: Market creator deposits initial liquidity via `credits.aleo/transfer_public_as_signer`, receiving an LP token record.
3. **Place Bets**: Users place bets by transferring real credits (via `credits.aleo`). Bets are encrypted as Aleo "records" — only the bettor can see their position. The AMM dynamically prices YES/NO based on pool ratios.
4. **Market Resolution**: The designated oracle (or market creator) resolves when the resolution block height is reached.
5. **Claim Winnings**: Winners prove ownership via ZK proof. Payouts are proportional: `(bet_amount × total_pool) / winning_pool`, transferred via `credits.aleo`.
6. **Withdraw Liquidity**: LP providers can withdraw remaining liquidity after market resolution.

### Payout Formula

$$\text{payout} = \frac{\text{bet\_amount} \times \text{total\_pool}}{\text{winning\_pool}}$$

Calculated on-chain using `u128` intermediate precision to prevent overflow:

```
let numerator: u128 = (bet.amount as u128) * (pool.total_pool as u128);
let payout_u128: u128 = numerator / (winning_pool as u128);
let payout: u64 = payout_u128 as u64;
```

### Implied Odds (AMM Pricing)

Using Constant Product Market Maker principles:

$$P_{YES} = \frac{L_{NO}}{L_{YES} + L_{NO}} \qquad P_{NO} = \frac{L_{YES}}{L_{YES} + L_{NO}}$$

Where $L_{YES}$ and $L_{NO}$ are the liquidity amounts in each pool.

## Technology Stack

- **Frontend**: React 18 + Vite
- **Backend**: Vercel Serverless Functions
- **Database**: PostgreSQL (Neon)
- **Blockchain**: Aleo Testnet Beta
- **Smart Contract**: Leo Language (`dark_pool_marketv3.aleo`)
- **Token Standard**: `credits.aleo` (native Aleo credits)
- **Wallet**: Leo Wallet browser extension

## Deployment

This project is configured for **Vercel** deployment.

### Prerequisites

1. **Neon PostgreSQL Database** — Free tier at [neon.tech](https://neon.tech)
2. **GitHub Repository** — Push this project to GitHub
3. **Vercel Account** — Free at [vercel.com](https://vercel.com)

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

CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    market_id VARCHAR(255) NOT NULL,
    yes_price NUMERIC(10,6) NOT NULL,
    no_price NUMERIC(10,6) NOT NULL,
    liquidity_yes BIGINT DEFAULT 0,
    liquidity_no BIGINT DEFAULT 0,
    total_pool BIGINT DEFAULT 0,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_history_market
ON price_history (market_id, recorded_at DESC);
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
│   └── package.json
├── frontend/                 # React Application
│   ├── src/
│   │   ├── components/       # BetForm, Header, MarketCard, WalletButton
│   │   ├── pages/            # Landing, Markets, MarketDetail, CreateMarket, Portfolio
│   │   ├── services/         # AleoService (payout math, AMM), MarketStorage, IPFSService
│   │   ├── hooks/            # useAleo (wallet integration)
│   │   └── config.js         # Aleo program config & fee schedule
│   └── vite.config.js
├── Leo Programs/             # Aleo Smart Contracts
│   ├── program.json          # Dependencies (credits.aleo)
│   └── src/main.leo          # dark_pool_marketv3.aleo
├── backend/                  # Alternative Express server
│   ├── server.js
│   └── api/index.js
├── vercel.json               # Vercel configuration
└── README.md
```

## Smart Contract

The Leo smart contract (`dark_pool_marketv3.aleo`) imports `credits.aleo` for real token transfers.

### Records (Private State)
- **`Bet`** — Encrypted bet owned by user (market_id, outcome, amount)
- **`WinClaim`** — Proof of successful winnings claim (includes payout amount)
- **`LPToken`** — Liquidity provider token (market_id, amount_yes, amount_no, provider)

### Structs (Public State)
- **`MarketInfo`** — Market metadata: creator, resolution_height, question_hash, resolved, winning_outcome, **oracle**
- **`PoolState`** — Aggregate pool totals: total_yes, total_no, total_pool, **liquidity_yes, liquidity_no, total_claimed**

### Transitions

| Transition | Description | Token Flow |
|------------|-------------|------------|
| `create_market(market_id, resolution_height, question_hash, oracle)` | Create market with optional oracle address | None |
| `seed_liquidity(market_id, amount_yes, amount_no)` | Deposit initial liquidity | `credits.aleo/transfer_public_as_signer` → program |
| `place_bet(market_id, outcome, amount)` | Place encrypted bet with real credits | `credits.aleo/transfer_public_as_signer` → program |
| `resolve_market(market_id, winning_outcome)` | Resolve market (creator OR oracle) | None |
| `claim_winnings(bet, claimed_payout)` | Claim proportional winnings | `credits.aleo/transfer_public` → winner |
| `withdraw_liquidity(lp_token)` | Withdraw LP position after resolution | `credits.aleo/transfer_public` → LP |

### Oracle Resolution

Markets can specify an oracle address at creation time. Either the oracle or the creator can resolve the market:

```leo
assert(caller == market.creator || caller == market.oracle);
```

If no oracle is needed, the creator simply passes their own address as the oracle parameter.

## API Endpoints

All endpoints are handled by the serverless function at `/api`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/index` | POST | Index a market question |
| `/api/questions` | GET | Get all indexed questions |
| `/api/question/:marketId` | GET | Get question by market ID |
| `/api/markets/cached` | GET | Get cached markets for instant loading |
| `/api/markets/cache` | POST | Update market cache |
| `/api/prices/snapshot` | POST | Record a price/liquidity snapshot |
| `/api/prices/:marketId` | GET | Get price history for a market |
| `/api/health` | GET | Health check |

### Price History API

Record price snapshots to track YES/NO price movement over time:

```json
POST /api/prices/snapshot
{
  "marketId": "123",
  "yesPrice": 0.65,
  "noPrice": 0.35,
  "liquidityYes": 50000,
  "liquidityNo": 30000,
  "totalPool": 80000
}
```

Retrieve history:
```
GET /api/prices/123?limit=100
```

## Features

- **credits.aleo Token Integration** — All bets transfer real Aleo credits via `transfer_public_as_signer`; payouts via `transfer_public`
- **Proportional Payout Math** — On-chain u128 precision calculation; frontend preview with BigInt
- **CPMM Liquidity Pools** — Seed liquidity to enable trading; implied odds derived from pool ratios
- **Oracle Resolution** — Trusted third-party or creator-based market resolution
- **LP Tokens** — Private records proving liquidity provider stake; redeemable after resolution
- **Cache-First Architecture** — Markets load instantly from PostgreSQL cache, blockchain refreshes in background
- **Implied Odds Display** — Real-time YES/NO probability bars on market cards
- **Payout Estimator** — Pre-bet preview showing estimated payout and multiplier
- **Portfolio Claiming** — One-click claim buttons with on-chain payout verification
- **Price History** — Track YES/NO price movement over time via API snapshots
- **Wallet Balance Detection** — Shows "Insufficient Balance" when funds are low
- **Network Notice** — Prompts users to switch to Aleo Testnet Beta

## Currency

- **1 ALEO = 1,000,000 microcredits**
- All on-chain values are stored in microcredits (u64)
- UI displays human-readable amounts
- Minimum bet: 1,000 microcredits (configurable)

## Security

- All private data encrypted using Aleo's native encryption
- ZK proofs generated client-side in the wallet
- No private keys stored in browser
- All signing done in Leo Wallet
- No trusted third parties for privacy (oracle only for resolution, not for data access)
- Proportional payout math prevents over-claiming via on-chain assertion: `total_claimed ≤ total_pool`
- LP withdrawal checks ensure liquidity isn't drained before resolution

## Links

- [Aleo Documentation](https://developer.aleo.org/)
- [Leo Language](https://leo-lang.org/)
- [Leo Wallet](https://leo.app/)
- [Provable Explorer](https://testnet.explorer.provable.com/)
- [credits.aleo Reference](https://developer.aleo.org/aleo/programs/credits)
- [Neon PostgreSQL](https://neon.tech/)
- [Vercel](https://vercel.com/)

## License

MIT License
