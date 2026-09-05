// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {MyTokenPermit} from "../src/MyTokenPermit.sol";
import {TokenBankPermit} from "../src/TokenBankPermit.sol";

contract Deploy is Script {
    /// @notice MetaMask official EIP-7702 Delegator (deployed on mainnet/Sepolia)
    address internal constant METAMASK_DELEGATOR = 0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 initialSupply = vm.envUint("INITIAL_SUPPLY");

        // Optional: mint test tokens to a beneficiary (e.g. your MetaMask account)
        // Useful on Sepolia forks / real Sepolia for manual E2E testing.
        address beneficiary = vm.envOr("BENEFICIARY_ADDRESS", address(0));
        uint256 beneficiaryAmount = vm.envOr("BENEFICIARY_AMOUNT", uint256(10_000));

        address deployerAddress = vm.addr(deployerPrivateKey);
        console.log("Deployer address:", deployerAddress);

        vm.startBroadcast(deployerPrivateKey);

        MyTokenPermit myTokenPermit = new MyTokenPermit(initialSupply);
        console.log("MyTokenPermit deployed to:", address(myTokenPermit));

        TokenBankPermit tokenBankPermit = new TokenBankPermit(address(myTokenPermit));
        console.log("TokenBankPermit deployed to:", address(tokenBankPermit));

        if (beneficiary != address(0)) {
            myTokenPermit.mint(beneficiary, beneficiaryAmount * 10 ** 18);
            console.log("Minted test tokens to beneficiary:", beneficiary);
            console.log("Minted amount (whole tokens):", beneficiaryAmount);
        }

        vm.stopBroadcast();

        // EIP-7702 readiness check: the MetaMask Delegator must exist on this chain
        // for the one-tx (delegation + approve + deposit) flow to work.
        if (METAMASK_DELEGATOR.code.length > 0) {
            console.log("EIP-7702 delegator detected: ready for 7702 flow");
        } else {
            console.log(
                "WARNING: EIP-7702 delegator NOT present on this chain;"
                " 7702 one-tx flow unavailable (use a Sepolia fork or real Sepolia)"
            );
        }
    }
}
