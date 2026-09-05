// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test, console} from "forge-std/Test.sol";
import {MyTokenPermit} from "../src/MyTokenPermit.sol";
import {TokenBankPermit} from "../src/TokenBankPermit.sol";

/**
 * @title IERC7579Delegator
 * @notice Minimal interface of the MetaMask EIP7702StatelessDeleGator execute() entrypoint.
 */
interface IERC7579Delegator {
    function execute(bytes32 _mode, bytes calldata _executionCalldata) external payable;
}

/**
 * @title TokenBank7702Test
 * @dev Regression tests for the EIP-7702 flow against the REAL MetaMask Delegator bytecode.
 *
 * The MetaMask official Delegator (EIP7702StatelessDeleGator) is etched at its
 * real address 0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B using the runtime
 * bytecode fetched from Sepolia (test/fixtures/MetaMaskDelegatorRuntime.hex).
 *
 * The EIP-7702 delegation designator 0xef0100 || delegate is written to the
 * user EOA via vm.etch, which is byte-for-byte identical to what the protocol
 * does when processing an authorization_list entry in a Type-0x04 transaction.
 *
 * Batch execution goes through the Delegator's ERC-7579 execute() entrypoint:
 *   execute(ModeCode, bytes)
 * with ModeCode = BatchDefault (0x0100...0000) and the calldata being
 * abi.encode(Execution[]) where Execution = {address target; uint256 value; bytes callData}.
 */
