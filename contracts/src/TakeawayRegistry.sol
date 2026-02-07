// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title TakeawayRegistry
/// @notice Maps each deposit contract address to its subdomain namehash (for relayer lookup).
contract TakeawayRegistry {
    address public owner;
    address public factory;

    mapping(address => bytes32) public contractToSubdomain;

    event Registered(address indexed contractAddress, bytes32 subdomainNamehash);
    event OwnerSet(address indexed previousOwner, address indexed newOwner);
    event FactorySet(address indexed previousFactory, address indexed newFactory);

    error OnlyOwner();
    error OnlyFactory();

    constructor() {
        owner = msg.sender;
        emit OwnerSet(address(0), msg.sender);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyFactory() {
        if (msg.sender != factory) revert OnlyFactory();
        _;
    }

    /// @notice Register a deposit contract for a subdomain. Only callable by the factory.
    /// @param contractAddress The TakeawayDeposit contract address.
    /// @param subdomainNamehash The ENS namehash of the subdomain (e.g. namehash("arbitrum.alice.eth")).
    function register(address contractAddress, bytes32 subdomainNamehash) external onlyFactory {
        require(contractAddress != address(0), "zero address");
        contractToSubdomain[contractAddress] = subdomainNamehash;
        emit Registered(contractAddress, subdomainNamehash);
    }

    /// @notice Get the subdomain namehash for a deposit contract.
    function getSubdomain(address contractAddress) external view returns (bytes32) {
        return contractToSubdomain[contractAddress];
    }

    /// @notice Set the factory that can call register. Called once after deploying Factory.
    function setFactory(address _factory) external onlyOwner {
        require(_factory != address(0), "zero factory");
        emit FactorySet(factory, _factory);
        factory = _factory;
    }

    /// @notice Transfer ownership (e.g. to a multisig or renounce).
    function setOwner(address _owner) external onlyOwner {
        emit OwnerSet(owner, _owner);
        owner = _owner;
    }
}
