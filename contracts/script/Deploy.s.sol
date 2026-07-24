// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MyTokenPermit} from "../src/MyTokenPermit.sol";
import {TokenBankPermit} from "../src/TokenBankPermit.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 initialSupply = vm.envUint("INITIAL_SUPPLY");

        address deployerAddress = vm.addr(deployerPrivateKey);
        console.log("Deployer address:", deployerAddress);

        vm.startBroadcast(deployerPrivateKey);

        MyTokenPermit myTokenPermit = new MyTokenPermit(initialSupply);
        console.log("MyTokenPermit deployed to:", address(myTokenPermit));

        TokenBankPermit tokenBankPermit = new TokenBankPermit(address(myTokenPermit));
        console.log("TokenBankPermit deployed to:", address(tokenBankPermit));

        vm.stopBroadcast();
    }
}