// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Script, console} from "forge-std/Script.sol";
import {Permit2} from "permit2/src/Permit2.sol";

contract DeployPermit2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        address deployerAddress = vm.addr(deployerPrivateKey);
        console.log("Deployer address:", deployerAddress);

        vm.startBroadcast(deployerPrivateKey);

        Permit2 permit2 = new Permit2();
        console.log("Permit2 deployed to:", address(permit2));

        vm.stopBroadcast();
    }
}