contract TokenBank7702Test is Test {
    // ── Constants ─────────────────────────────────────────────────────────────

    /// @notice MetaMask official EIP-7702 Delegator (deployed on mainnet/Sepolia)
    address internal constant METAMASK_DELEGATOR = 0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B;

    /// @notice EIP-7702 delegation designator prefix
    bytes internal constant DELEGATION_PREFIX = hex"ef0100";

    /// @notice ERC-7579 BatchDefault mode: callType 0x01 (batch) in the first byte
    bytes32 internal constant BATCH_DEFAULT_MODE = 0x0100000000000000000000000000000000000000000000000000000000000000;

    // ── Test fixtures ─────────────────────────────────────────────────────────

    MyTokenPermit internal token;
    TokenBankPermit internal bank;

    address internal user;
    uint256 internal userKey;
    address internal attacker = makeAddr("attacker");

    uint256 internal constant DEPOSIT_AMOUNT = 100 ether;
    uint256 internal constant USER_BALANCE = 10_000 ether;

    // ── Execution struct (ERC-7579) ───────────────────────────────────────────

    struct Execution {
        address target;
        uint256 value;
        bytes callData;
    }

    // ── Setup ─────────────────────────────────────────────────────────────────

    function setUp() public {
        // 1. Etch the REAL MetaMask Delegator runtime bytecode at its canonical address.
        //    Fetched from Sepolia: cast code 0x63c0...32B
        bytes memory delegatorRuntime = vm.parseBytes(
            vm.readFile("test/fixtures/MetaMaskDelegatorRuntime.hex")
        );
        vm.etch(METAMASK_DELEGATOR, delegatorRuntime);

        // 2. Deploy TokenBank stack
        token = new MyTokenPermit(1_000_000);
        bank = new TokenBankPermit(address(token));

        // 3. Fund user
        (user, userKey) = makeAddrAndKey("user");
        token.mint(user, USER_BALANCE);

        // 4. Simulate the EVM's EIP-7702 state transition for a Type-0x04 tx:
        //    authorization_list = [{ authority: user, delegate: METAMASK_DELEGATOR, ... }]
        //    → user.code = 0xef0100 || METAMASK_DELEGATOR
        vm.etch(user, abi.encodePacked(DELEGATION_PREFIX, METAMASK_DELEGATOR));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// @dev Build execute(BatchDefault, abi.encode(Execution[])) calldata
    function _buildBatchCalldata(Execution[] memory executions) internal pure returns (bytes memory) {
        return abi.encodeCall(
            IERC7579Delegator.execute,
            (BATCH_DEFAULT_MODE, abi.encode(executions))
        );
    }

    /// @dev Approve + deposit batch, executed by the EOA on itself (to == from == user),
    ///      exactly like a Type-0x04 self-call after delegation.
    function _executeBatchAsUser(Execution[] memory executions) internal {
        bytes memory data = _buildBatchCalldata(executions);
        vm.prank(user);
        (bool ok,) = user.call(data);
        assertTrue(ok, "delegator batch execution reverted");
    }

    function _approveAndDepositExecutions(uint256 amount) internal view returns (Execution[] memory) {
        Execution[] memory executions = new Execution[](2);
        executions[0] = Execution({
            target: address(token),
            value: 0,
            callData: abi.encodeCall(token.approve, (address(bank), amount))
        });
        executions[1] = Execution({
            target: address(bank),
            value: 0,
            callData: abi.encodeCall(bank.deposit, (amount))
        });
        return executions;
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    /// @notice One Type-0x04 transaction: delegation + approve + deposit, atomically.
    function test_7702DelegationAndBatchDepositInOneTx() public {
        // Before: user holds tokens, no bank balance, no allowance
        assertEq(token.balanceOf(user), USER_BALANCE);
        assertEq(bank.balanceOf(user), 0);
        assertEq(token.allowance(user, address(bank)), 0);

        // The single batch call (as the EOA self-call through the Delegator)
        _executeBatchAsUser(_approveAndDepositExecutions(DEPOSIT_AMOUNT));

        // Deposit succeeded
        assertEq(bank.balanceOf(user), DEPOSIT_AMOUNT);
        assertEq(token.balanceOf(address(bank)), DEPOSIT_AMOUNT);
        // Token balance reduced
        assertEq(token.balanceOf(user), USER_BALANCE - DEPOSIT_AMOUNT);
        // Allowance fully consumed (exact-amount approve strategy)
        assertEq(token.allowance(user, address(bank)), 0);

        // Delegation designator is still in place: 0xef0100 || 0x63c0...32B
        assertEq(
            keccak256(user.code),
            keccak256(abi.encodePacked(DELEGATION_PREFIX, METAMASK_DELEGATOR)),
            "user.code must equal 0xef0100 || delegator"
        );

        // The official Delegator bytecode is present at the canonical address
        assertTrue(METAMASK_DELEGATOR.code.length > 0, "delegator bytecode must be etched");
    }

    /// @notice If the batch reverts (e.g. deposit fails), the approve must roll back too
    function test_7702BatchIsAtomic() public {
        // approve(amount) but deposit(0) → TokenBank reverts with ZeroAmount → whole batch reverts
        Execution[] memory executions = new Execution[](2);
        executions[0] = Execution({
            target: address(token),
            value: 0,
            callData: abi.encodeCall(token.approve, (address(bank), DEPOSIT_AMOUNT))
        });
        executions[1] = Execution({
            target: address(bank),
            value: 0,
            callData: abi.encodeCall(bank.deposit, (0)) // deposit(0) → ZeroAmount()
        });

        vm.prank(user);
        (bool ok,) = user.call(_buildBatchCalldata(executions));
        assertFalse(ok, "batch with failing deposit must revert");

        // Nothing changed (atomicity)
        assertEq(token.allowance(user, address(bank)), 0, "approve must roll back");
        assertEq(bank.balanceOf(user), 0);
    }

    /// @notice onlySelf: a third party cannot trigger the delegated EOA's execute()
    function test_7702OnlySelfRejected() public {
        bytes memory data = _buildBatchCalldata(_approveAndDepositExecutions(DEPOSIT_AMOUNT));

        // Attacker calls the user's address directly with the same calldata
        vm.prank(attacker);
        (bool ok,) = user.call(data);
        assertFalse(ok, "third-party execution of delegated EOA must be rejected");

        // State untouched
        assertEq(bank.balanceOf(user), 0);
        assertEq(token.allowance(user, address(bank)), 0);
    }

    /// @notice After delegation, the classic two-step (approve + deposit) still works,
    ///         because msg.sender remains the EOA address for the bank.
    function test_NormalDepositStillWorksAfterDelegation() public {
        vm.startPrank(user);
        token.approve(address(bank), DEPOSIT_AMOUNT);
        bank.deposit(DEPOSIT_AMOUNT);
        vm.stopPrank();

        assertEq(bank.balanceOf(user), DEPOSIT_AMOUNT);
    }

    /// @notice After delegation, EIP-2612 permitDeposit flow is unaffected.
    function test_PermitDepositStillWorksAfterDelegation() public {
        uint256 amount = 50 ether;
        uint256 deadline = block.timestamp + 1 hours;

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            userKey,
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    token.DOMAIN_SEPARATOR(),
                    keccak256(
                        abi.encode(
                            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                            user,
                            address(bank),
                            amount,
                            token.nonces(user),
                            deadline
                        )
                    )
                )
            )
        );

        vm.prank(user);
        bank.permitDeposit(amount, deadline, v, r, s);

        assertEq(bank.balanceOf(user), amount);
        assertEq(token.allowance(user, address(bank)), 0);
    }
}
