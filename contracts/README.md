## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

-   **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
-   **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
-   **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
-   **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy (testnet, e.g. Sepolia)

1. Copy env template and fill in values (do not commit `.env`):

```shell
$ cp .env.example .env
# Edit .env: set PRIVATE_KEY, optionally RELAYER_ADDRESS and RPC_URL
```

2. Run the deploy script (Foundry loads `.env` from the project root):

```shell
$ forge script script/Deploy.s.sol:DeployScript --rpc-url $RPC_URL --broadcast
```

Deploys `TakeawayRegistry` and `TakeawayFactory`, then sets the registry’s factory. Use the logged addresses in your frontend and relayer config.

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
