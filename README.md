# VeilCast

**Private prediction rooms for Premier League and La Liga matches** - commit predictions privately on Midnight, resolve against Sportmonks results, and claim with a zero-knowledge proof.



## Problem

Sports betting and prediction markets face a trust problem: how do participants know the outcome is correct, that their stake is safe, and that the settlement is fair? Traditional platforms are opaque black boxes.

**VeilCast solves this** by combining:
1. **Sportmonks** - final football results used for deterministic resolution
2. **Midnight** - private position commitments and creator-authorized resolution
3. **Zero-knowledge proofs** - winners reveal only the position needed to claim

## How It Works

```
Creator deploys a room → Users submit private commitments → Creator locks at kickoff
→ Match ends → Creator resolves on Midnight → Winner proves their position to claim
```

**One fixture = one room.** Each market is a Midnight contract with a unique market ID. Duplicate creation is rejected while an active room exists.

### Room Lifecycle

| Status | What's Happening |
|--------|-----------------|
| `OPEN` | Room created, anyone can join before kickoff |
| `LOCKED` | Locked at kickoff — no more entries |
| `AWAITING_PROOF` | Match ended, fetching settlement data |
| `CLAIMABLE` | Settled — winner can claim 2× payout |
| `CANCELLED` | Room cancelled, all entries refundable |

## Features

- **Browse World Cup fixtures** with live status (upcoming / live / finished)
- **Create private prediction rooms** - deploy Over/Under markets through a 4-step wizard
- **Join rooms** - submit a hidden position commitment with a Lace wallet
- **Live score banners** - real-time score stream during matches
- **Creator-authorized settlement** - the creator resolves after the final result is available
- **Verifiable settlement receipts** - final score, winner side, result anchor, and claim records
- **Activity log** — every event (join, lock, settle, claim, cancel) is recorded
- **Lace wallet connection** - Midnight Preprod wallet identity and proof signing
- **No external backend** — everything runs in Next.js API routes with file-based persistence

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS v4 |
| Smart Contracts | Midnight Compact (Preprod) |
| Oracle | Sportmonks Sports Data |
| Wallet | Lace Midnight connector 4.x |
| Persistence | File-based via `.rooms.json` |
| Settlement | Midnight resolver commitment and private claim proof |

### On-Chain Architecture

The Compact contract is defined in `contracts/veilcast-market.compact` and deployed to Midnight Preprod from the browser through Lace.

```
Circuits:
  deploy           → Creates a market contract
  submitPosition   → Adds a private position commitment
  lockMarket       → Creator locks the market
  resolveMarket    → Creator anchors the final outcome
  claim            → Winner reveals a valid position and one-time nullifier
```

## Quick Start

```bash
# Install
npm install

# Set up env
cp .env.example .env
# Fill in SPORTMONKS_API_TOKEN (see .env.example)

# Run
npm run dev
# → http://localhost:3000
```

## Getting Midnight Preprod Funds

Use the official Midnight Preprod faucet to fund each Lace test wallet before deploying or joining.

## Subscribe to TxLINE

```bash
npx tsx scripts/subscribe-txline.ts
```

This legacy script activates the historical TxLINE integration and is not required for the Midnight room flow.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── rooms/     → create, join, lock, settle, claim, cancel, receipt
│   │   └── txline/    → fixtures, scores, SSE stream, validation, init
│   ├── fixtures/      → fixture hub + match detail page
│   ├── rooms/         → create wizard, room detail, receipt, dashboard
│   └── docs/          → technical documentation with network info
├── components/
│   ├── fixtures/      → FixtureCard, LiveScoreBanner
│   ├── rooms/         → ThresholdMeter, StepIndicator
│   ├── layout/        → Navbar
│   └── ui/            → GlassCard, StatusPill, TxLineBadge, Skeleton
├── lib/
│   ├── rooms/         → types, store (file-backed), status helpers
│   ├── solana/        → server SDK, IDL, constants
│   └── txline/        → client, types, SSE hook, status, server init
solana/
└── programs/          → Anchor program (prediction-market)
```

## Docs

- [Settlement Architecture](docs/settlement-architecture.md)
- [TxLINE Integration](docs/txline-integration.md)
- [Demo Script](docs/demo-script.md)

## License

MIT
