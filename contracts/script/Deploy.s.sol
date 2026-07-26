// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MyTokenPermit} from "../src/MyToken.sol";
import {TokenBankPermit2} from "../src/TokenBankPermit2.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 initialSupply = vm.envUint("INITIAL_SUPPLY");
        address permit2Address = vm.envAddress("PERMIT2_ADDRESS");

        address deployerAddress = vm.addr(deployerPrivateKey);
        console.log("Deployer address:", deployerAddress);
        console.log("Using Permit2 at:", permit2Address);

        vm.startBroadcast(deployerPrivateKey);

        // 1. 部署 MyTokenPermit 合约
        MyTokenPermit myTokenPermit = new MyTokenPermit(initialSupply);
        console.log("MyTokenPermit deployed to:", address(myTokenPermit));

        // 2. 部署 TokenBankPermit2 合约（依赖 Permit2 地址）
        TokenBankPermit2 tokenBankPermit2 = new TokenBankPermit2(
            address(myTokenPermit),
            permit2Address
        );
        console.log("TokenBankPermit2 deployed to:", address(tokenBankPermit2));

        vm.stopBroadcast();
    }
}
