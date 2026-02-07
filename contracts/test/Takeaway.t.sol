// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {TakeawayDeposit} from "../src/TakeawayDeposit.sol";
import {TakeawayRegistry} from "../src/TakeawayRegistry.sol";
import {TakeawayFactory} from "../src/TakeawayFactory.sol";

contract TakeawayTest is Test {
    TakeawayRegistry public registry;
    TakeawayFactory public factory;
    address public relayer;

    function setUp() public {
        relayer = makeAddr("relayer");
        registry = new TakeawayRegistry();
        factory = new TakeawayFactory(address(registry), relayer);
        registry.setFactory(address(factory));
    }

    function test_CreateDepositContract() public {
        bytes32 namehash = keccak256("arbitrum.alice.eth");
        address depositAddr = factory.createDepositContract(namehash);
        assertTrue(depositAddr != address(0));
        assertEq(registry.getSubdomain(depositAddr), namehash);

        TakeawayDeposit deposit = TakeawayDeposit(payable(depositAddr));
        assertEq(deposit.relayer(), relayer);
    }

    function test_DepositEmitsEvent() public {
        bytes32 namehash = keccak256("arbitrum.alice.eth");
        address depositAddr = factory.createDepositContract(namehash);

        vm.deal(address(0xBEEF), 1 ether);
        vm.expectEmit(true, false, false, true, depositAddr);
        emit TakeawayDeposit.Deposit(address(0xBEEF), 1 ether);
        vm.prank(address(0xBEEF));
        (bool ok,) = depositAddr.call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(depositAddr.balance, 1 ether);
    }

    function test_OnlyRelayerCanWithdraw() public {
        bytes32 namehash = keccak256("arbitrum.alice.eth");
        address depositAddr = factory.createDepositContract(namehash);
        TakeawayDeposit deposit = TakeawayDeposit(payable(depositAddr));
        vm.deal(depositAddr, 1 ether);

        vm.prank(makeAddr("stranger"));
        vm.expectRevert(TakeawayDeposit.OnlyRelayer.selector);
        deposit.withdrawTo(payable(makeAddr("stranger")));
    }

    function test_RelayerWithdrawsToAddress() public {
        address recipient = makeAddr("recipient");
        bytes32 namehash = keccak256("arbitrum.alice.eth");
        address depositAddr = factory.createDepositContract(namehash);
        TakeawayDeposit deposit = TakeawayDeposit(payable(depositAddr));
        vm.deal(depositAddr, 1 ether);

        vm.prank(relayer);
        deposit.withdrawTo(payable(recipient));
        assertEq(recipient.balance, 1 ether);
        assertEq(depositAddr.balance, 0);
    }

    function test_RegistryOnlyFactoryCanRegister() public {
        vm.prank(makeAddr("stranger"));
        vm.expectRevert(TakeawayRegistry.OnlyFactory.selector);
        registry.register(makeAddr("someContract"), bytes32(0));
    }
}
