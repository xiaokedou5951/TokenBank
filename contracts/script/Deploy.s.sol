// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MyToken} from "../src/MyToken.sol";
import {TokenBank} from "../src/TokenBank.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 initialSupply = vm.envUint("INITIAL_SUPPLY");

        address deployerAddress = vm.addr(deployerPrivateKey);
        console.log("Deployer address:", deployerAddress);

        vm.startBroadcast(deployerPrivateKey);

        MyToken myToken = new MyToken(initialSupply);
        console.log("MyToken deployed to:", address(myToken));

        TokenBank tokenBank = new TokenBank(address(myToken));
        console.log("TokenBank deployed to:", address(tokenBank));

        vm.stopBroadcast();
    }
}