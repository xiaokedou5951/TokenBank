// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MyTokenPermit} from "../src/MyToken.sol";
import {TokenBankPermit2} from "../src/TokenBankPermit2.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 initialSupply = vm.envUint("INITIAL_SUPPLY");

        address deployerAddress = vm.addr(deployerPrivateKey);
        console.log("Deployer address:", deployerAddress);

        // 根据 chainId 判断网络：本地网络部署 Permit2，其他网络使用已部署地址
        address permit2Address;
        if (block.chainid == 31337) {
            // 本地网络（Anvil/Hardhat），部署 Permit2
            bytes memory permit2Bytecode = vm.parseBytes(vm.readFile("permit2-bytecode.txt"));
            assembly {
                permit2Address := create(0, add(permit2Bytecode, 0x20), mload(permit2Bytecode))
            }
            require(permit2Address != address(0), "Permit2 deployment failed");
            console.log("Permit2 deployed to:", permit2Address);
        } else {
            // 其他网络，从环境变量读取已部署地址
            permit2Address = vm.envAddress("PERMIT2_ADDRESS");
            console.log("Using existing Permit2 at:", permit2Address);
        }

        vm.startBroadcast(deployerPrivateKey);

        // 2. 部署 MyTokenPermit 合约
        MyTokenPermit myTokenPermit = new MyTokenPermit(initialSupply);
        console.log("MyTokenPermit deployed to:", address(myTokenPermit));

        // 3. 部署 TokenBankPermit2 合约（依赖 Permit2 地址）
        TokenBankPermit2 tokenBankPermit2 = new TokenBankPermit2(
            address(myTokenPermit),
            permit2Address
        );
        console.log("TokenBankPermit2 deployed to:", address(tokenBankPermit2));

        vm.stopBroadcast();
    }
}
