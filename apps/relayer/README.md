# Takeaway Relayer

Listens for `Deposit` events on Takeaway deposit contracts, looks up the destination (chain + address) from the Registry and ENS text records, withdraws funds to the relayer, then bridges via LI.FI to the recipient.

## Setup

1. Copy env and fill in values (same addresses as in `contracts/.env` after deploy):

```bash
cp .env.example .env
# Edit .env: RPC_URL, REGISTRY_ADDRESS, FACTORY_ADDRESS, RELAYER_PRIVATE_KEY
```

2. Install dependencies:

```bash
bun install
```

3. Ensure the relayer wallet has some ETH on the source chain (Sepolia) to pay for `withdrawTo` and the LI.FI bridge transaction.

## Run

```bash
bun run start
```

Or with watch: `bun run dev`.

The relayer will:

- Index existing deposit contracts from `DepositContractCreated` events
- Watch all of them for `Deposit` events
- Watch the Factory for new deposit contracts
- For each deposit: Registry → subdomain namehash → ENS text records (destination chain + address) → `withdrawTo(relayer)` → LI.FI bridge to destination

## Optional env

- `ENS_RPC_URL` – if ENS is on another chain (e.g. mainnet), set this to that chain’s RPC so resolver/text reads use it
- `FROM_BLOCK` – block number to start indexing Factory events from (default 0)
- `CHAIN_ID` – source chain id (default 11155111 = Sepolia)
