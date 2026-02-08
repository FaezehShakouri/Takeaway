# Takeaway

**Configure your ENS once. Receive crypto from any chain, on the chain you want — automatically.**

Takeaway lets you create chain-specific ENS subnames (e.g. `arbitrum.alice.eth`, `base.alice.eth`). You send funds to the subname from any chain; a relayer detects the deposit, reads your destination from ENS, withdraws to itself, and bridges to your chosen chain and address via [Li.Fi](https://li.fi). No bridge UI, no extra signing after the one-time setup.

- **Frontend**: Next.js app to connect wallet, configure ENS subnames, and show deposit addresses.
- **Contracts**: TakeawayRegistry, TakeawayFactory, TakeawayDeposit (Solidity, Foundry) on a supported chain (e.g. Base).
- **Relayer**: Watches for deposits, looks up destination from ENS, withdraws and bridges via Li.Fi.

**→ [Live demo](https://takeaway-mbg8.onrender.com/)** — Try it in your browser. One name, any chain, zero friction.

---

## Features

| Feature | Status |
|--------|--------|
| ENS subnames as receive addresses (one per destination chain) | ✅ Current |
| Relayer: deposit → ENS lookup → bridge via Li.Fi | ✅ Current |
| Native ETH receive and bridge | ✅ Current |
| **Source from all chains** | 🔜 Roadmap |
| **Trustless relayer** | 🔜 Roadmap |
| **ERC-20 token support** | 🔜 Roadmap |
| **Non-EVM chain support** (e.g. Solana as destination) | 🔜 Roadmap |

---

## Table of contents

- [Features](#features)
- [How it works](#how-it-works)
- [ENS tricks (the full picture)](#ens-tricks-the-full-picture)
- [Li.Fi integration (the full picture)](#lifi-integration-the-full-picture)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Roadmap (future work)](#roadmap-future-work)
- [Project layout](#project-layout)
- [Links](#links)

---

## How it works

1. **Setup (one-time)**  
   You own an ENS name (e.g. `alice.eth`). In the app you pick a destination chain (e.g. Arbitrum) and your receiving address. The app:
   - Deploys a **TakeawayDeposit** contract on the chain where Takeaway is deployed (via TakeawayFactory).
   - Creates an ENS **subname** `arbitrum.alice.eth` on Ethereum mainnet and sets:
     - **Address record**: the new deposit contract address (so “send to `arbitrum.alice.eth`” resolves to that receive contract).
     - **Text records**: `io.takeaway.destinationChainId` and `io.takeaway.destinationAddress` so the relayer knows where to bridge.

2. **Sending**  
   Anyone sends ETH to `arbitrum.alice.eth` from any chain. The resolver returns the deposit contract address, so the payment goes to that receive contract.

3. **Relayer**  
   The relayer watches for `Deposit` events on known deposit contracts. For each deposit it:
   - Asks the **Registry** for the subdomain namehash linked to that contract.
   - Reads **ENS text records** (by namehash) to get destination chain and address.
   - Calls `withdrawTo(relayer)` on the deposit contract, then bridges the funds to the destination via Li.Fi.

---

## ENS tricks (the full picture)

Takeaway is built around ENS subnames and text records. Here’s every ENS-related detail in one place.

### 1. Subname = chain label

- One subname per **destination chain** under your ENS name: `arbitrum.alice.eth`, `base.alice.eth`, `optimism.alice.eth`, `ethereum.alice.eth`.
- The **label** (e.g. `arbitrum`) is the chain slug; the **parent** is your ENS name (e.g. `alice.eth`).
- Subnames are created on **Ethereum mainnet** via the ENS Registry (`setSubnodeRecord`). The same registry address is used on mainnet (and Sepolia): `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e`.

### 2. Namehash and labelhash

- **Namehash** is the canonical ID for an ENS name (e.g. `namehash("arbitrum.alice.eth")`). It’s used everywhere: Registry `owner`/`resolver`, Resolver `setAddr`/`setText`, and the Takeaway Registry mapping.
- **Labelhash** is the hash of the leftmost label (e.g. `labelhash("arbitrum")`). Creating a subname uses `setSubnodeRecord(parentNode, label, owner, resolver, ttl)`.
- In code we use `namehash` and `labelhash` from `viem/ens` so names and labels stay consistent with ENS.

### 3. Two-phase setup: deploy receive contract, then ENS

- **Phase 1 (receive-contract chain)**  
  The Factory creates a deposit contract for a **given subdomain namehash** (e.g. `namehash("arbitrum.alice.eth")`) on the chain where Takeaway is deployed. The Registry stores `contractAddress → subdomainNamehash`. So the relayer can later go from “which contract received funds?” → “which subdomain?” → ENS.

- **Phase 2 (Ethereum mainnet)**  
  - Get the **resolver** for the parent name: `registry.resolver(parentNode)` (parent = `alice.eth`). We use that resolver for the subname too.
  - If the subname doesn’t exist: `registry.setSubnodeRecord(parentNode, labelhash("arbitrum"), userAddress, resolverAddr, 0)`.
  - Set the **address** of the subname to the new deposit contract: `resolver.setAddr(subnameNode, depositContractAddress)`. That’s why “send to `arbitrum.alice.eth`” resolves to the receive contract.
  - Set **text records** on the subname:
    - `io.takeaway.destinationChainId` → e.g. `42161`
    - `io.takeaway.destinationAddress` → e.g. `0x…`

So: **subname’s addr** = where to send (the deposit contract); **subname’s text records** = where the relayer should bridge.

### 4. ENS lives on L1

- ENS Registry and resolvers are on **Ethereum mainnet**. The relayer and the frontend both need an **ENS-dedicated RPC** (`ENS_RPC_URL`) pointing at mainnet for:
  - `resolver(node)`
  - `owner(node)`
  - Resolver `text(node, key)`
- The chain where Takeaway contracts are deployed is used for the Takeaway contracts and for sending ETH to the deposit contract. Always use a dedicated mainnet RPC for ENS resolver/text lookups.

### 5. Relayer: contract → namehash → ENS text

- On `Deposit(contract, from, amount)` the relayer only has the **deposit contract address**.
- It calls **Registry.getSubdomain(contract)** to get the **subdomain namehash** (the same bytes32 that was registered at creation).
- With that namehash it uses a **mainnet/ENS RPC** to:
  - Resolve: `registry.resolver(node)` → resolver address.
  - Read: `resolver.text(node, "io.takeaway.destinationChainId")` and `resolver.text(node, "io.takeaway.destinationAddress")`.
- If both are set, it treats that as the destination chain and address, then `withdrawTo(relayer)` and Li.Fi bridge. If either is missing, it skips bridging (e.g. not yet configured).

### 6. Checking existing subnames

- For “which chains are already configured?” the frontend checks **ownership** of each possible subname: for each chain slug it does `registry.owner(namehash("{slug}.{ensName}"))`. Non-zero owner means the subname exists. This uses the same mainnet ENS RPC.

### 7. Custom text record keys

- Keys are namespaced to avoid collisions: `io.takeaway.destinationChainId` and `io.takeaway.destinationAddress`. They are plain string values (chain id as decimal string, address as hex). Any app that knows the schema can read them; your cross-chain “receive preferences” live entirely in ENS.

### 8. Summary table

| What | Where | Purpose |
|------|--------|---------|
| ENS Registry (owner, resolver, setSubnodeRecord) | Ethereum mainnet | Create subnames, resolve owner/resolver |
| ENS Resolver (setAddr, setText) | Ethereum mainnet | Subname → deposit contract address; destination chain + address |
| TakeawayRegistry (contract → namehash) | Supported chain | Relayer: deposit contract → subdomain namehash |
| TakeawayFactory + TakeawayDeposit | Supported chain | One deposit contract per subname; receive ETH, emit Deposit |

---

## Li.Fi integration (the full picture)

The relayer uses [Li.Fi](https://li.fi) to execute every cross-chain transfer after it withdraws from the deposit contract. We don’t maintain routes or liquidity—Li.Fi returns a ready-to-send transaction and we submit it.

### 1. When Li.Fi is used

After the relayer sees a `Deposit` event, it looks up the destination (chain + address) from ENS, calls `withdrawTo(relayer)` on the deposit contract, then calls **`executeBridge(amount, toChainId, toAddress)`**. That function is the only place we touch Li.Fi: it gets a quote, sends the tx, and (for cross-chain) polls status until the transfer is done or failed.

### 2. One-time SDK setup

Before the first bridge we run **`configureLifi()`** once. We use the Li.Fi SDK’s `createConfig` with the **EVM** provider: we pass a `getWalletClient` and `switchChain` that return viem wallet clients for the relayer’s chain (and any destination chain). The integrator name is set to `"Takeaway"`. Li.Fi then has everything it needs to build and sign transactions on our behalf.

### 3. Per-bridge flow (getQuote → send → getStatus)

For each bridge we follow Li.Fi’s recommended flow:

1. **getQuote** — We call `getQuote({ fromChain, toChain, fromToken, toToken, fromAmount, fromAddress, toAddress })`. We use native ETH on both sides: `fromToken` and `toToken` are the zero address. `fromAddress` is the relayer; `toAddress` is the user’s destination from ENS. Li.Fi returns a single best route and a **transactionRequest** (to, data, value, gasLimit).

2. **Send transaction** — We send that `transactionRequest` with the relayer’s viem wallet (`sendTransaction`). We wait for the receipt on the source chain.

3. **getStatus (cross-chain only)** — If the destination is another chain, we **poll** `getStatus({ txHash, bridge, fromChain, toChain })` every 10 seconds (Li.Fi’s recommended interval) until status is `DONE` or `FAILED`. On `DONE`, the funds have arrived on the destination chain. On `FAILED` we throw (and log if refunded).

So: one quote, one tx, then polling until the cross-chain transfer is complete. We never implement route selection or bridge logic ourselves.

### 4. Chains and tokens

- **Chains:** We have built-in viem chain configs for mainnet, Base, Arbitrum, and Optimism. For any other `toChainId` we use a minimal chain object so Li.Fi can still resolve routes.
- **Tokens:** Today we only bridge **native ETH** (`fromToken` / `toToken` = `0x0000...0`). ERC-20 support is on the roadmap; the same flow would apply with a token address instead of the zero address.

### 5. Summary

| Step | Li.Fi API | Our role |
|------|-----------|-----------|
| Setup | `createConfig` + EVM provider | One-time; provide relayer wallet for source/dest chains |
| Quote | `getQuote(fromChain, toChain, NATIVE, NATIVE, amount, relayer, user)` | Request; receive `transactionRequest` |
| Execute | — | Send `transactionRequest` via viem, wait for receipt |
| Confirm | `getStatus(txHash, bridge, fromChain, toChain)` | Poll every 10s until DONE / FAILED |

All bridge execution in Takeaway goes through this path; the user never sees a bridge UI.

---

## Quick start

**Prerequisites:** [Bun](https://bun.sh), [Foundry](https://book.getfoundry.sh) (for contracts).

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd Takeaway
   bun install
   ```

2. **Contracts**
   ```bash
   cd contracts
   cp .env.example .env   # set PRIVATE_KEY, optional RELAYER_ADDRESS
   forge build
   forge script script/Deploy.s.sol --broadcast --rpc-url <RPC_URL_FOR_DEPLOY_CHAIN>
   # Save REGISTRY and FACTORY addresses for relayer and frontend.
   ```

3. **Relayer**
   ```bash
   cd apps/relayer
   cp .env.example .env
   # Set RPC_URL (chain where contracts are deployed), REGISTRY_ADDRESS, FACTORY_ADDRESS, RELAYER_PRIVATE_KEY, ENS_RPC_URL (mainnet), optional FROM_BLOCK
   bun run index.ts
   ```

4. **Frontend**
   ```bash
   cd apps/web/frontend
   cp .env.example .env
   # Set NEXT_PUBLIC_FACTORY_ADDRESS, NEXT_PUBLIC_REGISTRY_ADDRESS, and RPC URLs (see .env.example)
   bun run dev
   ```

For a single command that runs relayer + frontend (e.g. in Docker), use the repo’s `start.sh` after building the frontend and setting env.

---

## Configuration

### Relayer (`apps/relayer/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `RPC_URL` | Yes | RPC for the chain where Takeaway contracts are deployed. |
| `REGISTRY_ADDRESS` | Yes | TakeawayRegistry. |
| `FACTORY_ADDRESS` | Yes | TakeawayFactory. |
| `RELAYER_PRIVATE_KEY` | Yes | Must be the same address used as `relayer` in the Factory. |
| `ENS_RPC_URL` | Yes | Ethereum mainnet RPC for ENS resolver/text lookups. |
| `CHAIN_ID` | No | Chain ID where Registry/Factory are deployed (e.g. 8453 for Base). |
| `ENS_REGISTRY_ADDRESS` | No | Default mainnet ENS Registry. |
| `FROM_BLOCK` | No | Block to start indexing Factory/deposits (e.g. Factory deploy block). |

### Frontend (`apps/web/frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_FACTORY_ADDRESS` | Yes | TakeawayFactory (for creating deposit contracts). |
| `NEXT_PUBLIC_REGISTRY_ADDRESS` | No | Used if you need registry reads in the UI. |
| `NEXT_PUBLIC_MAINNET_RPC_URL` | Yes | Mainnet RPC (ENS + switch chain). |
| `NEXT_PUBLIC_BASE_RPC_URL` | Yes | RPC for the chain where deposit contracts are created (e.g. Base). |

---

## Deployment

1. Deploy contracts (see [Quick start](#quick-start)). Run the deploy script on your target chain and record Registry and Factory addresses.
2. Set `RELAYER_ADDRESS` (or the deployer) in the script and ensure the same key is in relayer’s `RELAYER_PRIVATE_KEY`.
3. Configure relayer and frontend env with those addresses and RPCs. Optionally set `FROM_BLOCK` to the Factory deployment block for faster indexing.
4. For production, run the relayer (e.g. as a long-lived process or behind a supervisor). The repo includes a `Dockerfile` and `start.sh` that run relayer + Next.js together; `render.yaml` is provided for Render.

---

## Roadmap (future work)

Planned improvements to make Takeaway truly global and trust-minimized:

### Source from all chains

Today, deposit contracts live on a single deployment chain; senders on that chain send to the ENS-resolved address. **Source from all chains** means accepting deposits on every supported chain: deploy TakeawayFactory + Registry (or equivalent) on multiple EVM chains, and use ENS **multicoin** (e.g. `addr(chainId, address)`) or per-chain subname resolution so that “send to `arbitrum.alice.eth`” resolves to the correct deposit contract on the chain the sender is using. The relayer would then watch and process deposits across all those chains and bridge to the user’s chosen destination.

### Trustless relayer

The current relayer is a trusted operator: it can call `withdrawTo(relayer)` and then bridge. **Trustless relayer** aims to remove that trust: e.g. the contract only allows withdrawing to a verified bridge module or a commit-reveal/slash scheme so that the relayer must execute the bridge correctly or lose bond. Design options include integrating with a cross-chain messaging protocol (e.g. Chainlink CCIP, LayerZero) or a bridge that pulls from the contract under predefined conditions, so users don’t rely on a single backend.

### ERC-20 token support

Today only native ETH is supported (contract `receive()` and `withdrawTo`). **ERC-20 support** would allow users to send approved tokens to the same ENS subname: the deposit contract would accept `transferFrom` (or a pull pattern), emit an event with token address and amount, and the relayer would withdraw and bridge the token via Li.Fi (or another DEX/bridge aggregator) to the destination chain. ENS text records could be extended (e.g. `io.takeaway.acceptedTokens`) to declare which tokens a subname accepts.

### Non-EVM chain support

**Non-EVM support** would let the *destination* (or eventually the source) be a non-EVM chain (e.g. Solana, Bitcoin). That implies: (1) destination address format in ENS (e.g. Solana pubkey stored in a text record), (2) relayer/bridge path to that chain (e.g. Li.Fi or a Solana bridge), and (3) UI and validation for non-EVM addresses. The same ENS subname could then mean “bridge to my Solana wallet” with no EVM destination.

---

## Project layout

```
Takeaway/
├── contracts/                 # Solidity (Foundry)
│   ├── src/
│   │   ├── TakeawayRegistry.sol
│   │   ├── TakeawayFactory.sol
│   │   └── TakeawayDeposit.sol
│   ├── script/Deploy.s.sol
│   └── test/
├── apps/
│   ├── relayer/               # Deposit listener + ENS lookup + Li.Fi bridge
│   │   ├── lib/
│   │   │   ├── ens.ts         # ENS text/resolver (mainnet)
│   │   │   ├── registry.ts    # Registry.getSubdomain
│   │   │   └── wallet.ts
│   │   ├── bridge/lifi.ts
│   │   └── listeners/deposit.ts
│   └── web/frontend/          # Next.js
│       ├── app/
│       │   ├── page.tsx       # Landing
│       │   └── setup/page.tsx # ENS setup (subnames)
│       ├── components/
│       │   ├── ConnectWallet.tsx
│       │   └── CreateSubdomain.tsx
│       └── lib/
│           ├── chains.ts
│           ├── contracts.ts   # ABIs + ENS registry/resolver addresses
│           └── wagmi-config.ts
├── start.sh                   # Run relayer + frontend
├── Dockerfile
└── render.yaml
```

---

## Links

- **[Takeaway — Live demo](https://takeaway-mbg8.onrender.com/)** – Try the app in your browser
- [ENS](https://ens.domains) – Register and manage names
- [ENS App](https://app.ens.domains) – Get an ENS name
- [Li.Fi](https://li.fi) – Cross-chain bridging used by the relayer
