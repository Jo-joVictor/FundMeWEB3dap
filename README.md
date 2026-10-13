# FundMe Frontend

A React frontend for the **FundMe** smart contract: a shared funding pool where anyone can contribute ETH (minimum $50, enforced on-chain via a Chainlink ETH/USD price feed) and only the contract owner can withdraw.

Deployed on **Sepolia**:

| | |
|---|---|
| Contract | [`0x383F4CFca357e2F9E1C9BaF69f0eaF24a1b8CA22`](https://sepolia.etherscan.io/address/0x383F4CFca357e2F9E1C9BaF69f0eaF24a1b8CA22) |
| Deploy block | [`9293068`](https://sepolia.etherscan.io/block/9293068) |
| Network | Sepolia testnet |

## Features

- **Dashboard:** contribute ETH with USD presets ($50 / $100 / $250 / $500), live Chainlink quote, minimum validation, and every transaction state (confirm in wallet, pending, confirmed, declined, reverted).
- **Activity:** full ledger of `Funded` and `Withdrawn` events with All / My Activity tabs, search, event and date filters, and pagination.
- **Transparency:** pool stats, contract details, live Chainlink oracle info, cumulative contribution chart, and the current contributors table.
- **Owner tab:** appears only when the connected wallet matches `getOwner()`. Includes the withdrawal flow with a confirmation modal and status tracking.
- **Wallets:** MetaMask, Coinbase Wallet, and optionally WalletConnect, plus a wrong-network prompt.
- **Toast notifications** for pending, confirmed, failed and declined transactions.
- **Dark and light themes**, remembered across visits.

## Tech stack

- [Vite](https://vite.dev) + React + TypeScript
- [wagmi v2](https://wagmi.sh) + [viem](https://viem.sh)
- [TanStack Query](https://tanstack.com/query)
- [React Router](https://reactrouter.com)
- [Tailwind CSS v4](https://tailwindcss.com)
- [lucide-react](https://lucide.dev) icons

## Getting started

### Prerequisites

- Node.js (a current LTS: 20.19+ or 22.12+)
- [pnpm](https://pnpm.io)
- A browser wallet (e.g. MetaMask) with some Sepolia ETH

### Install and run

```bash
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm dev
```

The app runs at http://localhost:5173.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SEPOLIA_RPC_URL` | Yes | Sepolia JSON-RPC endpoint. A dedicated Alchemy or Infura key is recommended over the public default. |
| `VITE_WALLETCONNECT_PROJECT_ID` | No | Project ID from [Reown Cloud](https://cloud.reown.com). If empty, the WalletConnect option is hidden. |

Example `.env.example`:

```bash
VITE_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_WALLETCONNECT_PROJECT_ID=
```

> Vite inlines `VITE_*` variables into the client bundle, so they are public. If you use a private RPC key, restrict it to your domain in the provider's dashboard. Keep real values in `.env.local` (git-ignored) and commit only `.env.example`.

### Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Type-check and build for production |
| `pnpm preview` | Preview the production build locally |

## Deploying to Vercel

1. Push the repo to GitHub and import it in Vercel. The Vite preset is detected automatically.
2. Add the environment variables above under **Project Settings → Environment Variables**.
3. Deploy. Redeploy after changing any env var, since Vite reads them at build time.

`vercel.json` rewrites all routes to `index.html` so deep links like `/activity` and `/owner` survive a page refresh:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## Project structure

```
src/
├── components/   # Header, Footer, Layout, modals, wallet UI, tables, chart
├── context/      # WalletModal and Toast providers
├── contract/     # ABI and constants (address, deploy block, Etherscan helpers)
├── hooks/        # Contract reads/writes, activity logs, oracle, owner detection
├── lib/          # wagmi config and formatting helpers
└── pages/        # Dashboard, Activity, Transparency, Owner
```

## How it works

- **Owner detection:** `useIsOwner` compares the connected wallet with `getOwner()` (case-insensitive). The Owner nav link is hidden for everyone else, and `/owner` shows a locked state to non-owners. The contract's `onlyOwner` modifier remains the real access control.
- **Activity history:** the contract stores no history, so `useActivity` reads `Funded` and `Withdrawn` event logs from the deploy block in chunks, then looks up block timestamps. Results are cached with TanStack Query and refreshed after your own transactions confirm.
- **Withdrawals:** the Owner page calls `cheaperWithdraw()`, which does the same as `withdraw()` for less gas.
- **USD math:** the contract's price is an 18-decimal USD value per ETH. All conversions use `bigint` and round up where a minimum is involved, so a chip like "$50" never lands 1 wei short.

## Known limitations

- **RPC limits:** public RPCs rate-limit `getLogs`. If the Activity page shows a range or limit error, lower `CHUNK` in `src/hooks/useActivity.ts` from `50_000n` to `10_000n`, or use a dedicated RPC key.
- **Withdraw gas:** both withdraw functions loop over every funder, so gas grows with the number of contributors.
- **Contribution counts:** the contract doesn't store per-wallet contribution counts. The "Contributions" column on Transparency is derived from events since the latest withdrawal.
- **Testnet only:** this app is configured for Sepolia and is not audited.

## Moving to mainnet

1. Replace `sepolia` with `mainnet` in `src/lib/wagmi.ts`, `WalletButton.tsx`, `WalletMenu.tsx` and `ContributionCard.tsx`.
2. Update `FUNDME_ADDRESS`, `DEPLOY_BLOCK` and `ETHERSCAN` in `src/contract/constants.ts`.
3. Point