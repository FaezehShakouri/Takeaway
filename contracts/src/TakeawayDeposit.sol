// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title TakeawayDeposit
/// @notice One instance per subdomain. Receives ETH, emits event; relayer withdraws and bridges via LI.FI.
contract TakeawayDeposit {
    address public immutable relayer;

    event Deposit(address indexed from, uint256 amount);

    error OnlyRelayer();
    error InsufficientBalance();
    error TransferFailed(address to, uint256 balance);

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert OnlyRelayer();
        _;
    }

    constructor(address _relayer) {
        require(_relayer != address(0), "Invalid Relayer Address!");
        relayer = _relayer;
    }

    /// @notice Accept ETH and emit event for the relayer to process.
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Relayer pulls the contract balance to then execute the bridge (e.g. via LI.FI).
    /// @param to Address to send the balance (typically the relayer or a bridge contract).
    function withdrawTo(address payable to) external onlyRelayer() {
        uint256 balance = address(this).balance;
        if (balance == 0) revert InsufficientBalance();
        (bool success,) = to.call{value: balance}("");
        if (!success) revert TransferFailed(to, balance);
    }
}
