// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {TakeawayRegistry} from "../src/TakeawayRegistry.sol";
import {TakeawayFactory} from "../src/TakeawayFactory.sol";

contract DeployScript is Script {
    function run() external {
        address relayer = vm.envOr("RELAYER_ADDRESS", vm.addr(vm.envUint("PRIVATE_KEY")));
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        TakeawayRegistry registry = new TakeawayRegistry();
        console.log("TakeawayRegistry", address(registry));

        TakeawayFactory factory = new TakeawayFactory(address(registry), relayer);
        console.log("TakeawayFactory", address(factory));

        registry.setFactory(address(factory));
        console.log("Registry factory set to", address(factory));

        vm.stopBroadcast();
    }
}
