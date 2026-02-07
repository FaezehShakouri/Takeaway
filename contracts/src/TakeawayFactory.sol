// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {TakeawayDeposit} from "./TakeawayDeposit.sol";
import {TakeawayRegistry} from "./TakeawayRegistry.sol";

/// @title TakeawayFactory
/// @notice Deploys one TakeawayDeposit per subdomain and registers it in TakeawayRegistry.
contract TakeawayFactory {
    TakeawayRegistry public immutable registry;
    address public immutable relayer;

    event DepositContractCreated(address indexed depositContract, bytes32 subdomainNamehash);

    constructor(address _registry, address _relayer) {
        require(_registry != address(0), "Invalid Registry Address!");
        require(_relayer != address(0), "Invalid Relayer Address!");
        registry = TakeawayRegistry(_registry);
        relayer = _relayer;
    }

    /// @notice Deploy a new TakeawayDeposit for a subdomain and register it.
    /// @param subdomainNamehash ENS namehash of the subdomain (e.g. namehash("arbitrum.alice.eth")).
    /// @return depositContract The address of the new TakeawayDeposit.
    function createDepositContract(bytes32 subdomainNamehash) external returns (address depositContract) {
        TakeawayDeposit deposit = new TakeawayDeposit(relayer);
        depositContract = address(deposit);
        registry.register(depositContract, subdomainNamehash);
        emit DepositContractCreated(depositContract, subdomainNamehash);
        return depositContract;
    }
}
